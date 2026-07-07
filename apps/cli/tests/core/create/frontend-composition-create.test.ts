import assert from 'node:assert/strict'
import { NodeServices } from '@effect/platform-node'
import { describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { makeTargetDir } from '@/brand/target-dir'
import { createProjectFromSpec } from '@/core/create'
import { projectRecoveredIntentFixtureToCreateSpec } from '@/core/create/recovered-intent-projector'
import { FsLive } from '@/core/services/fs'
import { assertPathDoesNotExist, makeTempProjectDir, pathJoinSync, readFileString, readJson } from '../../support/effect-files'
import { EffectHarnessDiscoveryTestLayer } from '../../support/effect-harness-discovery'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

describe('frontend composition create pipeline', () => {
  it.layer(TestLayer)((it) => {
    it.effect('recovers React router, Jotai, Less, and Tailwind intent through typed surfaces', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-frontend-composition-')
      const spec = projectRecoveredIntentFixtureToCreateSpec('legacy-react-full')

      const result = yield* createProjectFromSpec({
        spec,
        targetDir: makeTargetDir(targetDir),
        preludeVersion: '0.0.0-test',
      })

      assert.deepEqual(result.resolvedGraph.packageCapabilities, {
        app: ['react-app', 'css:less', 'css:tailwind', 'router:react-router', 'state:jotai'],
      })

      const packageJson = yield* readJson<{
        dependencies: Record<string, string>
        devDependencies: Record<string, string>
      }>(pathJoinSync(targetDir, 'package.json'))
      assert.equal(packageJson.dependencies['react-router'], '^8.0.1')
      assert.equal(packageJson.dependencies.jotai, '^2.20.1')
      assert.equal(packageJson.devDependencies.less, '^4.6.7')
      assert.equal(packageJson.devDependencies.tailwindcss, '^4.3.1')
      assert.equal(packageJson.devDependencies['@tailwindcss/vite'], '^4.3.1')

      const mainSource = yield* readFileString(pathJoinSync(targetDir, 'src/main.tsx'))
      assert.match(mainSource, /import '\.\/styles\.less'/u)
      assert.match(mainSource, /import '\.\/styles\.css'/u)

      const viteConfig = yield* readFileString(pathJoinSync(targetDir, 'vite.config.ts'))
      assert.match(viteConfig, /@vitejs\/plugin-react/u)
      assert.match(viteConfig, /@tailwindcss\/vite/u)
      assert.match(viteConfig, /react\(\)/u)
      assert.match(viteConfig, /tailwindcss\(\)/u)

      const appShell = yield* readFileString(pathJoinSync(targetDir, 'src/App.tsx'))
      assert.match(appShell, /BrowserRouter/u)
      assert.match(appShell, /<Routes>/u)
      assert.match(appShell, /path="\/"/u)
      assert.match(appShell, /const readyCountAtom = atom\(0\)/u)
      assert.match(appShell, /Jotai count: \{readyCount\}/u)
      assert.match(appShell, /className="min-h-screen grid place-content-center gap-4 bg-slate-50 text-slate-900"/u)

      const lessStyles = yield* readFileString(pathJoinSync(targetDir, 'src/styles.less'))
      const tailwindStyles = yield* readFileString(pathJoinSync(targetDir, 'src/styles.css'))
      assert.match(lessStyles, /@surface-bg/u)
      assert.match(tailwindStyles, /@import "tailwindcss";/u)

      assert.deepEqual(
        result.writePlan.operations.map(operation => operation.path).filter(surfacePath => surfacePath.startsWith('src/')),
        ['src/main.tsx', 'src/styles.less', 'src/styles.css', 'src/App.tsx'],
      )
      yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('recovers Vue Router, Pinia, Less, and Tailwind intent through typed surfaces', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-frontend-composition-')
      const spec = projectRecoveredIntentFixtureToCreateSpec('legacy-vue-full')

      const result = yield* createProjectFromSpec({
        spec,
        targetDir: makeTargetDir(targetDir),
        preludeVersion: '0.0.0-test',
      })

      assert.deepEqual(result.resolvedGraph.packageCapabilities, {
        app: ['vue-app', 'css:less', 'css:tailwind', 'router:vue-router', 'state:pinia'],
      })

      const packageJson = yield* readJson<{
        dependencies: Record<string, string>
        devDependencies: Record<string, string>
      }>(pathJoinSync(targetDir, 'package.json'))
      assert.equal(packageJson.dependencies['vue-router'], '^5.1.0')
      assert.equal(packageJson.dependencies.pinia, '^3.0.4')
      assert.equal(packageJson.devDependencies.less, '^4.6.7')
      assert.equal(packageJson.devDependencies.tailwindcss, '^4.3.1')
      assert.equal(packageJson.devDependencies['@tailwindcss/vite'], '^4.3.1')

      const mainSource = yield* readFileString(pathJoinSync(targetDir, 'src/main.ts'))
      assert.match(mainSource, /createRouter/u)
      assert.match(mainSource, /createWebHistory/u)
      assert.match(mainSource, /createPinia/u)
      assert.match(mainSource, /createApp\(App\)\.use\(router\)\.use\(pinia\)\.mount\('#app'\)/u)
      assert.match(mainSource, /import '\.\/styles\.less'/u)
      assert.match(mainSource, /import '\.\/styles\.css'/u)

      const appShell = yield* readFileString(pathJoinSync(targetDir, 'src/App.vue'))
      assert.match(appShell, /defineStore/u)
      assert.match(appShell, /storeToRefs/u)
      assert.match(appShell, /<RouterLink to="\/">Home<\/RouterLink>/u)
      assert.match(appShell, /<RouterView \/>/u)
      assert.match(appShell, /Pinia count: \{\{ count \}\}/u)
      assert.match(appShell, /class="min-h-screen grid place-content-center gap-4 bg-slate-50 text-slate-900"/u)

      const viteConfig = yield* readFileString(pathJoinSync(targetDir, 'vite.config.ts'))
      assert.match(viteConfig, /@vitejs\/plugin-vue/u)
      assert.match(viteConfig, /@tailwindcss\/vite/u)

      assert.deepEqual(
        result.writePlan.operations.map(operation => operation.path).filter(surfacePath => surfacePath.startsWith('src/')),
        ['src/main.ts', 'src/styles.less', 'src/styles.css', 'src/App.vue'],
      )
      yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
    }))
  })
})
