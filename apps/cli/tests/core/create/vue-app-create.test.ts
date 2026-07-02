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
import { EffectHarnessDiscoveryTestLayer } from '../../support/effect-harness-discovery'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

async function makeTempProjectDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'prelude-vue-app-create-'))
}

async function readJson<T = unknown>(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
}

describe('vue app create pipeline', () => {
  it('creates a renderable Vue app from the recovered canonical fixture through direct spec', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const targetDir = yield* Effect.promise(makeTempProjectDir)
        const spec = projectRecoveredIntentFixtureToCreateSpec('legacy-vue-minimal')

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
                  name: makeProjectName('ignored-vue-target'),
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

        assert.deepStrictEqual(result.result.writePlan.operations.map(operation => ({
          id: operation.id,
          owner: operation.owner,
          surfaceId: operation.surfaceId,
          path: operation.path,
          authority: operation.authority,
        })), [
          {
            id: 'write-package-json',
            owner: 'materializer:package-json',
            surfaceId: 'package-manifest:root',
            path: 'package.json',
            authority: 'none',
          },
          {
            id: 'write-knip-config',
            owner: 'materializer:knip-config',
            surfaceId: 'knip-root',
            path: 'knip.json',
            authority: 'none',
          },
          {
            id: 'write-vue-index-html',
            owner: 'materializer:vue-app-static',
            surfaceId: 'vue-app-static:app/index.html',
            path: 'index.html',
            authority: 'none',
          },
          {
            id: 'write-vue-main',
            owner: 'materializer:frontend-entry',
            surfaceId: 'vue-app-entry:app',
            path: 'src/main.ts',
            authority: 'none',
          },
          {
            id: 'write-vite-config',
            owner: 'materializer:vite-config',
            surfaceId: 'vite-config:app',
            path: 'vite.config.ts',
            authority: 'none',
          },
          {
            id: 'write-less-stylesheet',
            owner: 'materializer:stylesheet',
            surfaceId: 'stylesheet:app/src/styles.less',
            path: 'src/styles.less',
            authority: 'none',
          },
          {
            id: 'write-tsconfig',
            owner: 'materializer:typescript-config',
            surfaceId: 'typescript-config:root',
            path: 'tsconfig.json',
            authority: 'none',
          },
          {
            id: 'write-vue-app-shell',
            owner: 'materializer:vue-app-shell',
            surfaceId: 'vue-app-shell:app',
            path: 'src/App.vue',
            authority: 'none',
          },
        ])

        const packageJson = yield* Effect.promise(() =>
          readJson<{
            scripts: Record<string, string>
            dependencies: Record<string, string>
            devDependencies: Record<string, string>
          }>(path.join(targetDir, 'package.json')),
        )
        assert.strictEqual(packageJson.scripts.dev, 'vite')
        assert.strictEqual(packageJson.scripts.build, 'vite build')
        assert.strictEqual(packageJson.scripts.preview, 'vite preview')
        assert.strictEqual(packageJson.scripts.verify, 'pnpm build && pnpm knip')
        assert.deepStrictEqual(packageJson.dependencies, {
          vue: '^3.5.39',
        })
        assert.strictEqual(packageJson.devDependencies['@vitejs/plugin-vue'], '^6.0.7')
        assert.strictEqual(packageJson.devDependencies.typescript, 'catalog:')
        assert.strictEqual(packageJson.devDependencies.vite, '^8.0.9')
        assert.strictEqual(packageJson.devDependencies.less, '^4.6.7')

        const indexHtml = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'index.html'), 'utf8'))
        const mainSource = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/main.ts'), 'utf8'))
        const appShell = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/App.vue'), 'utf8'))
        const viteConfig = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'vite.config.ts'), 'utf8'))
        const tsconfig = yield* Effect.promise(() =>
          readJson<{ compilerOptions: { types: readonly string[] }, include: readonly string[] }>(path.join(targetDir, 'tsconfig.json')),
        )

        assert.match(indexHtml, /<div id="app"><\/div>/u)
        assert.match(mainSource, /createApp\(App\)\.mount\('#app'\)/u)
        assert.match(mainSource, /import '\.\/styles\.less'/u)
        assert.match(appShell, /const appName = "vue-minimal-fixture"/u)
        assert.match(appShell, /<h1>\{\{ appName \}\}<\/h1>/u)
        assert.equal(/pinia|vue-router|tailwind/u.test(appShell), false)
        assert.match(viteConfig, /@vitejs\/plugin-vue/u)
        assert.deepStrictEqual(tsconfig.compilerOptions.types, ['vite/client'])
        assert.deepStrictEqual(tsconfig.include, ['src/**/*.ts', 'src/**/*.vue', 'vite.config.ts'])

        const manifest = yield* Effect.promise(() =>
          readJson<{
            createSpec: unknown
            maintainProviders: readonly unknown[]
            generatedUserSurfaces: readonly { path: string, authority: string }[]
            verificationRecords: readonly unknown[]
          }>(path.join(targetDir, '.prelude/manifest.json')),
        )

        assert.deepStrictEqual(manifest.createSpec, spec)
        assert.deepStrictEqual(manifest.maintainProviders, [])
        assert.deepStrictEqual(
          manifest.generatedUserSurfaces.map(surface => ({ path: surface.path, authority: surface.authority })),
          [
            { path: 'package.json', authority: 'none' },
            { path: 'knip.json', authority: 'none' },
            { path: 'index.html', authority: 'none' },
            { path: 'src/main.ts', authority: 'none' },
            { path: 'vite.config.ts', authority: 'none' },
            { path: 'src/styles.less', authority: 'none' },
            { path: 'tsconfig.json', authority: 'none' },
            { path: 'src/App.vue', authority: 'none' },
          ],
        )
        assert.deepStrictEqual(manifest.verificationRecords, [
          {
            id: 'vue-app-files-present',
            status: 'passed',
            checkedPaths: ['package.json', 'index.html', 'src/main.ts', 'src/App.vue', 'vite.config.ts', 'tsconfig.json', 'src/styles.less'],
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
})
