import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Console, Effect, Layer, Result } from 'effect'
import { TestConsole } from 'effect/testing'
import { Command } from 'effect/unstable/cli'
import { makeTargetDir } from '@/brand/target-dir'
import { formatPreludeCommandError, makePreludeCommand, printPreludeCommandHelp } from '@/core/cli-command'
import { FsLive } from '@/core/services/fs'
import { EffectHarnessDiscoveryTestLayer } from '../support/effect-harness-discovery'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

function makeTempProjectDir() {
  return Effect.promise(() => fs.mkdtemp(path.join(os.tmpdir(), 'prelude-cli-command-')))
}

function readJson<T = unknown>(filePath: string) {
  return Effect.promise(() => fs.readFile(filePath, 'utf8')).pipe(
    Effect.map(content => JSON.parse(content) as T),
  )
}

function expectMissing(filePath: string) {
  return Effect.promise(() => fs.access(filePath).then(
    () => true,
    () => false,
  )).pipe(
    Effect.flatMap(exists => exists ? Effect.die(new Error(`Expected ${filePath} to be absent`)) : Effect.void),
  )
}

function runCommand(argv: readonly string[], targetDir?: string) {
  const options = targetDir === undefined
    ? {
        preludeVersion: '0.0.0-test',
        stdinIsTTY: false,
      }
    : {
        preludeVersion: '0.0.0-test',
        targetDir: makeTargetDir(targetDir),
        stdinIsTTY: false,
      }
  const command = makePreludeCommand(options)

  return Command.runWith(command, { version: '0.0.0-test' })(argv).pipe(
    Effect.provide(TestLayer),
  )
}

function withCapturedStdout<A, E, R>(effect: Effect.Effect<A, E, R>) {
  return Effect.acquireUseRelease(
    Effect.sync(() => {
      const lines: string[] = []
      const originalLog = console.log
      console.log = (...values: unknown[]) => {
        lines.push(values.map(String).join(' '))
      }

      return {
        lines,
        restore: () => {
          console.log = originalLog
        },
      }
    }),
    capture => Effect.gen(function* () {
      const value = yield* effect
      const effectConsoleLines = yield* TestConsole.logLines
      const effectErrorLines = yield* TestConsole.errorLines
      const output = [...capture.lines, ...effectConsoleLines.map(String)].join('\n')

      return { value, output, stderr: effectErrorLines.map(String).join('\n') }
    }).pipe(Effect.provide(TestConsole.layer)),
    capture => Effect.sync(capture.restore),
  )
}

function runCommandAtMainBoundary(argv: readonly string[], targetDir?: string) {
  const options = targetDir === undefined
    ? {
        preludeVersion: '0.0.0-test',
        stdinIsTTY: false,
      }
    : {
        preludeVersion: '0.0.0-test',
        targetDir: makeTargetDir(targetDir),
        stdinIsTTY: false,
      }

  return runCommand(argv, targetDir).pipe(
    Effect.as(0),
    Effect.catch((error: unknown) =>
      Effect.gen(function* () {
        yield* Console.error(formatPreludeCommandError(error))
        yield* Console.error('')
        yield* printPreludeCommandHelp(options).pipe(Effect.provide(TestLayer))
        return 2
      })),
  )
}

