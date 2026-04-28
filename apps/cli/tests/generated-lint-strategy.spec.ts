import type { ComposeDSL, JsonBuilder } from '../src/core/services/planner'
import type { ProjectConfig, ReactProjectConfig } from '../src/schema/project-config'
import type { TemplateRegistryEntry } from '../src/schema/template-registry'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeFileSystem } from '@effect/platform-node'
import { Effect, Layer, LogLevel, Option } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeTemplatePath } from '../src/brand/template-path'
import { AppConfig } from '../src/config/app-config'
import { buildPackageJson } from '../src/core/modifier/package-json'
import { ReactRouterIndexTemplate } from '../src/core/owners/router'
import { buildTemplates } from '../src/core/services/compose'
import { FsLive } from '../src/core/services/fs'
import { PlanService, toPlanSpec } from '../src/core/services/planner'
import { TemplateEngineLive, TemplateEngineService } from '../src/core/services/template-engine'
import { buildRootSvg } from '../src/core/template-registry/root-svg'
import { makeTestConfigProvider } from './support/config-provider'
import { reactCustomProjectConfig, reactPresetProjectConfig, vuePresetProjectConfig } from './support/fixtures'
import { makeFsMockLayer, makeTemplateEngineMockLayer } from './support/mock-layers'

const testsDir = path.dirname(fileURLToPath(import.meta.url))
const templateRoot = path.resolve(testsDir, '../templates')
const partialRoot = path.join(templateRoot, 'partials')
const routerTemplateRelativePath = 'fragments/react/router.ts.hbs'
const eslintConfigTemplateRelativePath = 'fragments/common/linter/eslint.config.mjs.hbs'
const rootTsConfigTemplateRelativePath = 'fragments/common/ts/tsconfig.json.hbs'
const appTsConfigTemplateRelativePath = 'fragments/common/ts/tsconfig.app.json.hbs'
const nodeTsConfigTemplateRelativePath = 'fragments/common/ts/tsconfig.node.json.hbs'
const routerStrategyLabel = `React Router static-import strategy (${routerTemplateRelativePath})`
const packageJsonStrategyLabel = 'package.json lint-preferred ordering strategy'

const templateEngineLayer = TemplateEngineLive.pipe(
  Layer.provideMerge(AppConfig.Default),
  Layer.provideMerge(
    FsLive.pipe(
      Layer.provideMerge(NodeFileSystem.layer),
    ),
  ),
)

const plannerTemplateRoot = makeTemplatePath('/virtual/templates')
const plannerLayer = PlanService.DefaultWithoutDependencies.pipe(
  Layer.provideMerge(Layer.mergeAll(
    Layer.succeed(AppConfig, AppConfig.make({
      logLevel: LogLevel.Debug,
      defaultConcurrency: 1,
      tracingEndpoint: Option.none(),
      debug: false,
    })),
    makeFsMockLayer(),
    makeTemplateEngineMockLayer(),
  )),
)

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

function buildPlanSpec(config: ProjectConfig) {
  return Effect.gen(function* () {
    const planner = yield* PlanService
    const plan = yield* planner.build((dsl) => {
      buildRootSvg(dsl, plannerTemplateRoot)
      buildPackageJson(dsl, config)
      buildTemplates(dsl, plannerTemplateRoot, config)
    })

    return toPlanSpec(plan)
  }).pipe(Effect.provide(plannerLayer))
}

function renderPackageJson(config: ProjectConfig) {
  let base: (() => Record<string, unknown>) | undefined
  const reducers: Array<(draft: Record<string, unknown>) => void> = []
  let finalize: ((draft: Record<string, unknown>) => void) | undefined
  let sortKeys = false

  const dsl: ComposeDSL = {
    json(path) {
      expect(path, `${packageJsonStrategyLabel} must target package.json`).toBe('package.json')

      const builder: JsonBuilder = {
        readExisting() {
          return builder
        },
        sortKeys(flag) {
          sortKeys = flag ?? false
          return builder
        },
        base(fn) {
          base = fn
          return builder
        },
        merge(patch) {
          reducers.push((draft) => {
            Object.assign(draft, typeof patch === 'function' ? patch(draft) : patch)
          })
          return builder
        },
        modify(fn) {
          reducers.push(fn)
          return builder
        },
        finalize(fn) {
          finalize = fn
          return builder
        },
      }

      return builder
    },
    text() {
      throw new Error('text builder is not used by package.json strategy tests')
    },
    copy() {
      throw new Error('copy builder is not used by package.json strategy tests')
    },
    render() {
      throw new Error('render builder is not used by package.json strategy tests')
    },
  }

  buildPackageJson(dsl, config)
  expect(sortKeys, `${packageJsonStrategyLabel} must not use deep alphabetical sortKeys(true)`).toBe(false)
  expect(finalize, `${packageJsonStrategyLabel} must install an explicit order finalizer`).toBeTypeOf('function')

  const draft = base?.() ?? {}
  for (const reducer of reducers)
    reducer(draft)
  finalize?.(draft)

  return draft
}

