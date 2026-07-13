/* eslint-disable style/max-statements-per-line */
import type { PlannedConvergence } from './model.js'

import process from 'node:process'

import { Effect, FileSystem, Path, Result, Stream } from 'effect'
import { ChildProcess } from 'effect/unstable/process'
import { discoverControlRoot } from './config.js'
import { planConvergence, resolveCheckRoot } from './convergence.js'
import { errorMessage, preludeError } from './errors.js'
import { assertTargetWritePath, publishFile, replaceTree, replaceTreeFromArchive } from './filesystem.js'

function withWriteBoundary<A, E, R>(controlRoot: string, effect: Effect.Effect<A, E, R>) {
  return Effect.acquireUseRelease(
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem; const path = yield* Path.Path; const lock = path.join(path.dirname(controlRoot), `.prelude-lock-${path.basename(controlRoot)}`)
      yield* fs.makeDirectory(lock).pipe(Effect.mapError(error => preludeError('apply', 'Target write boundary is already held', errorMessage(error))))
      return lock
    }),
    () => effect,
    lock => Effect.gen(function* () { const fs = yield* FileSystem.FileSystem; yield* fs.remove(lock, { recursive: true, force: true }).pipe(Effect.catch(() => Effect.void)) }),
  )
}

function packageRootSelector(packageRoot: string): string { return `{${packageRoot}}` }

function decodeChildOutput(output: ReadonlyArray<Uint8Array>): string {
  return new TextDecoder().decode(Uint8Array.from(output.flatMap(chunk => [...chunk])))
}

function runPnpm(controlRoot: string, args: ReadonlyArray<string>, failureSummary: string) {
  return Effect.gen(function* () {
    const env: Record<string, string | undefined> = { ...process.env, CI: '1', INIT_CWD: controlRoot }
    for (const key of Object.keys(env)) {
      if (key === 'PNPM_PACKAGE_NAME' || key === 'npm_command' || key.startsWith('npm_config_') || key.startsWith('pnpm_config_') || key.startsWith('COREPACK_'))
        delete env[key]
    }
    const handle = yield* ChildProcess.make('pnpm', args, {
      cwd: controlRoot,
      detached: false,
      env,
      extendEnv: false,
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
    }).pipe(
      Effect.mapError(error => preludeError('apply', 'Cannot start frozen install', errorMessage(error))),
    )
    const result = yield* Effect.all({
      exitCode: handle.exitCode,
      stdout: Stream.runCollect(handle.stdout),
      stderr: Stream.runCollect(handle.stderr),
    }, { concurrency: 'unbounded' }).pipe(
      Effect.timeout('2 minutes'),
      Effect.mapError(error => preludeError('apply', `${failureSummary} or timed out`, errorMessage(error))),
    )
    if (result.exitCode !== 0) {
      return yield* Effect.fail(preludeError('apply', failureSummary, JSON.stringify({
        argv: ['pnpm', ...args],
        cwd: controlRoot,
        exitCode: result.exitCode,
        stdout: decodeChildOutput(result.stdout),
        stderr: decodeChildOutput(result.stderr),
      })))
    }
  })
}

function frozenInstall(controlRoot: string, packageRoots: ReadonlyArray<string>) {
  return Effect.gen(function* () {
    const path = yield* Path.Path
    const roots = [...new Set(packageRoots)].sort((left, right) => left < right ? -1 : left > right ? 1 : 0)
    const assertExactRoot = `const fs=require('node:fs');const path=require('node:path');const expected=fs.realpathSync(process.argv[1]);const actual=fs.realpathSync(process.cwd());if(actual!==expected){console.error('unexpected pnpm project '+actual+' for '+expected);process.exit(64)}`
    for (const packageRoot of roots) {
      const absoluteRoot = packageRoot === '.' ? controlRoot : path.join(controlRoot, packageRoot)
      yield* runPnpm(controlRoot, ['--filter', packageRootSelector(packageRoot), '--fail-if-no-match', 'exec', 'node', '-e', assertExactRoot, absoluteRoot], `Approved packageRoot did not resolve to exactly one pnpm project: ${packageRoot}`)
    }
    const filters = roots.flatMap(packageRoot => ['--filter', packageRootSelector(packageRoot)])
    yield* runPnpm(controlRoot, [...filters, '--fail-if-no-match', 'install', '--frozen-lockfile', '--force'], 'Frozen install of the Approved Package Selection failed')
  })
}

