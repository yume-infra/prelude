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

function expectTextClean(label: string, templateRelativePath: string, output: string) {
  const subject = `${label} (${templateRelativePath})`

  expect(output, `${subject} must end with a newline`).toMatch(/\n$/)
  expect(output, `${subject} must not contain trailing whitespace`).not.toMatch(/[ \t]+$/m)
}

function expectViteConfigClean(label: string, templateRelativePath: string, output: string) {
  const subject = `${label} (${templateRelativePath})`

  expectTextClean(label, templateRelativePath, output)
  expect(output, `${subject} must not render blank plugin slots`).not.toMatch(/plugins: \[\n\s*\n/)
  expect(output, `${subject} must not render orphan plugin commas`).not.toMatch(/\n\s*,\s*\w/)
  expect(output, `${subject} must keep plugin entries comma-terminated`).toMatch(/\w+\(\),\n/)
}

function expectSnippetsInOrder(label: string, output: string, snippets: readonly string[]) {
  let previousIndex = -1

  for (const snippet of snippets) {
    const currentIndex = output.indexOf(snippet)

    expect(currentIndex, `${label} must include ${snippet}`).toBeGreaterThanOrEqual(0)
    expect(currentIndex, `${label} must render ${snippet} after the prior snippet`).toBeGreaterThan(previousIndex)

    previousIndex = currentIndex
  }
}

function expectSnippetsAbsent(label: string, output: string, snippets: readonly string[]) {
  for (const snippet of snippets) {
    expect(output, `${label} must not include ${snippet}`).not.toContain(snippet)
  }
}

function expectReactCounterComponentClean(label: string, templateRelativePath: string, output: string) {
  const subject = `${label} (${templateRelativePath})`

  expectTextClean(label, templateRelativePath, output)
  expect(output, `${subject} must put JSX return parentheses on separate lines`).not.toContain('return (<')
  expect(output, `${subject} must render JSX on the line after return (`).toContain('return (\n    <div className="counter">')
  expect(output, `${subject} must close the JSX return on its own line`).toContain('\n  )\n}')
}

function expectReactCounterStoreClean(label: string, templateRelativePath: string, output: string) {
  const subject = `${label} (${templateRelativePath})`

  expectTextClean(label, templateRelativePath, output)
  expect(output, `${subject} must use space indentation`).not.toContain('\t')
  expect(output, `${subject} must separate imports from runtime declarations`).not.toMatch(/^import .+\n(?:export|interface)/m)
  expect(output, `${subject} must not wrap a single state setter parameter`).not.toContain('create<CounterState>((set)')
}

describe('generated template cleanliness', () => {
  it.each([
    [
      'react full',
      reactPresetProjectConfig,
    ],
    [
      'vue full',
      vuePresetProjectConfig,
    ],
    [
      'vue custom without tailwind',
      vueCustomProjectConfig,
    ],
  ] as const)('renders common templates cleanly for %s', async (label, config) => {
    const templates = [
      'fragments/common/README.md.hbs',
      'fragments/common/linter/vscode.settings.json.hbs',
      'fragments/common/linter/zed.settings.json.hbs',
      'fragments/common/linter/eslint.config.mjs.hbs',
    ] as const

    for (const templateRelativePath of templates) {
      const output = await renderTemplate(templateRelativePath, config)

      expectTextClean(label, templateRelativePath, output)
    }
  })

  it.each([
    [
      'react full with tailwind',
      reactPresetProjectConfig,
      [
        'import tailwindcss from \'@tailwindcss/vite\'',
        'import react from \'@vitejs/plugin-react\'',
        'import { defineConfig } from \'vite\'',
        'react(),',
        'tailwindcss(),',
      ],
      [],
    ],
    [
      'vue full with tailwind',
      vuePresetProjectConfig,
      [
        'import tailwindcss from \'@tailwindcss/vite\'',
        'import vue from \'@vitejs/plugin-vue\'',
        'import { defineConfig } from \'vite\'',
        'vue(),',
        'tailwindcss(),',
      ],
      [],
    ],
    [
      'vue custom without tailwind',
      vueCustomProjectConfig,
      [
        'import vue from \'@vitejs/plugin-vue\'',
        'import { defineConfig } from \'vite\'',
        'vue(),',
      ],
      [
        'import tailwindcss from \'@tailwindcss/vite\'',
        'tailwindcss(),',
      ],
    ],
  ] as const)('renders vite config cleanly for %s', async (label, config, orderedSnippets, absentSnippets) => {
    const templateRelativePath = 'fragments/common/vite.config.ts.hbs'
    const output = await renderTemplate(templateRelativePath, config)

    expectViteConfigClean(label, templateRelativePath, output)
    expectSnippetsInOrder(label, output, orderedSnippets)
    expectSnippetsAbsent(label, output, absentSnippets)
  })

  it.each([
    [
      'react jotai',
      reactPresetProjectConfig,
    ],
    [
      'react zustand',
      reactZustandProjectConfig,
    ],
    [
      'react no state',
      reactNoStateProjectConfig,
    ],
  ] as const)('renders react counter component cleanly for %s', async (label, config) => {
    const templateRelativePath = 'fragments/react/Counter.tsx.hbs'
    const output = await renderTemplate(templateRelativePath, config)

    expectReactCounterComponentClean(label, templateRelativePath, output)
  })

  it.each([
    [
      'react jotai',
      reactPresetProjectConfig,
    ],
    [
      'react zustand',
      reactZustandProjectConfig,
    ],
  ] as const)('renders react counter store cleanly for %s', async (label, config) => {
    const templateRelativePath = 'fragments/react/Counter.ts.hbs'
    const output = await renderTemplate(templateRelativePath, config)

    expectReactCounterStoreClean(label, templateRelativePath, output)
  })

  it.each([
    [
      'react full',
      reactPresetProjectConfig,
      'react: true,',
    ],
    [
      'vue full',
      vuePresetProjectConfig,
      'vue: true,',
    ],
  ] as const)('renders eslint config cleanly for %s', async (label, config, frameworkSnippet) => {
    const templateRelativePath = 'fragments/common/linter/eslint.config.mjs.hbs'
    const output = await renderTemplate(templateRelativePath, config)

    expectTextClean(label, templateRelativePath, output)
    expect(output, `${label} must not render blank config entries`).not.toMatch(/,\n\s*,/)
    expect(output, `${label} must render the framework config branch`).toContain(frameworkSnippet)
    expect(output, `${label} must keep ignores comma-terminated`).toContain('ignores: [\'docs/**\'],')
  })

  it('renders vscode eslint settings with common generated snippets', async () => {
    const templateRelativePath = 'fragments/common/linter/vscode.settings.json.hbs'
    const output = await renderTemplate(templateRelativePath, reactPresetProjectConfig)

    expectTextClean('react full', templateRelativePath, output)
    expectSnippetsInOrder('react full vscode settings', output, [
      '"source.fixAll.eslint": "explicit"',
      '"source.organizeImports": "never"',
      '"eslint.rules.customizations": [',
      '{ "rule": "style/*", "severity": "off", "fixable": true }',
      '"eslint.validate": [',
      '"typescript"',
      '"typescriptreact"',
      '"vue"',
      '"jsonc"',
    ])
  })

  it('renders zed eslint settings as parseable project settings', async () => {
    const templateRelativePath = 'fragments/common/linter/zed.settings.json.hbs'
    const output = await renderTemplate(templateRelativePath, reactPresetProjectConfig)
    const settings = JSON.parse(output)

    expectTextClean('react full', templateRelativePath, output)
    expect(settings.languages.TypeScript.code_actions_on_format).toEqual({
      'source.fixAll.eslint': true,
    })
    expect(settings.languages.TSX.formatter).toBe('none')
    expect(settings.languages.Vue.code_actions_on_format).toEqual({
      'source.fixAll.eslint': true,
    })
    expect(settings.lsp.eslint.settings.workingDirectory).toEqual({
      mode: 'auto',
    })
    expect(settings.lsp.eslint.settings.rulesCustomizations).toContainEqual({
      rule: 'style/*',
      severity: 'off',
      fixable: true,
    })
  })
})
