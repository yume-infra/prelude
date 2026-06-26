import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { makeProjectName } from '@/brand/project-name'
import { makeTargetDir } from '@/brand/target-dir'
import { CliContextLive } from '@/core/cli-context'
import { runCreateRoute } from '@/core/create-route'
import { formatCanonicalCreateSpecJson } from '@/core/create-spec-input'
import { projectRecoveredIntentFixtureToCreateSpec } from '@/core/create/recovered-intent-projector'
import { FsLive } from '@/core/services/fs'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
)

async function makeTempProjectDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'prelude-recovered-intent-'))
}

async function readJson<T = unknown>(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
}

describe('recovered main intent create pipeline', () => {
  it('proves legacy-react-minimal through the public direct-spec create route', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const targetDir = yield* Effect.promise(makeTempProjectDir)
        const spec = projectRecoveredIntentFixtureToCreateSpec('legacy-react-minimal')

        const result = yield* runCreateRoute({
          preludeVersion: '0.0.0-test',
          targetDir: makeTargetDir(targetDir),
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              TestLayer,
              CliContextLive({
                args: {
                  spec: formatCanonicalCreateSpecJson(spec),
                  name: makeProjectName('ignored-recovered-target'),
                  noInput: true,
                },
                isInteractive: false,
              }),
            ),
          ),
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

        const packageJson = yield* Effect.promise(() =>
          readJson<{
            scripts: Record<string, string>
            dependencies: Record<string, string>
            devDependencies: Record<string, string>
          }>(path.join(targetDir, 'package.json')),
        )
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

        const sourceEntry = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/main.tsx'), 'utf8'))
        assert.match(sourceEntry, /createRoot\(document\.getElementById\('root'\)!\)/u)
        assert.match(sourceEntry, /import '\.\/styles\.less'/u)
        const viteConfig = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'vite.config.ts'), 'utf8'))
        assert.match(viteConfig, /@vitejs\/plugin-react/u)
        const tsconfig = yield* Effect.promise(() =>
          readJson<{
            compilerOptions: { jsx: string, types: readonly string[] }
            include: readonly string[]
          }>(path.join(targetDir, 'tsconfig.json')),
        )
        assert.strictEqual(tsconfig.compilerOptions.jsx, 'react-jsx')
        assert.deepStrictEqual(tsconfig.compilerOptions.types, ['vite/client'])
        assert.deepStrictEqual(tsconfig.include, ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts'])
        yield* Effect.promise(() => fs.access(path.join(targetDir, '.prelude/manifest.json')))

        const manifest = yield* Effect.promise(() =>
          readJson<{
            createSpec: unknown
            lifecycleProviders: readonly unknown[]
            lifecycleSurfaces: readonly unknown[]
            generatedUserSurfaces: readonly { path: string, authority: string }[]
            verificationRecords: readonly unknown[]
          }>(path.join(targetDir, '.prelude/manifest.json')),
        )

        assert.deepStrictEqual(manifest.createSpec, spec)
        assert.deepStrictEqual(manifest.lifecycleProviders, [])
        assert.deepStrictEqual(manifest.lifecycleSurfaces, [])
        assert.deepStrictEqual(
          manifest.generatedUserSurfaces.map(surface => ({ path: surface.path, authority: surface.authority })),
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
        assert.deepStrictEqual(manifest.verificationRecords, [
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
      }),
    )
  })

  it('proves legacy-cli-effect through the current effect-harness provider route', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const targetDir = yield* Effect.promise(makeTempProjectDir)
        const spec = projectRecoveredIntentFixtureToCreateSpec('legacy-cli-effect')

        const result = yield* runCreateRoute({
          preludeVersion: '0.0.0-test',
          targetDir: makeTargetDir(targetDir),
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              TestLayer,
              CliContextLive({
                args: {
                  spec: formatCanonicalCreateSpecJson(spec),
                  name: makeProjectName('ignored-effect-target'),
                  noInput: true,
                },
                isInteractive: false,
              }),
            ),
          ),
        )

        if (result.kind !== 'created') {
          assert.fail(`expected create route to create, got ${result.kind}`)
        }

        assert.deepStrictEqual(result.result.writePlan.operations.map(operation => operation.path), [
          'package.json',
          'knip.json',
          'src/index.ts',
          'tsconfig.json',
          '.prelude/providers/effect-harness/provider.json',
        ])

        const packageJson = yield* Effect.promise(() =>
          readJson<{
            scripts: Record<string, string>
            dependencies: Record<string, string>
            devDependencies: Record<string, string>
          }>(path.join(targetDir, 'package.json')),
        )
        assert.strictEqual(packageJson.scripts.build, 'tsgo --noEmit --project tsconfig.json')
        assert.strictEqual(packageJson.scripts.verify, 'pnpm build && pnpm knip')
        assert.strictEqual(packageJson.dependencies.effect, '4.0.0-beta.90')
        assert.strictEqual(packageJson.dependencies['@effect/platform-node'], '4.0.0-beta.90')
        assert.strictEqual(packageJson.devDependencies['@effect/tsgo'], '0.14.6')
        assert.strictEqual(packageJson.devDependencies['@effect/vitest'], '4.0.0-beta.90')

        const sourceEntry = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/index.ts'), 'utf8'))
        assert.match(sourceEntry, /Effect\.fn\('main'\)/u)
        assert.match(sourceEntry, /NodeRuntime\.runMain\(main\(\)\)/u)
        assert.match(sourceEntry, /cli-effect-fixture ready/u)

        const providerArtifact = yield* Effect.promise(() =>
          readJson<{
            id: string
            projectedContext: {
              packageScopes: readonly string[]
              packageCapabilities: Record<string, readonly string[]>
            }
            lifecycleSurfaces: readonly string[]
          }>(path.join(targetDir, '.prelude/providers/effect-harness/provider.json')),
        )
        assert.strictEqual(providerArtifact.id, 'effect-harness')
        assert.deepStrictEqual(providerArtifact.projectedContext.packageScopes, ['cli'])
        assert.deepStrictEqual(providerArtifact.projectedContext.packageCapabilities, {
          cli: ['effect-package'],
        })
        assert.ok(providerArtifact.lifecycleSurfaces.includes('provider-artifact:effect-harness'))
        assert.ok(providerArtifact.lifecycleSurfaces.includes('package-manifest:root:/dependencies/effect'))

        const manifest = yield* Effect.promise(() =>
          readJson<{
            createSpec: unknown
            lifecycleProviders: readonly { id: string, lifecycleSurfaces: readonly string[] }[]
            lifecycleSurfaces: readonly { id: string, owner: string, lifecycle: string, path: string }[]
            generatedUserSurfaces: readonly { path: string, authority: string }[]
            verificationRecords: readonly unknown[]
          }>(path.join(targetDir, '.prelude/manifest.json')),
        )

        assert.deepStrictEqual(manifest.createSpec, spec)
        assert.deepStrictEqual(manifest.lifecycleProviders.map(provider => provider.id), ['effect-harness'])
        assert.deepStrictEqual(
          manifest.lifecycleProviders[0]?.lifecycleSurfaces,
          manifest.lifecycleSurfaces.map(surface => surface.id),
        )
        assert.ok(
          manifest.lifecycleSurfaces.every(surface =>
            surface.owner === 'provider:effect-harness'
            && surface.lifecycle === 'managed'
            && !surface.path.startsWith('src/')),
          'only provider runtime assets and package pointers are managed',
        )
        assert.deepStrictEqual(
          manifest.generatedUserSurfaces.map(surface => ({ path: surface.path, authority: surface.authority })),
          [
            { path: 'package.json', authority: 'none' },
            { path: 'knip.json', authority: 'none' },
            { path: 'src/index.ts', authority: 'none' },
            { path: 'tsconfig.json', authority: 'none' },
          ],
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
            checkedPaths: ['knip.json'],
          },
          {
            id: 'provider:effect-harness:create-contract',
            status: 'passed',
            checkedPaths: ['package.json', '.prelude/providers/effect-harness/provider.json'],
          },
        ])
      }),
    )
  })
})