export function applyConvergence(start: string, approvedHash: string) {
  return Effect.scoped(Effect.gen(function* () {
    const controlRoot = yield* discoverControlRoot(start)
    return yield* withWriteBoundary(controlRoot, Effect.gen(function* () {
      const planned = yield* planConvergence(controlRoot)
      if (planned.document.executionHash !== approvedHash)
        return yield* Effect.fail(preludeError('apply', 'Approved execution hash does not match current Target state', `approved=${approvedHash} current=${planned.document.executionHash}`))
      if (planned.document.blocked)
        return yield* Effect.fail(preludeError('apply', 'Plan is blocked', planned.document.executionHash))
      let published = 0
      for (const operation of planned.operations) {
        if (!operation.changed)
          continue
        yield* assertTargetWritePath(controlRoot, operation.targetPath)
        const operationId = operation.kind === 'tree' ? `${operation.owner.integrationId}-${operation.owner.declarationId}` : operation.owners.map(owner => `${owner.integrationId}-${owner.declarationId}`).join('-')
        yield* (operation.kind === 'file'
          ? publishFile(operation.targetPath, operation.desiredContent, operationId)
          : operation.outputKind === 'ManagedTree'
            ? replaceTree(operation.sourcePath, operation.targetPath, operationId, operation.desiredHash)
            : replaceTreeFromArchive(operation.archive, operation.targetPath, operationId, operation.desiredHash)
        ).pipe(Effect.mapError(error => preludeError('apply', `Incomplete convergence after ${published} completed Output publication(s)`, errorMessage(error))))
        published++
      }
      if (planned.installRequired) {
        const packageRoots = planned.document.requirements
          .filter(requirement => requirement.selectionSatisfied && !requirement.installationSatisfied)
          .map(requirement => requirement.declaration.packageRoot)
        yield* frozenInstall(controlRoot, packageRoots).pipe(Effect.mapError(error => preludeError('apply', `Incomplete convergence after ${published} completed Output publication(s)`, errorMessage(error))))
      }
      const after = yield* planConvergence(controlRoot); const remaining = after.document.outputs.filter(output => output.status === 'change').length + after.document.requirements.filter(requirement => !requirement.satisfied).length
      return { executionHash: approvedHash, published, installed: planned.installRequired, remaining, converged: after.document.converged, plan: after.document }
    }))
  }))
}

export function checkConvergence(start: string, childStdout: 'inherit' | 'ignore' = 'inherit') {
  return Effect.scoped(Effect.gen(function* () {
    const before = yield* planConvergence(start); const controlRoot = before.controlRoot
    if (!before.document.converged)
      return yield* Effect.fail(preludeError('check', 'Target is not a Converged Integration', before.document.executionHash))
    const results: Array<{ integrationId: string, checkId: string, exitCode: number | null, error?: string }> = []
    for (const owned of before.document.checks) {
      const [command, ...args] = owned.declaration.argv; const cwd = yield* resolveCheckRoot(controlRoot, owned.declaration)
      const outcome = yield* Effect.result(Effect.gen(function* () { const handle = yield* ChildProcess.make(command!, args, { cwd, stdin: 'inherit', stdout: childStdout, stderr: 'inherit' }); return yield* handle.exitCode }))
      results.push(Result.isSuccess(outcome) ? { integrationId: owned.owner.integrationId, checkId: owned.owner.declarationId, exitCode: outcome.success } : { integrationId: owned.owner.integrationId, checkId: owned.owner.declarationId, exitCode: null, error: errorMessage(outcome.failure) })
    }
    const finalPlan = yield* Effect.result(planConvergence(controlRoot))
    if (Result.isFailure(finalPlan))
      return yield* Effect.fail(preludeError('check', 'Checks completed but final replan failed', JSON.stringify({ checks: results, replanError: errorMessage(finalPlan.failure) })))
    const after = finalPlan.success; const changed = !after.document.converged
    if (changed || results.some(result => result.exitCode !== 0))
      return yield* Effect.fail(preludeError('check', changed ? 'Checks failed or changed managed or blocking Target state' : 'One or more checks failed', JSON.stringify({ checks: results, finalPlanHash: after.document.executionHash, converged: !changed })))
    return { checks: results, plan: after.document }
  }))
}

export function changedCount(plan: PlannedConvergence): number { return plan.document.outputs.filter(output => output.status === 'change').length + plan.document.requirements.filter(requirement => !requirement.satisfied).length }
