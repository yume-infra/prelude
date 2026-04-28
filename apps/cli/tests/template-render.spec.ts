import type { ProjectConfig } from '../src/schema/project-config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeFileSystem } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeTemplatePath } from '../src/brand/template-path'
import { AppConfig } from '../src/config/app-config'
import { FsLive } from '../src/core/services/fs'
import { TemplateEngineLive, TemplateEngineService } from '../src/core/services/template-engine'
import { makeTestConfigProvider } from './support/config-provider'
import {
  reactCustomProjectConfig,
  reactPresetProjectConfig,
  vueCustomProjectConfig,
  vuePresetProjectConfig,
} from './support/fixtures'

const testsDir = path.dirname(fileURLToPath(import.meta.url))
const templateRoot = path.resolve(testsDir, '../templates')
const partialRoot = path.join(templateRoot, 'partials')

const templateEngineLayer = TemplateEngineLive.pipe(
  Layer.provideMerge(AppConfig.Default),
  Layer.provideMerge(
    FsLive.pipe(
      Layer.provideMerge(NodeFileSystem.layer),
    ),
  ),
)

const reactZustandProjectConfig = {
  ...reactPresetProjectConfig,
  stateManagement: 'zustand',
} satisfies ProjectConfig

const reactNoStateProjectConfig = {
  ...reactPresetProjectConfig,
  stateManagement: 'none',
} satisfies ProjectConfig

function renderTemplate(templateRelativePath: string, config: ProjectConfig) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const templateEngine = yield* TemplateEngineService
      yield* templateEngine.prepare(config, makeTemplatePath(partialRoot))

      return yield* templateEngine.render(
        makeTemplatePath(path.join(templateRoot, templateRelativePath)),
        {},
        config,
      )
    }).pipe(
      Effect.provide(templateEngineLayer),
      Effect.withConfigProvider(makeTestConfigProvider()),
    ),
  )
}

describe('template render snapshots', () => {
  it.each([
    [
      'react main without router',
      'fragments/react/main.tsx.hbs',
      {
        ...reactCustomProjectConfig,
        router: 'none',
      },
    ],
    [
      'react main with react-router',
      'fragments/react/main.tsx.hbs',
      reactPresetProjectConfig,
    ],
    [
      'react main with tanstack router',
      'fragments/react/main.tsx.hbs',
      reactCustomProjectConfig,
    ],
    [
      'react counter component with jotai',
      'fragments/react/Counter.tsx.hbs',
      reactPresetProjectConfig,
    ],
    [
      'react counter component with zustand',
      'fragments/react/Counter.tsx.hbs',
      reactZustandProjectConfig,
    ],
    [
      'react counter component without state management',
      'fragments/react/Counter.tsx.hbs',
      reactNoStateProjectConfig,
    ],
    [
      'react counter store with jotai',
      'fragments/react/Counter.ts.hbs',
      reactPresetProjectConfig,
    ],
    [
      'react counter store with zustand',
      'fragments/react/Counter.ts.hbs',
      reactZustandProjectConfig,
    ],
    [
      'vite config for react with tailwind',
      'fragments/common/vite.config.ts.hbs',
      reactPresetProjectConfig,
    ],
    [
      'vite config for vue with tailwind',
      'fragments/common/vite.config.ts.hbs',
      vuePresetProjectConfig,
    ],
    [
      'vite config for vue without tailwind',
      'fragments/common/vite.config.ts.hbs',
      vueCustomProjectConfig,
    ],
    [
      'react shared style without router-specific config branching',
      'fragments/common/css/style.css.hbs',
      {
        ...reactCustomProjectConfig,
        router: 'none',
      },
    ],
    [
      'eslint config for react',
      'fragments/common/linter/eslint.config.mjs.hbs',
      reactPresetProjectConfig,
    ],
    [
      'eslint config for vue',
      'fragments/common/linter/eslint.config.mjs.hbs',
      vuePresetProjectConfig,
    ],
    [
      'vue app with router and state management',
      'fragments/vue/App.vue.hbs',
      vuePresetProjectConfig,
    ],
    [
      'vue app without router and state management',
      'fragments/vue/App.vue.hbs',
      {
        ...vueCustomProjectConfig,
        router: false,
        stateManagement: false,
      },
    ],
  ] as const)('renders %s', async (_name, templateRelativePath, config) => {
    const output = await renderTemplate(templateRelativePath, config)

    expect(output).toMatchSnapshot()
  })
})
