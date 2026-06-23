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
  cliEffectPresetProjectConfig,
  cliMinimalPresetProjectConfig,
  libraryMinimalProjectConfig,
  nodeMinimalPresetProjectConfig,
  reactCustomProjectConfig,
  reactPresetProjectConfig,
  vueCustomProjectConfig,
  vueMinimalPresetProjectConfig,
  vuePresetProjectConfig,
  workspaceMixedProjectConfig,
  workspaceRootMinimalProjectConfig,
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
      'workspace root pnpm workspace',
      'fragments/common/workspace/pnpm-workspace.yaml.hbs',
      workspaceRootMinimalProjectConfig,
    ],
    [
      'workspace root turbo config',
      'fragments/common/workspace/turbo.json.hbs',
      workspaceRootMinimalProjectConfig,
    ],
    [
      'standalone react Knip config',
      'fragments/common/maintenance/knip.jsonc.hbs',
      reactPresetProjectConfig,
    ],
    [
      'workspace mixed Knip config',
      'fragments/common/maintenance/knip.jsonc.hbs',
      workspaceMixedProjectConfig,
    ],
    [
      'node runtime entry',
      'fragments/node/index.ts.hbs',
      nodeMinimalPresetProjectConfig,
    ],
    [
      'node runtime tsconfig',
      'fragments/common/node-runtime/tsconfig.json.hbs',
      nodeMinimalPresetProjectConfig,
    ],
    [
      'neutral library runtime tsconfig',
      'fragments/common/node-runtime/tsconfig.json.hbs',
      libraryMinimalProjectConfig,
    ],
    [
      'node library runtime tsconfig',
      'fragments/common/node-runtime/tsconfig.json.hbs',
      {
        ...libraryMinimalProjectConfig,
        runtime: 'node',
      },
    ],
    [
      'node runtime tsdown config',
      'fragments/common/node-runtime/tsdown.config.ts.hbs',
      nodeMinimalPresetProjectConfig,
    ],
    [
      'cli entry with shebang',
      'fragments/cli/index.ts.hbs',
      cliMinimalPresetProjectConfig,
    ],
    [
      'cli shebang handler',
      'fragments/cli/ensure-shebang.mjs.hbs',
      cliMinimalPresetProjectConfig,
    ],
    [
      'cli README with bin path',
      'fragments/cli/README.md.hbs',
      cliMinimalPresetProjectConfig,
    ],
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
    [
      'vue home with state management',
      'fragments/vue/Home.vue.hbs',
      vuePresetProjectConfig,
    ],
    [
      'vue home without state management',
      'fragments/vue/Home.vue.hbs',
      vueMinimalPresetProjectConfig,
    ],
    [
      'vue about with state management',
      'fragments/vue/About.vue.hbs',
      vuePresetProjectConfig,
    ],
    [
      'vue about without state management',
      'fragments/vue/About.vue.hbs',
      vueMinimalPresetProjectConfig,
    ],
    [
      'vue counter with state management',
      'fragments/vue/Counter.vue.hbs',
      vuePresetProjectConfig,
    ],
    [
      'vue counter without state management',
      'fragments/vue/Counter.vue.hbs',
      vueMinimalPresetProjectConfig,
    ],
    [
      'vue counter store',
      'fragments/vue/counter-store.ts.hbs',
      vuePresetProjectConfig,
    ],
  ] as const)('renders %s', async (_name, templateRelativePath, config) => {
    const output = await renderTemplate(templateRelativePath, config)

    expect(output).toMatchSnapshot()
  })

  it('renders Knip Tailwind dependency policy for CSS imports', async () => {
    const standaloneTailwind = JSON.parse(
      await renderTemplate('fragments/common/maintenance/knip.jsonc.hbs', vuePresetProjectConfig),
    )
    const standaloneWithoutTailwind = JSON.parse(
      await renderTemplate('fragments/common/maintenance/knip.jsonc.hbs', vueCustomProjectConfig),
    )
    const workspaceTailwindConfig = {
      ...workspaceMixedProjectConfig,
      packages: workspaceMixedProjectConfig.packages.map(packageSpec =>
        packageSpec.kind === 'frontend-app'
          ? {
              ...packageSpec,
              frontend: {
                ...packageSpec.frontend,
                cssFramework: 'tailwind' as const,
              },
            }
          : packageSpec,
      ),
    } satisfies ProjectConfig
    const workspaceTailwind = JSON.parse(
      await renderTemplate('fragments/common/maintenance/knip.jsonc.hbs', workspaceTailwindConfig),
    )

    expect(standaloneTailwind.ignoreDependencies).toEqual(['tailwindcss'])
    expect(standaloneWithoutTailwind.ignoreDependencies).toBeUndefined()
    expect(workspaceTailwind.workspaces['apps/web'].ignoreDependencies).toEqual(['tailwindcss'])
    expect(workspaceTailwind.workspaces['apps/tool'].ignoreBinaries).toEqual(['dist/index.js'])
    expect(workspaceTailwind.workspaces['libs/shared']).toEqual({})
  })

  it('renders the effect cli entry with @effect/cli and NodeRuntime.runMain', async () => {
    const output = await renderTemplate('fragments/cli/effect-index.ts.hbs', cliEffectPresetProjectConfig)

    expect(output).toContain('import { Command, Options } from \'@effect/cli\'')
    expect(output).toContain('import { NodeContext, NodeRuntime } from \'@effect/platform-node\'')
    expect(output).toContain('const command = Command.make(')
    expect(output).toContain('NodeRuntime.runMain(')
    expect(output).toContain('cli(process.argv).pipe(Effect.provide(NodeContext.layer))')
  })

  it('renders the effect cli README with runtime notes', async () => {
    const output = await renderTemplate('fragments/cli/effect-README.md.hbs', cliEffectPresetProjectConfig)

    expect(output).toContain('# cli-effect-fixture')
    expect(output).toContain('generated by create-yume with Effect')
    expect(output).toContain('`@effect/cli`, `NodeContext.layer`, and `NodeRuntime.runMain`')
  })
})