function parseRenderedJson(label: string, output: string) {
  try {
    return JSON.parse(output) as Record<string, unknown>
  }
  catch (error) {
    throw new Error(`${label} must render parseable JSON without comments: ${error}`)
  }
}

function expectJsonKeyOrder(
  label: string,
  json: Record<string, unknown>,
  expectedKeys: readonly string[],
) {
  expect(Object.keys(json), `${label} must render keys in lint-preferred order`).toEqual(expectedKeys)
}

function expectNestedJsonKeyOrder(
  label: string,
  json: Record<string, unknown>,
  path: string,
  expectedKeys: readonly string[],
) {
  const value = path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object')
      return undefined

    return (current as Record<string, unknown>)[key]
  }, json)

  expect(value, `${label} must include object at ${path}`).toBeTypeOf('object')
  expectJsonKeyOrder(`${label} ${path}`, value as Record<string, unknown>, expectedKeys)
}

function resolveTemplateTarget<TConfig>(entry: TemplateRegistryEntry<TConfig>, config: TConfig) {
  return typeof entry.target === 'string' ? entry.target : entry.target(config)
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

describe('generated lint strategy', () => {
  it('renders the React Router route module with static imports before the route tree', async () => {
    const output = await renderTemplate(routerTemplateRelativePath, reactPresetProjectConfig)

    expectSnippetsInOrder(routerStrategyLabel, output, [
      'import { createBrowserRouter } from \'react-router-dom\'',
      'import About from \'../pages/about\'',
      'import App from \'../pages/app\'',
      'import Home from \'../pages/home\'',
      'const router = createBrowserRouter([',
      'element: <App />',
      '{ index: true, element: <Home /> }',
      '{ path: \'about\', element: <About /> }',
      'export default router',
    ])
  })

  it('keeps lazy component bindings out of the React Router branch', async () => {
    const output = await renderTemplate(routerTemplateRelativePath, reactPresetProjectConfig)

    expectSnippetsAbsent(routerStrategyLabel, output, [
      'import { lazy } from \'react\'',
      'lazy(() =>',
      'const App = lazy',
      'const Home = lazy',
      'const About = lazy',
    ])
  })

  it('keeps the React Router template wired to the current generated target path', async () => {
    const target = resolveTemplateTarget<ReactProjectConfig>(ReactRouterIndexTemplate, reactPresetProjectConfig)
    const planSpec = await Effect.runPromise(buildPlanSpec(reactPresetProjectConfig))
    const routerTask = planSpec.tasks.find(task => task.kind === 'render' && task.path === target)

    expect(target, 'React Router template registry must target the current generated router file').toBe('src/router/index.tsx')
    expect(routerTask, `${routerStrategyLabel} must be rendered by the planner at ${target}`).toMatchObject({
      kind: 'render',
      path: 'src/router/index.tsx',
      src: '/virtual/templates/fragments/react/router.ts.hbs',
      ownership: {
        owner: 'router',
        unit: 'fragment-render',
      },
    })
  })

  it('preserves the TanStack Router branch while locking React Router lint strategy', async () => {
    const output = await renderTemplate(routerTemplateRelativePath, reactCustomProjectConfig)

    expectSnippetsInOrder('TanStack Router branch', output, [
      'import { createRootRoute, createRoute, createRouter, Outlet } from \'@tanstack/react-router\'',
      'import About from \'../pages/about\'',
      'import App from \'../pages/app\'',
      'import Home from \'../pages/home\'',
      'const rootRoute = createRootRoute({',
      'export const routeTree = rootRoute.addChildren([',
      'const router = createRouter({ routeTree })',
      'export default router',
    ])
    expect(output, 'TanStack Router branch must not switch to React Router semantics').not.toContain('createBrowserRouter')
  })

  it('orders generated package.json with package-lint semantics instead of alphabetical root keys', () => {
    const reactPackageJson = renderPackageJson(reactPresetProjectConfig)
    const vuePackageJson = renderPackageJson(vuePresetProjectConfig)
    const expectedTopLevelKeys = [
      'name',
      'type',
      'version',
      'description',
      'license',
      'engines',
      'scripts',
      'dependencies',
      'devDependencies',
    ]

    expectJsonKeyOrder(`${packageJsonStrategyLabel} react-full`, reactPackageJson, expectedTopLevelKeys)
    expectJsonKeyOrder(`${packageJsonStrategyLabel} vue-full`, vuePackageJson, expectedTopLevelKeys)
    expectNestedJsonKeyOrder(`${packageJsonStrategyLabel} react-full`, reactPackageJson, 'dependencies', [
      '@tailwindcss/vite',
      '@vitejs/plugin-react',
      'jotai',
      'react',
      'react-dom',
      'react-router',
      'react-router-dom',
      'tailwindcss',
      'vite',
    ])
    expectNestedJsonKeyOrder(`${packageJsonStrategyLabel} vue-full`, vuePackageJson, 'devDependencies', [
      '@antfu/eslint-config',
      '@commitlint/cli',
      '@commitlint/config-conventional',
      '@vue/tsconfig',
      'eslint',
      'husky',
      'less',
      'lint-staged',
      'typescript',
    ])
  })

  it('renders tsconfig templates with JSONC lint-preferred key order', async () => {
    const rootTsConfig = parseRenderedJson(
      rootTsConfigTemplateRelativePath,
      await renderTemplate(rootTsConfigTemplateRelativePath, reactPresetProjectConfig),
    )
    const reactAppTsConfig = parseRenderedJson(
      `${appTsConfigTemplateRelativePath} react`,
      await renderTemplate(appTsConfigTemplateRelativePath, reactPresetProjectConfig),
    )
    const vueAppTsConfig = parseRenderedJson(
      `${appTsConfigTemplateRelativePath} vue`,
      await renderTemplate(appTsConfigTemplateRelativePath, vuePresetProjectConfig),
    )
    const nodeTsConfig = parseRenderedJson(
      nodeTsConfigTemplateRelativePath,
      await renderTemplate(nodeTsConfigTemplateRelativePath, reactPresetProjectConfig),
    )

    expectJsonKeyOrder(rootTsConfigTemplateRelativePath, rootTsConfig, ['references', 'files'])
    expectJsonKeyOrder(`${appTsConfigTemplateRelativePath} react`, reactAppTsConfig, ['compilerOptions', 'include'])
    expectNestedJsonKeyOrder(`${appTsConfigTemplateRelativePath} react`, reactAppTsConfig, 'compilerOptions', [
      'tsBuildInfoFile',
      'target',
      'jsx',
      'lib',
      'moduleDetection',
      'useDefineForClassFields',
      'module',
      'moduleResolution',
      'allowImportingTsExtensions',
      'strict',
      'noFallthroughCasesInSwitch',
      'noUnusedLocals',
      'noUnusedParameters',
      'noEmit',
      'verbatimModuleSyntax',
      'erasableSyntaxOnly',
      'skipLibCheck',
      'noUncheckedSideEffectImports',
    ])
    expectJsonKeyOrder(`${appTsConfigTemplateRelativePath} vue`, vueAppTsConfig, ['extends', 'compilerOptions', 'include'])
    expectNestedJsonKeyOrder(`${appTsConfigTemplateRelativePath} vue`, vueAppTsConfig, 'compilerOptions', [
      'tsBuildInfoFile',
      'strict',
      'noFallthroughCasesInSwitch',
      'noUnusedLocals',
      'noUnusedParameters',
      'erasableSyntaxOnly',
      'noUncheckedSideEffectImports',
    ])
    expectJsonKeyOrder(nodeTsConfigTemplateRelativePath, nodeTsConfig, ['compilerOptions', 'include'])
    expectNestedJsonKeyOrder(nodeTsConfigTemplateRelativePath, nodeTsConfig, 'compilerOptions', [
      'tsBuildInfoFile',
      'target',
      'lib',
      'moduleDetection',
      'module',
      'moduleResolution',
      'allowImportingTsExtensions',
      'strict',
      'noFallthroughCasesInSwitch',
      'noUnusedLocals',
      'noUnusedParameters',
      'noEmit',
      'verbatimModuleSyntax',
      'erasableSyntaxOnly',
      'skipLibCheck',
      'noUncheckedSideEffectImports',
    ])
  })

  it('does not hide generated JSON ordering with broad JSONC lint overrides', () => {
    const eslintConfigTemplate = readFileSync(
      path.join(templateRoot, eslintConfigTemplateRelativePath),
      'utf8',
    )

    expect(
      eslintConfigTemplate,
      'generated ESLint config must not disable jsonc/sort-keys broadly for package.json or tsconfig output',
    ).not.toContain('jsonc/sort-keys')
  })
})
