import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { NodeServices } from '@effect/platform-node'
import { describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { makeTargetDir } from '@/brand/target-dir'
import { createProjectFromSpec } from '@/core/create'
import { projectRecoveredIntentFixtureToCreateSpec } from '@/core/create/recovered-intent-projector'
import { FsLive } from '@/core/services/fs'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
)

async function makeTempProjectDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'prelude-frontend-composition-'))
}

async function readJson<T = unknown>(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
}

describe('frontend composition create pipeline', () => {
  it('recovers React router, Jotai, Less, and Tailwind intent through typed surfaces', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const targetDir = yield* Effect.promise(makeTempProjectDir)
        const spec = projectRecoveredIntentFixtureToCreateSpec('legacy-react-full')

        const result = yield* createProjectFromSpec({
          spec,
          targetDir: makeTargetDir(targetDir),
          preludeVersion: '0.0.0-test',
        })

        assert.deepEqual(result.resolvedGraph.packageCapabilities, {
          app: ['react-app', 'css:less', 'css:tailwind', 'router:react-router', 'state:jotai'],
        })

        const packageJson = yield* Effect.promise(() =>
          readJson<{
            dependencies: Record<string, string>
            devDependencies: Record<string, string>
          }>(path.join(targetDir, 'package.json')),
        )
        assert.equal(packageJson.dependencies['react-router'], '^8.0.1')
        assert.equal(packageJson.dependencies.jotai, '^2.20.1')
        assert.equal(packageJson.devDependencies.less, '^4.6.7')
        assert.equal(packageJson.devDependencies.tailwindcss, '^4.3.1')
        assert.equal(packageJson.devDependencies['@tailwindcss/vite'], '^4.3.1')

        const mainSource = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/main.tsx'), 'utf8'))
        assert.match(mainSource, /import '\.\/styles\.less'/u)
        assert.match(mainSource, /import '\.\/styles\.css'/u)

        const viteConfig = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'vite.config.ts'), 'utf8'))
        assert.match(viteConfig, /@vitejs\/plugin-react/u)
        assert.match(viteConfig, /@tailwindcss\/vite/u)
        assert.match(viteConfig, /react\(\)/u)
        assert.match(viteConfig, /tailwindcss\(\)/u)

        const appShell = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/App.tsx'), 'utf8'))
        assert.match(appShell, /BrowserRouter/u)
        assert.match(appShell, /<Routes>/u)
        assert.match(appShell, /path="\/"/u)
        assert.match(appShell, /const readyCountAtom = atom\(0\)/u)
        assert.match(appShell, /Jotai count: \{readyCount\}/u)
        assert.match(appShell, /className="min-h-screen grid place-content-center gap-4 bg-slate-50 text-slate-900"/u)

        const lessStyles = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/styles.less'), 'utf8'))
        const tailwindStyles = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/styles.css'), 'utf8'))
        assert.match(lessStyles, /@surface-bg/u)
        assert.match(tailwindStyles, /@import "tailwindcss";/u)

        const manifest = yield* Effect.promise(() =>
          readJson<{
            lifecycleProviders: readonly unknown[]
            lifecycleSurfaces: readonly unknown[]
            generatedUserSurfaces: Array<{ path: string, authority: string }>
          }>(path.join(targetDir, '.prelude/manifest.json')),
        )
        assert.deepEqual(manifest.lifecycleProviders, [])
        assert.deepEqual(manifest.lifecycleSurfaces, [])
        assert.ok(manifest.generatedUserSurfaces.every(surface => surface.authority === 'none'))
        assert.deepEqual(
          manifest.generatedUserSurfaces.map(surface => surface.path).filter(surfacePath => surfacePath.startsWith('src/')),
          ['src/main.tsx', 'src/styles.less', 'src/styles.css', 'src/App.tsx'],
        )
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  it('recovers Vue Router, Pinia, Less, and Tailwind intent through typed surfaces', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const targetDir = yield* Effect.promise(makeTempProjectDir)
        const spec = projectRecoveredIntentFixtureToCreateSpec('legacy-vue-full')

        const result = yield* createProjectFromSpec({
          spec,
          targetDir: makeTargetDir(targetDir),
          preludeVersion: '0.0.0-test',
        })

        assert.deepEqual(result.resolvedGraph.packageCapabilities, {
          app: ['vue-app', 'css:less', 'css:tailwind', 'router:vue-router', 'state:pinia'],
        })

        const packageJson = yield* Effect.promise(() =>
          readJson<{
            dependencies: Record<string, string>
            devDependencies: Record<string, string>
          }>(path.join(targetDir, 'package.json')),
        )
        assert.equal(packageJson.dependencies['vue-router'], '^5.1.0')
        assert.equal(packageJson.dependencies.pinia, '^3.0.4')
        assert.equal(packageJson.devDependencies.less, '^4.6.7')
        assert.equal(packageJson.devDependencies.tailwindcss, '^4.3.1')
        assert.equal(packageJson.devDependencies['@tailwindcss/vite'], '^4.3.1')

        const mainSource = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/main.ts'), 'utf8'))
        assert.match(mainSource, /createRouter/u)
        assert.match(mainSource, /createWebHistory/u)
        assert.match(mainSource, /createPinia/u)
        assert.match(mainSource, /createApp\(App\)\.use\(router\)\.use\(pinia\)\.mount\('#app'\)/u)
        assert.match(mainSource, /import '\.\/styles\.less'/u)
        assert.match(mainSource, /import '\.\/styles\.css'/u)

        const appShell = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/App.vue'), 'utf8'))
        assert.match(appShell, /defineStore/u)
        assert.match(appShell, /storeToRefs/u)
        assert.match(appShell, /<RouterLink to="\/">Home<\/RouterLink>/u)
        assert.match(appShell, /<RouterView \/>/u)
        assert.match(appShell, /Pinia count: \{\{ count \}\}/u)
        assert.match(appShell, /class="min-h-screen grid place-content-center gap-4 bg-slate-50 text-slate-900"/u)

        const viteConfig = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'vite.config.ts'), 'utf8'))
        assert.match(viteConfig, /@vitejs\/plugin-vue/u)
        assert.match(viteConfig, /@tailwindcss\/vite/u)

        const manifest = yield* Effect.promise(() =>
          readJson<{
            lifecycleProviders: readonly unknown[]
            lifecycleSurfaces: readonly unknown[]
            generatedUserSurfaces: Array<{ path: string, authority: string }>
          }>(path.join(targetDir, '.prelude/manifest.json')),
        )
        assert.deepEqual(manifest.lifecycleProviders, [])
        assert.deepEqual(manifest.lifecycleSurfaces, [])
        assert.ok(manifest.generatedUserSurfaces.every(surface => surface.authority === 'none'))
        assert.deepEqual(
          manifest.generatedUserSurfaces.map(surface => surface.path).filter(surfacePath => surfacePath.startsWith('src/')),
          ['src/main.ts', 'src/styles.less', 'src/styles.css', 'src/App.vue'],
        )
      }).pipe(Effect.provide(TestLayer)),
    )
  })
})
