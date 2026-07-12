/* eslint-disable style/max-statements-per-line */
import type { PreludeError } from './errors.js'
import type { PlanDocument, PlannedConvergence } from './model.js'

import { Effect, FileSystem, Path, Result } from 'effect'
import { ChildProcess } from 'effect/unstable/process'
import { planConvergence, resolveCheckRoot } from './convergence.js'
import { errorMessage, preludeError } from './errors.js'
import { assertTargetWritePath, publishFile, replaceTree } from './filesystem.js'

export interface ApplyResult { readonly executionHash: string, readonly published: number, readonly remaining: number, readonly plan: PlanDocument }
function withWriteBoundary<A>(controlRoot: string, effect: Effect.Effect<A, PreludeError, FileSystem.FileSystem | Path.Path>) {
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

export function applyConvergence(controlRoot: string, approvedHash: string): Effect.Effect<ApplyResult, PreludeError, FileSystem.FileSystem | Path.Path> {
  return withWriteBoundary(controlRoot, Effect.gen(function* () {
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
      yield* (operation.kind === 'tree' ? replaceTree(operation.sourcePath, operation.targetPath, operationId, operation.desiredHash) : publishFile(operation.targetPath, operation.desiredContent, operationId)).pipe(
        Effect.mapError(error => preludeError('apply', `Partial apply after ${published} publication(s)`, errorMessage(error))),
      )
      published++
    }
    const after = yield* planConvergence(controlRoot)
    return { executionHash: approvedHash, published, remaining: after.document.outputs.filter(output => output.status === 'change').length, plan: after.document }
  }))
}

export function checkConvergence(controlRoot: string) {
  return Effect.scoped(Effect.gen(function* () {
    const before = yield* planConvergence(controlRoot)
    if (before.document.blocked || before.document.outputs.some(output => output.status === 'change'))
      return yield* Effect.fail(preludeError('check', 'Target is not structurally converged', before.document.executionHash))
    const results: Array<{ integrationId: string, checkId: string, exitCode: number | null, error?: string }> = []
    for (const owned of before.document.checks) {
      const [command, ...args] = owned.declaration.argv; const cwd = yield* resolveCheckRoot(controlRoot, owned.declaration)
      const outcome = yield* Effect.result(Effect.gen(function* () {
        const handle = yield* ChildProcess.make(command!, args, { cwd, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' })
        return yield* handle.exitCode
      }))
      results.push(Result.isSuccess(outcome)
        ? { integrationId: owned.owner.integrationId, checkId: owned.owner.declarationId, exitCode: outcome.success }
        : { integrationId: owned.owner.integrationId, checkId: owned.owner.declarationId, exitCode: null, error: errorMessage(outcome.failure) })
    }
    const finalPlan = yield* Effect.result(planConvergence(controlRoot))
    if (Result.isFailure(finalPlan))
      return yield* Effect.fail(preludeError('check', 'Checks completed but final replan failed', JSON.stringify({ checks: results, replanError: errorMessage(finalPlan.failure) })))
    const after = finalPlan.success
    const changed = after.document.blocked || after.document.outputs.some(output => output.status === 'change')
    if (changed || results.some(result => result.exitCode !== 0))
      return yield* Effect.fail(preludeError('check', changed ? 'Checks failed or changed managed or blocking Target state' : 'One or more checks failed', JSON.stringify({ checks: results, finalPlanHash: after.document.executionHash, structurallyConverged: !changed })))
    return { checks: results, plan: after.document }
  }))
}

export function changedCount(plan: PlannedConvergence): number { return plan.document.outputs.filter(output => output.status === 'change').length }
