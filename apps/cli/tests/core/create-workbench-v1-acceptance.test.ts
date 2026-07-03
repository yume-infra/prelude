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
import { EffectHarnessDiscoveryTestLayer } from '../support/effect-harness-discovery'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

const fixtureRoot = fileURLToPath(new URL('../fixtures/fullscreen-create-workbench-v1/', import.meta.url))
const effectHarnessEquivalentSpecPath = path.join(fixtureRoot, 'effect-harness-current-equivalent.create-spec.json')
const minimalWorkspaceSpecPath = path.join(fixtureRoot, 'minimal-workspace.create-spec.json')
const nodeMonorepoWorkspaceV1SpecPath = path.join(fixtureRoot, 'node-monorepo-workspace-v1.create-spec.json')
const workspaceCliAbilitySpecPath = path.join(fixtureRoot, 'workspace-cli-ability.create-spec.json')
const workspaceCliQualityEnabledSpecPath = path.join(fixtureRoot, 'workspace-cli-quality-enabled.create-spec.json')

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
      assert.equal(paths.includes('AGENTS.md'), false)
      assert.equal(paths.some(path => path.startsWith('.codex/')), false)
      assert.ok(operationKinds.has('writeStructuredFile'))
      assert.ok(operationKinds.has('writeGeneratedUserFile'))
      assert.ok(operationKinds.has('writeManagedFile'))
      assert.equal(operationKinds.has('writeManagedBlock'), false)
      assert.equal(packageJsonOperation?.value?.scripts?.verify, 'pnpm build && pnpm typecheck && pnpm test && pnpm lint --max-warnings 0 && pnpm knip')
      assert.equal(packageJsonOperation?.value?.scripts?.prepare, 'effect-tsgo patch')
      assert.equal(packageJsonOperation?.value?.scripts?.typecheck, 'tsgo --noEmit')
      assert.equal(packageJsonOperation?.value?.dependencies?.effect, '4.0.0-beta.92')
      assert.equal(packageJsonOperation?.value?.devDependencies?.knip, 'catalog:')
      assert.equal(yield* pathExists(path.join(targetDir, 'package.json')), false)
      assert.equal(yield* pathExists(path.join(targetDir, '.prelude/manifest.json')), false)
    }))

  it.effect('dry-runs the default minimal workspace intent without package abilities', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const result = yield* withCapturedStdout(runCreateRouteWithArgs({
        spec: minimalWorkspaceSpecPath,
        dryRun: true,
        noInput: true,
      }, targetDir))

      assert.equal(result.value.kind, 'dry-run')

      const output = JSON.parse(result.output) as {
        operations: Array<{
          content?: string
          path: string
          value?: {
            scripts?: Record<string, string>
            devDependencies?: Record<string, string>
          }
        }>
        blockers: unknown[]
      }
      const paths = output.operations.map(operation => operation.path)
      const rootPackageJsonOperation = output.operations.find(operation => operation.path === 'package.json')
      const workspaceManifestOperation = output.operations.find(operation => operation.path === 'pnpm-workspace.yaml')

      assert.deepStrictEqual(output.blockers, [])
      assert.deepStrictEqual(paths, ['package.json', 'pnpm-workspace.yaml'])
      assert.equal(rootPackageJsonOperation?.value?.scripts, undefined)
      assert.equal(rootPackageJsonOperation?.value?.devDependencies, undefined)
      assert.match(workspaceManifestOperation?.content ?? '', / {2}- apps\/\*/u)
      assert.match(workspaceManifestOperation?.content ?? '', / {2}- libs\/\*/u)
      assert.equal(workspaceManifestOperation?.content?.includes('catalog:'), false)
      assert.equal(yield* pathExists(path.join(targetDir, 'package.json')), false)
      assert.equal(yield* pathExists(path.join(targetDir, '.prelude/manifest.json')), false)
    }))

  it.effect('dry-runs the explicit workspace CLI ability without hidden linting surfaces', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const result = yield* withCapturedStdout(runCreateRouteWithArgs({
        spec: workspaceCliAbilitySpecPath,
        dryRun: true,
        noInput: true,
      }, targetDir))

      assert.equal(result.value.kind, 'dry-run')

      const output = JSON.parse(result.output) as {
        operations: Array<{
          content?: string
          path: string
          value?: {
            scripts?: Record<string, string>
            devDependencies?: Record<string, string>
          }
        }>
        blockers: unknown[]
      }
      const paths = output.operations.map(operation => operation.path)
      const rootPackageJsonOperation = output.operations.find(operation => operation.path === 'package.json')
      const workspaceManifestOperation = output.operations.find(operation => operation.path === 'pnpm-workspace.yaml')

      assert.deepStrictEqual(output.blockers, [])
      assert.ok(paths.includes('package.json'))
      assert.ok(paths.includes('pnpm-workspace.yaml'))
      assert.ok(paths.includes('apps/tool/package.json'))
      assert.ok(paths.includes('apps/tool/src/index.ts'))
      assert.ok(paths.includes('apps/tool/tsconfig.json'))
      assert.ok(paths.includes('apps/tool/tsdown.config.ts'))
      assert.equal(paths.includes('eslint.config.mjs'), false)
      assert.equal(paths.includes('knip.json'), false)
      assert.equal(rootPackageJsonOperation?.value?.scripts?.lint, undefined)
      assert.equal(rootPackageJsonOperation?.value?.scripts?.knip, undefined)
      assert.equal(rootPackageJsonOperation?.value?.scripts?.verify, undefined)
      assert.equal(rootPackageJsonOperation?.value?.devDependencies?.['@antfu/eslint-config'], undefined)
      assert.equal(rootPackageJsonOperation?.value?.devDependencies?.eslint, undefined)
      assert.equal(rootPackageJsonOperation?.value?.devDependencies?.knip, undefined)
      assert.match(workspaceManifestOperation?.content ?? '', /typescript: 6\.0\.3/u)
      assert.match(workspaceManifestOperation?.content ?? '', /tsdown: \^0\.21\.10/u)
      assert.equal(workspaceManifestOperation?.content?.includes('@antfu/eslint-config'), false)
      assert.equal(workspaceManifestOperation?.content?.includes('eslint: ^10.3.0'), false)
      assert.equal(workspaceManifestOperation?.content?.includes('knip: ^6.12.0'), false)
      assert.equal(yield* pathExists(path.join(targetDir, 'package.json')), false)
      assert.equal(yield* pathExists(path.join(targetDir, '.prelude/manifest.json')), false)
    }))

  it.effect('dry-runs an explicit quality-enabled workspace CLI equivalent with Antfu and Knip', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const result = yield* withCapturedStdout(runCreateRouteWithArgs({
        spec: workspaceCliQualityEnabledSpecPath,
        dryRun: true,
        noInput: true,
      }, targetDir))

      assert.equal(result.value.kind, 'dry-run')

      const output = JSON.parse(result.output) as {
        operations: Array<{
          content?: string
          path: string
          value?: {
            scripts?: Record<string, string>
            devDependencies?: Record<string, string>
          }
        }>
        blockers: unknown[]
      }
      const paths = output.operations.map(operation => operation.path)
      const rootPackageJsonOperation = output.operations.find(operation => operation.path === 'package.json')
      const workspaceManifestOperation = output.operations.find(operation => operation.path === 'pnpm-workspace.yaml')

      assert.deepStrictEqual(output.blockers, [])
      assert.ok(paths.includes('eslint.config.mjs'))
      assert.ok(paths.includes('knip.json'))
      assert.equal(rootPackageJsonOperation?.value?.scripts?.lint, 'eslint .')
      assert.equal(rootPackageJsonOperation?.value?.scripts?.knip, 'knip')
      assert.equal(rootPackageJsonOperation?.value?.scripts?.verify, 'pnpm build && pnpm lint && pnpm knip')
      assert.equal(rootPackageJsonOperation?.value?.devDependencies?.['@antfu/eslint-config'], 'catalog:')
      assert.equal(rootPackageJsonOperation?.value?.devDependencies?.eslint, 'catalog:')
      assert.equal(rootPackageJsonOperation?.value?.devDependencies?.knip, 'catalog:')
      assert.match(workspaceManifestOperation?.content ?? '', /'@antfu\/eslint-config': 8\.2\.0/u)
      assert.match(workspaceManifestOperation?.content ?? '', /eslint: \^10\.3\.0/u)
      assert.match(workspaceManifestOperation?.content ?? '', /knip: \^6\.12\.0/u)
      assert.equal(yield* pathExists(path.join(targetDir, 'package.json')), false)
      assert.equal(yield* pathExists(path.join(targetDir, '.prelude/manifest.json')), false)
    }))

  it.effect('prints the default minimal workspace intent through direct --spec without writing files', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const fixture = yield* readJsonFile<unknown>(minimalWorkspaceSpecPath)
      const result = yield* withCapturedStdout(runCreateRouteWithArgs({
        spec: minimalWorkspaceSpecPath,
        printSpec: true,
        noInput: true,
      }, targetDir))

      assert.equal(result.value.kind, 'printed-spec')
      assert.deepStrictEqual(JSON.parse(result.output), fixture)
      assert.equal(yield* pathExists(path.join(targetDir, 'package.json')), false)
      assert.equal(yield* pathExists(path.join(targetDir, '.prelude/manifest.json')), false)
    }))

  it.effect('dry-runs the node monorepo workspace v1 ability with turbo, quality, and effect-harness maintain', () =>
    Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir()
      const result = yield* withCapturedStdout(runCreateRouteWithArgs({
        spec: nodeMonorepoWorkspaceV1SpecPath,
        dryRun: true,
        noInput: true,
      }, targetDir))

      assert.equal(result.value.kind, 'dry-run')

      const output = JSON.parse(result.output) as {
        operations: Array<{
          kind: string
          path: string
          authority: string
          content?: string
          value?: {
            scripts?: Record<string, string>
            dependencies?: Record<string, string>
            devDependencies?: Record<string, string>
            projectedContext?: {
              topology: string
              packageScopes: readonly string[]
              packagePaths?: Record<string, string>
            }
            surfaces?: readonly { id: string }[]
          }
        }>
        blockers: unknown[]
      }
      const paths = output.operations.map(operation => operation.path)
      const rootPackageJsonOperation = output.operations.find(operation => operation.path === 'package.json')
      const nodePackageJsonOperation = output.operations.find(operation => operation.path === 'apps/node/package.json')
      const workspaceManifestOperation = output.operations.find(operation => operation.path === 'pnpm-workspace.yaml')
      const providerOperation = output.operations.find(operation => operation.path === '.prelude/providers/effect-harness/provider.json')

      assert.deepStrictEqual(output.blockers, [])
      assert.ok(paths.includes('package.json'))
      assert.ok(paths.includes('pnpm-workspace.yaml'))
      assert.ok(paths.includes('turbo.json'))
      assert.ok(paths.includes('eslint.config.mjs'))
      assert.ok(paths.includes('knip.json'))
      assert.ok(paths.includes('apps/node/package.json'))
      assert.ok(paths.includes('apps/node/src/index.ts'))
      assert.ok(paths.includes('apps/node/tsconfig.json'))
      assert.ok(paths.includes('apps/node/tsdown.config.ts'))
      assert.ok(paths.includes('.prelude/providers/effect-harness/provider.json'))
      assert.equal(paths.includes('AGENTS.md'), false)
      assert.equal(paths.some(path => path.startsWith('.codex/')), false)
      assert.equal(rootPackageJsonOperation?.value?.scripts?.build, 'turbo run build')
      assert.equal(rootPackageJsonOperation?.value?.scripts?.typecheck, 'turbo run typecheck')
      assert.equal(rootPackageJsonOperation?.value?.scripts?.lint, 'eslint')
      assert.equal(rootPackageJsonOperation?.value?.scripts?.knip, 'knip')
      assert.equal(rootPackageJsonOperation?.value?.scripts?.['effect:verify'], undefined)
      assert.equal(rootPackageJsonOperation?.value?.scripts?.verify, 'pnpm build && pnpm typecheck && pnpm -r --if-present test && pnpm lint --max-warnings 0 && pnpm knip')
      assert.equal(rootPackageJsonOperation?.value?.devDependencies?.turbo, 'catalog:')
      assert.equal(rootPackageJsonOperation?.value?.devDependencies?.['@antfu/eslint-config'], '^9.0.0')
      assert.equal(rootPackageJsonOperation?.value?.devDependencies?.eslint, '^10.3.0')
      assert.equal(nodePackageJsonOperation?.value?.dependencies?.effect, '4.0.0-beta.92')
      assert.equal(nodePackageJsonOperation?.value?.devDependencies?.['@effect/tsgo'], '0.15.0')
      assert.equal(nodePackageJsonOperation?.value?.scripts?.test, 'vitest run')
      assert.match(workspaceManifestOperation?.content ?? '', / {2}- apps\/\*/u)
      assert.match(workspaceManifestOperation?.content ?? '', /turbo: \^2\.9\.9/u)
      assert.match(workspaceManifestOperation?.content ?? '', /'@types\/node': 25\.6\.0/u)
      assert.equal(providerOperation?.value?.projectedContext?.topology, 'workspace')
      assert.deepStrictEqual(providerOperation?.value?.projectedContext?.packageScopes, ['node'])
      assert.deepStrictEqual(providerOperation?.value?.projectedContext?.packagePaths, {
        node: 'apps/node',
      })
      assert.equal(providerOperation?.value?.surfaces?.some(surface => surface.id.startsWith('tsconfig:root:')), false)
      assert.equal(providerOperation?.value?.surfaces?.some(surface => surface.id === 'tsconfig:apps/node:/compilerOptions/plugins'), true)
      assert.equal(yield* pathExists(path.join(targetDir, '.prelude/manifest.json')), false)
    }))
})
