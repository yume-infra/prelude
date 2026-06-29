import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { makeTargetDir } from '@/brand/target-dir'
import { CliContextLive } from '@/core/cli-context'
import { runCreateRoute } from '@/core/create-route'
import { FsLive } from '@/core/services/fs'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
)

const fixtureRoot = fileURLToPath(new URL('../fixtures/fullscreen-create-workbench-v1/', import.meta.url))
const effectHarnessEquivalentSpecPath = path.join(fixtureRoot, 'effect-harness-current-equivalent.create-spec.json')
const workspaceCliEquivalentSpecPath = path.join(fixtureRoot, 'workspace-cli-current-equivalent.create-spec.json')

function makeTempProjectDir() {
  return Effect.promise(() => fs.mkdtemp(path.join(os.tmpdir(), 'prelude-workbench-v1-')))
}

function pathExists(filePath: string) {
  return Effect.promise(() => fs.access(filePath).then(
    () => true,
    () => false,
  ))
}

function readJsonFile<T>(filePath: string) {
  return Effect.promise(() => fs.readFile(filePath, 'utf8')).pipe(
    Effect.map(content => JSON.parse(content) as T),
  )
}

function runCreateRouteWithArgs(args: Record<string, unknown>, targetDir: string) {
  return runCreateRoute({
    preludeVersion: '0.0.0-test',
    targetDir: makeTargetDir(targetDir),
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        TestLayer,
        CliContextLive({
          args,
          isInteractive: false,
        }),
      ),
    ),
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
    capture => effect.pipe(
      Effect.map(value => ({
        value,
        output: capture.lines.join('\n'),
      })),
    ),
    capture => Effect.sync(capture.restore),
  )
}

describe('fullscreen create workbench v1 acceptance fixtures', () => {
  it.effect('dry-runs the current effect-harness equivalent through direct --spec without writing files', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const result = yield* withCapturedStdout(runCreateRouteWithArgs({
        spec: effectHarnessEquivalentSpecPath,
        dryRun: true,
        noInput: true,
      }, targetDir))

      assert.equal(result.value.kind, 'dry-run')

      const output = JSON.parse(result.output) as {
        operations: Array<{
          kind: string
          path: string
          authority: string
          value?: {
            scripts?: Record<string, string>
            dependencies?: Record<string, string>
            devDependencies?: Record<string, string>
          }
        }>
        blockers: unknown[]
      }
      const paths = output.operations.map(operation => operation.path)
      const operationKinds = new Set(output.operations.map(operation => operation.kind))
      const packageJsonOperation = output.operations.find(operation => operation.path === 'package.json')

      assert.deepStrictEqual(output.blockers, [])
      assert.deepStrictEqual(result.value.blockers, [])
      assert.ok(paths.includes('package.json'))
      assert.ok(paths.includes('src/index.ts'))
      assert.ok(paths.includes('tsconfig.json'))
      assert.ok(paths.includes('eslint.config.mjs'))
      assert.ok(paths.includes('knip.json'))
      assert.ok(paths.includes('.prelude/providers/effect-harness/provider.json'))
      assert.ok(paths.includes('.effect-harness.json'))
      assert.ok(paths.includes('AGENTS.md'))
      assert.ok(operationKinds.has('writeStructuredFile'))
      assert.ok(operationKinds.has('writeGeneratedUserFile'))
      assert.ok(operationKinds.has('writeManagedFile'))
      assert.ok(operationKinds.has('writeManagedBlock'))
      assert.equal(packageJsonOperation?.value?.scripts?.verify, 'pnpm build && pnpm typecheck && pnpm lint && pnpm knip && pnpm effect:verify')
      assert.equal(packageJsonOperation?.value?.scripts?.typecheck, 'tsgo --noEmit --project tsconfig.json')
      assert.equal(packageJsonOperation?.value?.dependencies?.effect, '4.0.0-beta.90')
      assert.equal(packageJsonOperation?.value?.devDependencies?.knip, 'catalog:')
      assert.equal(yield* pathExists(path.join(targetDir, 'package.json')), false)
      assert.equal(yield* pathExists(path.join(targetDir, '.prelude/manifest.json')), false)
    }))

  it.effect('prints the current workspace CLI equivalent through direct --spec without writing files', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const fixture = yield* readJsonFile<unknown>(workspaceCliEquivalentSpecPath)
      const result = yield* withCapturedStdout(runCreateRouteWithArgs({
        spec: workspaceCliEquivalentSpecPath,
        printSpec: true,
        noInput: true,
      }, targetDir))

      assert.equal(result.value.kind, 'printed-spec')
      assert.deepStrictEqual(JSON.parse(result.output), fixture)
      assert.equal(yield* pathExists(path.join(targetDir, 'package.json')), false)
      assert.equal(yield* pathExists(path.join(targetDir, '.prelude/manifest.json')), false)
    }))

  it.effect('keeps the combined v1 target as an explicit resolver gap instead of dropping provider intent', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const desiredCombinedV1Spec = {
        topology: 'workspace',
        packages: [
          {
            id: 'tool',
            name: '@workbench/effect-tool',
            capabilities: ['effect-package'],
            internalDependencies: [],
          },
        ],
        rootCapabilities: ['package-manager:pnpm', 'linting', 'knip', 'ai-harness'],
        providers: ['effect-harness'],
        overrides: {},
      }
      const result = yield* withCapturedStdout(runCreateRouteWithArgs({
        spec: JSON.stringify(desiredCombinedV1Spec),
        dryRun: true,
        noInput: true,
      }, targetDir))

      assert.equal(result.value.kind, 'dry-run')

      const output = JSON.parse(result.output) as {
        operations: unknown[]
        blockers: Array<{ schema: string, message: string }>
      }

      assert.deepStrictEqual(output.operations, [])
      assert.equal(output.blockers[0]?.schema, 'CreateSpec')
      assert.match(output.blockers[0]?.message ?? '', /workspace provider orchestration is handled by the ai-harness slice and is not supported here/u)
      assert.equal(yield* pathExists(path.join(targetDir, '.prelude/manifest.json')), false)
    }))
})
