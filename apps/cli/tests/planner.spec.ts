import type { ProjectConfig } from '../src/schema/project-config'
import { readFileSync } from 'node:fs'
import { Effect, Layer, LogLevel, Option } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeTemplatePath } from '../src/brand/template-path'
import { AppConfig } from '../src/config/app-config'
import { buildPackageJson } from '../src/core/modifier/package-json'
import { buildTemplates } from '../src/core/services/compose'
import { PlanService, toPlanSpec } from '../src/core/services/planner'
import { buildRootSvg } from '../src/core/template-registry/root-svg'
import {
  reactCustomProjectConfig,
  reactPresetProjectConfig,
  vueCustomProjectConfig,
  vuePresetProjectConfig,
} from './support/fixtures'
import { makeFsMockLayer, makeTemplateEngineMockLayer } from './support/mock-layers'

const templateRoot = makeTemplatePath('/virtual/templates')
const plannerSource = readFileSync(new URL('../src/core/services/planner.ts', import.meta.url), 'utf8')
const planBuildSource = readFileSync(new URL('../src/core/services/plan/build.ts', import.meta.url), 'utf8')
const planApplySource = readFileSync(new URL('../src/core/services/plan/apply.ts', import.meta.url), 'utf8')

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

function buildPlanSpec(config: ProjectConfig) {
  return Effect.gen(function* () {
    const planner = yield* PlanService
    const plan = yield* planner.build((dsl) => {
      buildRootSvg(dsl, templateRoot)
      buildPackageJson(dsl, config)
      buildTemplates(dsl, templateRoot, config)
    })

    return toPlanSpec(plan)
  }).pipe(Effect.provide(plannerLayer))
}

describe('planner public boundary', () => {
  it('keeps PlanService as a stable build/apply facade over internal plan modules', () => {
    expect(plannerSource).toContain('import { applyPlan } from \'./plan/apply\'')
    expect(plannerSource).toContain('import { buildPlan } from \'./plan/build\'')
    expect(plannerSource).toContain('export { toPlanSpec } from \'./plan/build\'')
    expect(plannerSource).toContain('export { projectPlanSpec } from \'./plan/build\'')
    expect(plannerSource).toContain('const build: PlanServiceShape[\'build\']')
    expect(plannerSource).toContain('const apply: PlanServiceShape[\'apply\']')
    expect(plannerSource).toContain('buildPlan(program)')
    expect(plannerSource).toContain('applyPlan(')

    expect(plannerSource).not.toContain('function annotateOperation')
    expect(plannerSource).not.toContain('function registerRollbackFinalizer')
    expect(planBuildSource).toContain('function annotateOperation')
    expect(planBuildSource).toContain('export function buildPlan')
    expect(planBuildSource).toContain('export function toPlanSpec')
    expect(planApplySource).toContain('function registerRollbackFinalizer')
    expect(planApplySource).toContain('export function applyPlan')
  })
})

describe('planner snapshots', () => {
  it.each([
    ['react preset', reactPresetProjectConfig],
    ['vue preset', vuePresetProjectConfig],
    ['react custom', reactCustomProjectConfig],
    ['vue custom', vueCustomProjectConfig],
  ] as const)('builds a deterministic plan for %s', async (_name, config) => {
    const planSpec = await Effect.runPromise(buildPlanSpec(config))

    expect(planSpec).toMatchSnapshot()
  })
})

describe('workspace bootstrap ownership boundaries', () => {
  it('traces workspace-owned package mutations through reducer ownership', async () => {
    const plan = await Effect.runPromise(buildPlanSpec(reactPresetProjectConfig))
    const packageJsonTask = plan.tasks.find(task => task.kind === 'json' && task.path === 'package.json')

    expect(packageJsonTask).toMatchObject({
      ownership: {
        owner: 'workspace-bootstrap',
        unit: 'json-text-mutation',
      },
    })
    expect(packageJsonTask?.kind).toBe('json')
    if (packageJsonTask?.kind !== 'json') {
      throw new Error('package.json task was not a json task')
    }

    expect(packageJsonTask.reducers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ownership: {
            owner: 'workspace-bootstrap',
            unit: 'json-text-mutation',
          },
        }),
      ]),
    )
  })
})

