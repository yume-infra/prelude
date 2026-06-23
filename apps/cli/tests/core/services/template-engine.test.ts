import type { ProjectConfig } from '@/schema/project-config'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeFileSystem } from '@effect/platform-node'
import { ConfigProvider, Effect, Layer } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeProjectName } from '@/brand/project-name'
import { makeTemplatePath } from '@/brand/template-path'
import { AppConfig } from '@/config/app-config'
import { FsLive } from '~/fs'
import {
  collectTemplatePartialEntries,
  TemplateEngineLive,
  TemplateEngineService,
} from '../../../src/core/services/template-engine'

const fixtureRoot = path.dirname(fileURLToPath(import.meta.url))
const partialRoot = makeTemplatePath(path.resolve(fixtureRoot, '../../../templates/partials'))
const orchestratorSourcePath = path.resolve(fixtureRoot, '../../../src/core/services/orchestrator.ts')
const templateEngineLayer = TemplateEngineLive.pipe(
  Layer.provideMerge(AppConfig.Default),
  Layer.provideMerge(
    FsLive.pipe(
      Layer.provideMerge(NodeFileSystem.layer),
    ),
  ),
)

const reactConfig: ProjectConfig = {
  type: 'react',
  name: makeProjectName('phase2-react'),
  language: 'typescript',
  git: true,
  linting: 'antfu-eslint',
  codeQuality: ['lint-staged'],
  buildTool: 'vite',
  router: 'none',
  stateManagement: 'zustand',
  cssPreprocessor: 'css',
  cssFramework: 'none',
}

const vueConfig: ProjectConfig = {
  type: 'vue',
  name: makeProjectName('phase2-vue'),
  language: 'typescript',
  git: true,
  linting: 'antfu-eslint',
  codeQuality: ['commitlint'],
  buildTool: 'vite',
  router: false,
  stateManagement: false,
  cssPreprocessor: 'css',
  cssFramework: 'none',
}

function runWithTemplateEngine<A, E>(effect: Effect.Effect<A, E, TemplateEngineService>) {
  return Effect.runPromise(
    effect.pipe(
      Effect.provide(templateEngineLayer),
      Effect.withConfigProvider(ConfigProvider.fromMap(new Map())),
    ),
  )
}

describe('collectTemplatePartialEntries', () => {
  it('collects react partials before global partials with ownership metadata', () => {
    expect(collectTemplatePartialEntries(reactConfig, partialRoot)).toEqual([
      {
        dir: makeTemplatePath(path.join(partialRoot, 'react')),
        namespace: 'react',
        ownership: {
          owner: 'react-scaffold',
          unit: 'partial-namespace',
        },
      },
      {
        dir: makeTemplatePath(path.join(partialRoot, 'global')),
        namespace: 'global',
        ownership: {
          owner: 'frontend-scaffold',
          unit: 'partial-namespace',
        },
      },
    ])
  })

  it('collects vue partials before global partials with ownership metadata', () => {
    expect(collectTemplatePartialEntries(vueConfig, partialRoot)).toEqual([
      {
        dir: makeTemplatePath(path.join(partialRoot, 'vue')),
        namespace: 'vue',
        ownership: {
          owner: 'vue-scaffold',
          unit: 'partial-namespace',
        },
      },
      {
        dir: makeTemplatePath(path.join(partialRoot, 'global')),
        namespace: 'global',
        ownership: {
          owner: 'frontend-scaffold',
          unit: 'partial-namespace',
        },
      },
    ])
  })
})

describe('templateEngineService', () => {
  it('keeps orchestration delegated to TemplateEngine.prepare', () => {
    const source = readFileSync(orchestratorSourcePath, 'utf8')

    expect(source).toContain('templateEngine.prepare(config, partialRoot)')
    expect(source).not.toContain('templateEngine.registerHelpers(')
    expect(source).not.toContain('templateEngine.registerPartials(')
    expect(source).not.toContain('collectPartialEntries')
  })

  it('renders global partials from the explicit global namespace directory', async () => {
    const templatePath = path.resolve(fixtureRoot, '../../../templates/fragments/vue/main.ts.hbs')

    const output = await runWithTemplateEngine(
      Effect.gen(function* () {
        const templateEngine = yield* TemplateEngineService
        yield* templateEngine.registerHelpers()
        yield* templateEngine.registerPartials(makeTemplatePath(path.join(partialRoot, 'global')), 'global')
        return yield* templateEngine.render(makeTemplatePath(templatePath), {}, vueConfig)
      }),
    )

    expect(output).toContain(`import './style.css'`)
    expect(output).not.toContain(`import router from './router'`)
    expect(output).toContain(`createApp(App)`)
  })

  it('prepares helpers and framework/global partials before rendering react fragments', async () => {
    const templatePath = makeTemplatePath(path.resolve(fixtureRoot, '../../../templates/fragments/react/main.tsx.hbs'))

    const output = await runWithTemplateEngine(
      Effect.gen(function* () {
        const templateEngine = yield* TemplateEngineService
        yield* templateEngine.prepare(reactConfig, partialRoot)
        return yield* templateEngine.render(templatePath, {}, reactConfig)
      }),
    )

    expect(output).toContain(`import './style.css'`)
    expect(output).toContain(`import { createRoot } from 'react-dom/client'`)
    expect(output).toContain(`<App />`)
    expect(output).toContain(`document.getElementById('root')!`)
  })

  it('keeps missing partial directories as a no-op through prepare', async () => {
    await expect(runWithTemplateEngine(
      Effect.gen(function* () {
        const templateEngine = yield* TemplateEngineService
        yield* templateEngine.prepare(vueConfig, makeTemplatePath('/tmp/prelude/missing-partials'))
      }),
    )).resolves.toBeUndefined()
  })
})
