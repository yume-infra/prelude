import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { makeProjectName } from '@/brand/project-name'
import { makeTargetDir } from '@/brand/target-dir'
import { CliContext } from '@/core/cli-context'
import { runCreateRoute } from '@/core/create-route'
import { formatCanonicalCreateSpecJson } from '@/core/create-spec-input'
import { projectRecoveredIntentFixtureToCreateSpec } from '@/core/create/recovered-intent-projector'
import { FsLive } from '@/core/services/fs'
import { assertPathDoesNotExist, makeTempProjectDir, pathJoinSync, readFileString, readJson } from '../../support/effect-files'
import { EffectHarnessDiscoveryTestLayer } from '../../support/effect-harness-discovery'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

describe('recovered main intent create pipeline', () => {
  it.layer(TestLayer)((it) => {
    it.effect('proves legacy-react-minimal through the public direct-spec create route', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-recovered-intent-')
      const spec = projectRecoveredIntentFixtureToCreateSpec('legacy-react-minimal')

      const result = yield* runCreateRoute({
        preludeVersion: '0.0.0-test',
        targetDir: makeTargetDir(targetDir),
      }).pipe(
        Effect.provideService(CliContext, CliContext.of({
          args: {
            spec: formatCanonicalCreateSpecJson(spec),
            name: makeProjectName('ignored-recovered-target'),
            noInput: true,
          },
          isInteractive: false,
        })),
      )

      if (result.kind !== 'created') {
        assert.fail(`expected create route to create, got ${result.kind}`)
      }

      assert.deepStrictEqual(result.result.writePlan.operations.map(operation => operation.path), [
        'package.json',
        'knip.json',
        'index.html',
        'src/main.tsx',
        'vite.config.ts',
        'src/styles.less',
        'tsconfig.json',
        'src/App.tsx',
      ])

      const packageJson = yield* readJson<{
        scripts: Record<string, string>
        dependencies: Record<string, string>
        devDependencies: Record<string, string>
      }>(pathJoinSync(targetDir, 'package.json'))
      assert.strictEqual(packageJson.scripts.build, 'vite build')
      assert.strictEqual(packageJson.scripts.verify, 'pnpm build && pnpm knip')
      assert.strictEqual(packageJson.scripts['deps:check'], 'taze -r')
      assert.deepStrictEqual(packageJson.dependencies, {
        'react': '^19.2.6',
        'react-dom': '^19.2.6',
      })
      assert.strictEqual(packageJson.devDependencies.knip, 'catalog:')
      assert.strictEqual(packageJson.devDependencies.taze, 'catalog:')
      assert.strictEqual(packageJson.devDependencies.less, '^4.6.7')

      const sourceEntry = yield* readFileString(pathJoinSync(targetDir, 'src/main.tsx'))
      assert.match(sourceEntry, /createRoot\(document\.getElementById\('root'\)!\)/u)
      assert.match(sourceEntry, /import '\.\/styles\.less'/u)
      const viteConfig = yield* readFileString(pathJoinSync(targetDir, 'vite.config.ts'))
      assert.match(viteConfig, /@vitejs\/plugin-react/u)
      const tsconfig = yield* readJson<{
        compilerOptions: { jsx: string, types: readonly string[] }
        include: readonly string[]
      }>(pathJoinSync(targetDir, 'tsconfig.json'))
      assert.strictEqual(tsconfig.compilerOptions.jsx, 'react-jsx')
      assert.deepStrictEqual(tsconfig.compilerOptions.types, ['vite/client'])
      assert.deepStrictEqual(tsconfig.include, ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts'])
      assert.deepStrictEqual(
        result.result.writePlan.operations.map(operation => ({ path: operation.path, authority: operation.authority })),
        [
          { path: 'package.json', authority: 'none' },
          { path: 'knip.json', authority: 'none' },
          { path: 'index.html', authority: 'none' },
          { path: 'src/main.tsx', authority: 'none' },
          { path: 'vite.config.ts', authority: 'none' },
          { path: 'src/styles.less', authority: 'none' },
          { path: 'tsconfig.json', authority: 'none' },
          { path: 'src/App.tsx', authority: 'none' },
        ],
      )
      assert.deepStrictEqual(result.result.verification.records, [
        {
          id: 'react-app-files-present',
          status: 'passed',
          checkedPaths: ['package.json', 'index.html', 'src/main.tsx', 'src/App.tsx', 'vite.config.ts', 'tsconfig.json', 'src/styles.less'],
        },
        {
          id: 'root-engineering-files-present',
          status: 'passed',
          checkedPaths: ['knip.json'],
        },
      ])
      yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('proves legacy-cli-effect through the current effect-harness provider route', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-recovered-intent-')
      const spec = projectRecoveredIntentFixtureToCreateSpec('legacy-cli-effect')

      const result = yield* runCreateRoute({
        preludeVersion: '0.0.0-test',
        targetDir: makeTargetDir(targetDir),
      }).pipe(
        Effect.provideService(CliContext, CliContext.of({
          args: {
            spec: formatCanonicalCreateSpecJson(spec),
            name: makeProjectName('ignored-effect-target'),
            noInput: true,
          },
          isInteractive: false,
        })),
      )

      if (result.kind !== 'created') {
        assert.fail(`expected create route to create, got ${result.kind}`)
      }

      const operationPaths = result.result.writePlan.operations.map(operation => operation.path)
      assert.deepStrictEqual(operationPaths.slice(0, 6), [
        'package.json',
        'eslint.config.mjs',
        'knip.json',
        'src/index.ts',
        'tsconfig.json',
        '.prelude/providers/effect-harness/provider.json',
      ])
      assert.equal(operationPaths.includes('AGENTS.md'), false)
      assert.equal(operationPaths.some(path => path.startsWith('.codex/')), false)

      const packageJson = yield* readJson<{
        scripts: Record<string, string>
        dependencies: Record<string, string>
        devDependencies: Record<string, string>
      }>(pathJoinSync(targetDir, 'package.json'))
      assert.strictEqual(packageJson.scripts.build, 'tsgo --noEmit')
      assert.strictEqual(packageJson.scripts.lint, 'eslint')
      assert.strictEqual(packageJson.scripts.prepare, 'effect-tsgo patch')
      assert.strictEqual(packageJson.scripts.test, 'vitest run')
      assert.strictEqual(packageJson.scripts.typecheck, 'tsgo --noEmit')
      assert.strictEqual(packageJson.scripts.verify, 'pnpm build && pnpm typecheck && pnpm test && pnpm lint --max-warnings 0 && pnpm knip')
      assert.strictEqual(packageJson.scripts['effect:verify'], undefined)
      assert.strictEqual(packageJson.dependencies.effect, '4.0.0-beta.92')
      assert.strictEqual(packageJson.dependencies['@effect/platform-node'], '4.0.0-beta.92')
      assert.strictEqual(packageJson.devDependencies['@effect/tsgo'], '0.15.0')
      assert.strictEqual(packageJson.devDependencies['@effect/vitest'], '4.0.0-beta.92')
      assert.strictEqual(packageJson.devDependencies['@antfu/eslint-config'], '^9.0.0')
      assert.strictEqual(packageJson.devDependencies.eslint, '^10.3.0')
      assert.strictEqual(packageJson.devDependencies.vitest, '^4.1.8')

      const knipConfig = yield* readJson<{
        ignoreDependencies?: readonly string[]
      }>(pathJoinSync(targetDir, 'knip.json'))
      assert.deepStrictEqual(knipConfig.ignoreDependencies, ['@effect/tsgo', '@effect/vitest'])

      const sourceEntry = yield* readFileString(pathJoinSync(targetDir, 'src/index.ts'))
      assert.match(sourceEntry, /Effect\.fn\('main'\)/u)
      assert.match(sourceEntry, /NodeRuntime\.runMain\(main\(\)\)/u)
      assert.match(sourceEntry, /cli-effect-fixture ready/u)

      const providerRecord = yield* readJson<{
        id: string
        projectedContext: {
          packageScopes: readonly string[]
          packagePaths: Record<string, string>
          packageCapabilities: Record<string, readonly string[]>
        }
        surfaces: readonly { id: string, owner: string, lifecycle: string, path: string }[]
      }>(pathJoinSync(targetDir, '.prelude/providers/effect-harness/provider.json'))
      assert.strictEqual(providerRecord.id, 'effect-harness')
      assert.deepStrictEqual(providerRecord.projectedContext.packageScopes, ['cli'])
      assert.deepStrictEqual(providerRecord.projectedContext.packagePaths, {})
      assert.deepStrictEqual(providerRecord.projectedContext.packageCapabilities, {
        cli: ['effect-package'],
      })
      const providerSurfaceIds = new Set(providerRecord.surfaces.map(surface => surface.id))
      assert.ok(providerSurfaceIds.has('package-manifest:root:/dependencies/effect'))
      assert.ok(providerSurfaceIds.has('package-manifest:root:/scripts/test'))
      assert.ok(providerSurfaceIds.has('package-manifest:root:/scripts/lint'))
      assert.ok(providerSurfaceIds.has('tsconfig:root:/compilerOptions/plugins'))
      assert.ok(providerSurfaceIds.has('provider-managed-file:effect-harness:.prelude/providers/effect-harness/eslint.config.mjs'))
      assert.ok(providerSurfaceIds.has('provider-managed-file:effect-harness:.prelude/providers/effect-harness/docs/discovery.md'))
      assert.ok(providerSurfaceIds.has('provider-managed-file:effect-harness:.prelude/providers/effect-harness/snippets/agents.md'))
      assert.equal([...providerSurfaceIds].some(surfaceId => surfaceId.includes('.codex/')), false)
      assert.equal([...providerSurfaceIds].some(surfaceId => surfaceId.includes('AGENTS.md#effect-harness')), false)

      const manifest = yield* readJson<{
        maintainProviders: readonly { id: string, recordPath: string }[]
        verificationRecords: readonly unknown[]
      }>(pathJoinSync(targetDir, '.prelude/manifest.json'))

      assert.deepStrictEqual(Object.keys(manifest).sort(), [
        'maintainProviders',
        'preludeVersion',
        'schemaVersion',
        'verificationRecords',
      ])
      assert.deepStrictEqual(manifest.maintainProviders.map(provider => provider.id), ['effect-harness'])
      assert.deepStrictEqual(manifest.maintainProviders[0]?.recordPath, '.prelude/providers/effect-harness/provider.json')
      assert.ok(
        providerRecord.surfaces.every(surface =>
          surface.owner === 'provider:effect-harness'
          && surface.lifecycle === 'managed'
          && !surface.path.startsWith('src/')),
        'provider-managed surfaces must not include target source files',
      )
      assert.deepStrictEqual(manifest.verificationRecords, [
        {
          id: 'minimal-create-files-present',
          status: 'passed',
          checkedPaths: ['package.json', 'src/index.ts', 'tsconfig.json'],
        },
        {
          id: 'root-engineering-files-present',
          status: 'passed',
          checkedPaths: ['eslint.config.mjs', 'knip.json'],
        },
        {
          id: 'provider:effect-harness:create-contract',
          status: 'passed',
          checkedPaths: ['package.json', '.prelude/providers/effect-harness/provider.json'],
        },
      ])
    }))
  })
})