describe('state management ownership boundaries', () => {
  it('routes store file renders through the state-management capability owner', async () => {
    const reactPlan = await Effect.runPromise(buildPlanSpec(reactPresetProjectConfig))
    const vuePlan = await Effect.runPromise(buildPlanSpec(vuePresetProjectConfig))

    expect(reactPlan.tasks).toContainEqual(expect.objectContaining({
      kind: 'render',
      path: 'src/stores/counter.ts',
      ownership: {
        owner: 'state-management',
        unit: 'fragment-render',
      },
    }))

    expect(vuePlan.tasks).toContainEqual(expect.objectContaining({
      kind: 'render',
      path: 'src/stores/counter.ts',
      ownership: {
        owner: 'state-management',
        unit: 'fragment-render',
      },
    }))
  })

  it('omits store renders when state management is disabled', async () => {
    const reactPlan = await Effect.runPromise(buildPlanSpec({
      ...reactPresetProjectConfig,
      stateManagement: 'none',
    }))
    const vuePlan = await Effect.runPromise(buildPlanSpec({
      ...vuePresetProjectConfig,
      stateManagement: false,
    }))

    expect(reactPlan.tasks.some(task => task.path === 'src/stores/counter.ts')).toBe(false)
    expect(vuePlan.tasks.some(task => task.path === 'src/stores/counter.ts')).toBe(false)
  })
})

describe('scaffold-family shared frontend policy', () => {
  it('traces scaffold-owned package contributions through reducer ownership', async () => {
    const reactPlan = await Effect.runPromise(buildPlanSpec(reactPresetProjectConfig))
    const vuePlan = await Effect.runPromise(buildPlanSpec(vuePresetProjectConfig))
    const reactPackageJsonTask = reactPlan.tasks.find(task => task.kind === 'json' && task.path === 'package.json')
    const vuePackageJsonTask = vuePlan.tasks.find(task => task.kind === 'json' && task.path === 'package.json')

    expect(reactPackageJsonTask?.kind).toBe('json')
    expect(vuePackageJsonTask?.kind).toBe('json')
    if (reactPackageJsonTask?.kind !== 'json' || vuePackageJsonTask?.kind !== 'json') {
      throw new Error('package.json task was not a json task')
    }

    expect(reactPackageJsonTask.reducers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ownership: {
            owner: 'frontend-scaffold',
            unit: 'json-text-mutation',
          },
        }),
        expect.objectContaining({
          ownership: {
            owner: 'react-scaffold',
            unit: 'json-text-mutation',
          },
        }),
      ]),
    )
    expect(vuePackageJsonTask.reducers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ownership: {
            owner: 'frontend-scaffold',
            unit: 'json-text-mutation',
          },
        }),
        expect.objectContaining({
          ownership: {
            owner: 'vue-scaffold',
            unit: 'json-text-mutation',
          },
        }),
      ]),
    )
  })

  it('omits vite-owned files when the build tool is disabled', async () => {
    const reactPlan = await Effect.runPromise(buildPlanSpec({
      ...reactPresetProjectConfig,
      buildTool: 'none',
    }))
    const vuePlan = await Effect.runPromise(buildPlanSpec({
      ...vuePresetProjectConfig,
      buildTool: 'none',
    }))

    for (const plan of [reactPlan, vuePlan]) {
      expect(plan.tasks.some(task => task.path === 'vite.config.ts')).toBe(false)
      expect(plan.tasks.some(task => task.path === 'src/vite-env.d.ts')).toBe(false)
      expect(plan.tasks.some(task => task.path === 'tsconfig.node.json')).toBe(false)
    }
  })
})
