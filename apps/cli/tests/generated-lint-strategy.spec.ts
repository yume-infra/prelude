import type { ProjectConfig, ReactProjectConfig } from '../src/schema/project-config'
import type { TemplateRegistryEntry } from '../src/schema/template-registry'
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
import { reactCustomProjectConfig, reactPresetProjectConfig } from './support/fixtures'
import { makeFsMockLayer, makeTemplateEngineMockLayer } from './support/mock-layers'

const testsDir = path.dirname(fileURLToPath(import.meta.url))
const templateRoot = path.resolve(testsDir, '../templates')
const partialRoot = path.join(templateRoot, 'partials')
const routerTemplateRelativePath = 'fragments/react/router.ts.hbs'
const routerStrategyLabel = `React Router static-import strategy (${routerTemplateRelativePath})`

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
      'import App from \'../pages/app\'',
      'import Home from \'../pages/home\'',
      'import About from \'../pages/about\'',
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
      'import Home from \'../pages/home\'',
      'import About from \'../pages/about\'',
      'import App from \'../pages/app\'',
      'const rootRoute = createRootRoute({',
      'export const routeTree = rootRoute.addChildren([',
      'const router = createRouter({ routeTree })',
      'export default router',
    ])
    expect(output, 'TanStack Router branch must not switch to React Router semantics').not.toContain('createBrowserRouter')
  })
})