describe('prelude Effect CLI command', () => {
  it.effect('prints help through the Effect CLI runner', () =>
    Effect.gen(function* () {
      const result = yield* withCapturedStdout(runCommand(['--help']))

      assert.match(result.output, /prelude/u)
      assert.match(result.output, /verify/u)
      assert.match(result.output, /--spec/u)
      assert.match(result.output, /--no-input/u)
      assert.match(result.output, /--print-spec/u)
      assert.match(result.output, /--dry-run/u)
      assert.match(result.output, /--preset/u)
      assert.notMatch(result.output, /standalone-react-full/u)
    }))

  it.effect('prints version through the Effect CLI runner', () =>
    Effect.gen(function* () {
      const result = yield* withCapturedStdout(runCommand(['--version']))

      assert.match(result.output, /0\.0\.0-test/u)
    }))

  it.effect('creates from direct canonical --spec through the CLI command', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const spec = {
        topology: 'single-package',
        package: {
          id: 'app',
          name: 'direct-spec-app',
          capabilities: ['minimal-node-package'],
        },
        rootCapabilities: [],
        providers: [],
        overrides: {},
      }

      yield* runCommand([
        '--spec',
        JSON.stringify(spec),
        '--name',
        'ignored-target-name',
        '--no-input',
      ], targetDir)

      const manifest = yield* readJson<{
        createSpec: unknown
        resolvedGraph: { packageCapabilities: unknown }
      }>(path.join(targetDir, '.prelude/manifest.json'))

      assert.deepStrictEqual(manifest.createSpec, spec)
      assert.deepStrictEqual(manifest.resolvedGraph.packageCapabilities, {
        app: ['minimal-node-package'],
      })
    }))

  it.effect('verifies maintain provider records through a CLI subcommand', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const spec = {
        topology: 'single-package',
        package: {
          id: 'worker',
          name: 'cli-effect-worker',
          capabilities: ['effect-package'],
        },
        rootCapabilities: ['package-manager:pnpm', 'linting', 'knip', 'ai-harness'],
        providers: ['effect-harness'],
        overrides: {},
      }

      yield* runCommand([
        '--spec',
        JSON.stringify(spec),
        '--name',
        'cli-effect-worker',
        '--no-input',
      ], targetDir)

      const result = yield* withCapturedStdout(runCommand([
        'verify',
        '--provider',
        'effect-harness',
      ], targetDir))
      const output = JSON.parse(result.output) as {
        readonly command: string
        readonly status: string
        readonly providers: readonly { readonly providerId: string, readonly status: string }[]
      }

      assert.equal(output.command, 'verify')
      assert.equal(output.status, 'completed')
      assert.deepStrictEqual(output.providers, [
        {
          providerId: 'effect-harness',
          status: 'passed',
        },
      ])
    }))

  it.effect('prints the canonical --spec without creating files', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const spec = {
        topology: 'single-package',
        package: {
          id: 'app',
          name: 'printed-spec-app',
          capabilities: ['minimal-node-package'],
        },
        rootCapabilities: [],
        providers: [],
        overrides: {},
      }

      const result = yield* withCapturedStdout(runCommand([
        '--spec',
        JSON.stringify(spec),
        '--print-spec',
        '--no-input',
      ], targetDir))

      assert.deepStrictEqual(JSON.parse(result.output), spec)
      yield* expectMissing(path.join(targetDir, '.prelude/manifest.json'))
    }))

  it.effect('prints dry-run WritePlan and blockers without creating files', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const spec = {
        topology: 'single-package',
        package: {
          id: 'app',
          name: 'dry-run-app',
          capabilities: ['minimal-node-package'],
        },
        rootCapabilities: [],
        providers: [],
        overrides: {},
      }

      const result = yield* withCapturedStdout(runCommand([
        '--spec',
        JSON.stringify(spec),
        '--dry-run',
        '--no-input',
      ], targetDir))
      const output = JSON.parse(result.output) as {
        operations: Array<{ path: string, kind: string }>
        blockers: unknown[]
      }

      assert.deepStrictEqual(output.blockers, [])
      assert.deepStrictEqual(output.operations.map(operation => operation.path), ['package.json', 'src/index.ts'])
      assert.deepStrictEqual(output.operations.map(operation => operation.kind), ['writeStructuredFile', 'writeGeneratedUserFile'])
      yield* expectMissing(path.join(targetDir, 'package.json'))
      yield* expectMissing(path.join(targetDir, '.prelude/manifest.json'))
    }))

  it.effect('fails no-input automation clearly when --spec is missing', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const result = yield* Effect.result(runCommand(['--no-input'], targetDir))

      assert.equal(Result.isFailure(result), true)
      if (Result.isFailure(result)) {
        assert.equal(result.failure._tag, 'SchemaContractError')
        assert.match(result.failure.message, /non-interactive mode requires --spec/u)
      }
    }))

  it.effect('rejects removed CLI flags as domain errors', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const spec = {
        topology: 'single-package',
        package: {
          id: 'app',
          name: 'removed-flag-app',
          capabilities: ['minimal-node-package'],
        },
        rootCapabilities: [],
        providers: [],
        overrides: {},
      }
      const result = yield* Effect.result(runCommand([
        '--spec',
        JSON.stringify(spec),
        '--name',
        'removed-flag-app',
        '-y',
      ], targetDir))

      assert.equal(Result.isFailure(result), true)
      if (Result.isFailure(result)) {
        assert.equal(result.failure._tag, 'SchemaContractError')
        assert.match(result.failure.message, /--yes\/-y has been removed/u)
      }
    }))

  it.effect('formats removed flag failures at the main boundary without leaking a runtime stack', () =>
    Effect.gen(function* () {
      const result = yield* withCapturedStdout(runCommandAtMainBoundary(['--no-install']))

      assert.equal(result.value, 2)
      assert.match(result.stderr, /--install\/--no-install has been removed/u)
      assert.notMatch(result.stderr, /SchemaContractError/u)
      assert.notMatch(result.stderr, /\sat /u)
      assert.match(result.output, /--spec/u)
      assert.match(result.output, /--no-input/u)
    }))
})
