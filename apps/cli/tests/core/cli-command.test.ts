import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Console, Effect, Layer, Result } from 'effect'
import * as FileSystem from 'effect/FileSystem'
import { TestConsole } from 'effect/testing'
import { Command } from 'effect/unstable/cli'
import { makeTargetDir } from '@/brand/target-dir'
import { formatPreludeCommandError, makePreludeCommand, printPreludeCommandHelp } from '@/core/cli-command'
import { FsLive } from '@/core/services/fs'
import { assertPathDoesNotExist, makeTempProjectDir, parseJson, pathJoinSync, stringifyJson } from '../support/effect-files'
import { EffectHarnessDiscoveryTestLayer } from '../support/effect-harness-discovery'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

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
  return Command.runWith(command, { version: '0.0.0-test' })(argv)
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
      const testConsole = yield* TestConsole.make
      const result = yield* Effect.gen(function* () {
        const value = yield* effect
        const effectConsoleLines = yield* TestConsole.logLines
        const effectErrorLines = yield* TestConsole.errorLines

        return { value, effectConsoleLines, effectErrorLines }
      }).pipe(Effect.provideService(Console.Console, testConsole))
      const output = [...capture.lines, ...result.effectConsoleLines.map(String)].join('\n')

      return {
        value: result.value,
        output,
        stderr: result.effectErrorLines.map(String).join('\n'),
      }
    }),
    capture => Effect.sync(capture.restore),
  )
}

function parseLastJson<T = unknown>(output: string) {
  const start = output.lastIndexOf('\n{')
  return parseJson<T>(start === -1 ? output : output.slice(start + 1))
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
        yield* printPreludeCommandHelp(options)
        return 2
      })),
  )
}

describe('prelude Effect CLI command', () => {
  it.layer(TestLayer)((it) => {
    it.effect('prints help through the Effect CLI runner', () =>
      Effect.gen(function* () {
        const result = yield* withCapturedStdout(runCommand(['--help']))

        assert.match(result.output, /prelude/u)
        assert.match(result.output, /verify/u)
        assert.match(result.output, /transition/u)
        assert.match(result.output, /--spec/u)
        assert.match(result.output, /--no-input/u)
        assert.match(result.output, /--print-spec/u)
        assert.match(result.output, /--dry-run/u)
        assert.notMatch(result.output, /--preset/u)
        assert.notMatch(result.output, /--install/u)
        assert.notMatch(result.output, /--git/u)
        assert.notMatch(result.output, /--rollback/u)
        assert.notMatch(result.output, /--yes/u)
        assert.notMatch(result.output, /standalone-react-full/u)
      }))

    it.effect('prints version through the Effect CLI runner', () =>
      Effect.gen(function* () {
        const result = yield* withCapturedStdout(runCommand(['--version']))

        assert.match(result.output, /0\.0\.0-test/u)
      }))

    it.effect('creates from direct canonical --spec through the CLI command', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-cli-command-')
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
          stringifyJson(spec),
          '--name',
          'ignored-target-name',
          '--no-input',
        ], targetDir)

        yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
      }))

    it.effect('verifies maintain provider records through a CLI subcommand', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-cli-command-')
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
          stringifyJson(spec),
          '--name',
          'cli-effect-worker',
          '--no-input',
        ], targetDir)

        const result = yield* withCapturedStdout(runCommand([
          'verify',
          '--provider',
          'effect-harness',
        ], targetDir))
        const output = parseLastJson<{
          readonly command: string
          readonly status: string
          readonly providers: readonly {
            readonly providerId: string
            readonly status: string
            readonly providerIdentity?: {
              readonly id: string
              readonly contractVersion: string
              readonly providerVersion: string
            }
            readonly packageArtifactIdentity?: {
              readonly packageName?: string
              readonly packageVersion?: string
            }
            readonly selectedProfile?: string
            readonly placementSummary?: {
              readonly providerNamespacePath?: string
              readonly targetTopology?: string
              readonly tsconfigTargets?: readonly string[]
            }
            readonly managedClaims?: readonly {
              readonly slot?: string
              readonly locator?: string
              readonly kind?: string
            }[]
          }[]
        }>(result.output)

        assert.equal(output.command, 'verify')
        assert.equal(output.status, 'completed')
        const provider = output.providers[0]
        assert.equal(provider?.providerId, 'effect-harness')
        assert.equal(provider?.status, 'passed')
        assert.deepEqual(provider?.providerIdentity, {
          id: 'effect-harness',
          contractVersion: '1',
          providerVersion: '0.1.0',
        })
        assert.equal(provider?.packageArtifactIdentity?.packageName, '@sayoriqwq/effect-harness')
        assert.equal(provider?.packageArtifactIdentity?.packageVersion, '0.0.5')
        assert.equal(provider?.selectedProfile, 'codex-effect-v4')
        assert.equal(provider?.placementSummary?.providerNamespacePath, '.prelude/providers/effect-harness')
        assert.equal(provider?.placementSummary?.targetTopology, 'single-package')
        assert.deepEqual(provider?.placementSummary?.tsconfigTargets, ['tsconfig.json'])
        assert.ok(provider?.managedClaims?.some(claim =>
          claim.slot === 'effect-runtime-package'
          && claim.locator === 'package.json#/dependencies/effect'
          && claim.kind === 'structuredPointer'))
      }))

    it.effect('dry-runs effect-harness adoption through a CLI subcommand', () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const targetDir = yield* makeTempProjectDir('prelude-cli-adopt-')
        yield* fs.writeFileString(pathJoinSync(targetDir, 'package.json'), '{ "name": "existing-target" }\n')
        yield* fs.writeFileString(pathJoinSync(targetDir, 'tsconfig.json'), '{ "compilerOptions": {} }\n')

        const result = yield* withCapturedStdout(runCommand([
          'adopt',
          '--provider',
          'effect-harness',
          '--dry-run',
        ], targetDir))
        const output = parseLastJson<{
          readonly command: string
          readonly status: string
          readonly providers: readonly {
            readonly providerId: string
            readonly status: string
            readonly packageArtifactIdentity?: {
              readonly packageName?: string
            }
            readonly surfaces?: readonly { readonly surfaceId?: string, readonly status?: string }[]
          }[]
        }>(result.output)

        assert.equal(output.command, 'adopt')
        assert.equal(output.status, 'dry-run')
        assert.equal(output.providers[0]?.providerId, 'effect-harness')
        assert.equal(output.providers[0]?.status, 'ready')
        assert.equal(output.providers[0]?.packageArtifactIdentity?.packageName, '@sayoriqwq/effect-harness')
        assert.ok(output.providers[0]?.surfaces?.some(surface =>
          surface.surfaceId === 'package-manifest:root:/dependencies/effect'
          && surface.status === 'apply'))
        yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
      }))

    it.effect('approves an effect-harness surface transition through a CLI subcommand', () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const targetDir = yield* makeTempProjectDir('prelude-cli-transition-')
        const spec = {
          topology: 'single-package',
          package: {
            id: 'worker',
            name: 'cli-transition-worker',
            capabilities: ['effect-package'],
          },
          rootCapabilities: ['package-manager:pnpm', 'linting', 'knip', 'ai-harness'],
          providers: ['effect-harness'],
          overrides: {},
        }
        const surfaceId = 'package-manifest:root:/dependencies/effect'

        yield* runCommand([
          '--spec',
          stringifyJson(spec),
          '--name',
          'cli-transition-worker',
          '--no-input',
        ], targetDir)

        const recordPath = pathJoinSync(targetDir, '.prelude/providers/effect-harness/provider.json')
        const record = parseJson<{
          readonly surfaces: readonly { readonly id: string }[]
          readonly [key: string]: unknown
        }>(yield* fs.readFileString(recordPath))
        yield* fs.writeFileString(recordPath, `${stringifyJson({
          ...record,
          surfaces: record.surfaces.filter(surface => surface.id !== surfaceId),
        })}\n`)

        const result = yield* withCapturedStdout(runCommand([
          'transition',
          '--provider',
          'effect-harness',
          '--plan',
          stringifyJson([{ kind: 'add', surfaceId }]),
        ], targetDir))
        const output = parseLastJson<{
          readonly command: string
          readonly status: string
          readonly providers: readonly {
            readonly providerId: string
            readonly status: string
            readonly transitions?: readonly { readonly kind?: string, readonly surfaceId?: string, readonly status?: string }[]
          }[]
        }>(result.output)

        assert.equal(output.command, 'transition')
        assert.equal(output.status, 'completed')
        assert.equal(output.providers[0]?.providerId, 'effect-harness')
        assert.equal(output.providers[0]?.status, 'transitioned')
        assert.deepEqual(output.providers[0]?.transitions, [
          { kind: 'add', surfaceId, status: 'approved' },
        ])

        const refreshedRecord = parseJson<{
          readonly surfaces: readonly { readonly id: string }[]
        }>(yield* fs.readFileString(recordPath))
        assert.ok(refreshedRecord.surfaces.some(surface => surface.id === surfaceId))
      }))

    it.effect('prints the canonical --spec without creating files', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-cli-command-')
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
          stringifyJson(spec),
          '--print-spec',
          '--no-input',
        ], targetDir))

        assert.deepStrictEqual(parseLastJson(result.output), spec)
        yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
      }))

    it.effect('prints dry-run WritePlan and blockers without creating files', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-cli-command-')
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
          stringifyJson(spec),
          '--dry-run',
          '--no-input',
        ], targetDir))
        const output = parseLastJson<{
          operations: Array<{ path: string, kind: string }>
          blockers: unknown[]
        }>(result.output)

        assert.deepStrictEqual(output.blockers, [])
        assert.deepStrictEqual(output.operations.map(operation => operation.path), ['package.json', 'src/index.ts'])
        assert.deepStrictEqual(output.operations.map(operation => operation.kind), ['writeStructuredFile', 'writeGeneratedUserFile'])
        yield* assertPathDoesNotExist(pathJoinSync(targetDir, 'package.json'))
        yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
      }))

    it.effect('fails no-input automation clearly when --spec is missing', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-cli-command-')
        const result = yield* Effect.result(runCommand(['--no-input'], targetDir))

        assert.equal(Result.isFailure(result), true)
        if (Result.isFailure(result)) {
          assert.equal(result.failure._tag, 'SchemaContractError')
          assert.match(result.failure.message, /non-interactive mode requires --spec/u)
        }
      }))

    it.effect('does not parse removed CLI flags as active API', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-cli-command-')
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
          stringifyJson(spec),
          '--name',
          'removed-flag-app',
          '-y',
        ], targetDir))

        assert.equal(Result.isFailure(result), true)
        if (Result.isFailure(result)) {
          assert.notEqual(result.failure._tag, 'SchemaContractError')
        }
      }))

    it.effect('formats unknown removed flags at the main boundary without advertising them', () =>
      Effect.gen(function* () {
        const result = yield* withCapturedStdout(runCommandAtMainBoundary(['--no-install']))

        assert.equal(result.value, 2)
        assert.notMatch(result.stderr, /SchemaContractError/u)
        assert.notMatch(result.stderr, /\sat /u)
        assert.match(result.output, /--spec/u)
        assert.match(result.output, /--no-input/u)
        assert.notMatch(result.output, /--install/u)
      }))
  })
})
