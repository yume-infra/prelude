import type { ProjectConfig } from '../src/schema/project-config'
import { readFileSync } from 'node:fs'
import { Effect, Layer, LogLevel, Option } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeTemplatePath } from '../src/brand/template-path'
import { AppConfig } from '../src/config/app-config'
import {
  buildPackageJson,
  buildPackageManifestJson,
  getPackageManifestContributions,
} from '../src/core/modifier/package-json'
import { packageManifestTargetPath } from '../src/core/modifier/package-manifest-contributions'
import {
  contributionTrace,
  ContributionUnitKind,
  FrontendPackageOwner,
} from '../src/core/ownership/model'
import { buildTemplates } from '../src/core/services/compose'
import { PlanService, toPlanSpec } from '../src/core/services/planner'
import { buildRootSvg } from '../src/core/template-registry/root-svg'
import { buildWorkspacePackages } from '../src/core/workspace-packages'
import { isFrontendProject } from '../src/utils/type-guard'
import {
  cliEffectPresetProjectConfig,
  cliMinimalPresetProjectConfig,
  nodeMinimalPresetProjectConfig,
  reactCustomProjectConfig,
  reactPresetProjectConfig,
  vueCustomProjectConfig,
  vuePresetProjectConfig,
  workspaceMixedProjectConfig,
} from './support/fixtures'
import { makeFsMockLayer, makeTemplateEngineMockLayer } from './support/mock-layers'

const templateRoot = makeTemplatePath('/virtual/templates')
const plannerSource = readFileSync(new URL('../src/core/services/planner.ts', import.meta.url), 'utf8')
const planBuildSource = readFileSync(new URL('../src/core/services/plan/build.ts', import.meta.url), 'utf8')
const planApplySource = readFileSync(new URL('../src/core/services/plan/apply.ts', import.meta.url), 'utf8')
const frontendPackageJsonMutation = contributionTrace(FrontendPackageOwner, ContributionUnitKind.JsonTextMutation)

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
      if (isFrontendProject(config)) {
        buildRootSvg(dsl, templateRoot)
      }
      buildPackageJson(dsl, config)
      buildTemplates(dsl, templateRoot, config)
      if (config.type === 'workspace-root') {
        buildWorkspacePackages(dsl, templateRoot, config)
      }
    })

    return toPlanSpec(plan)
  }).pipe(Effect.provide(plannerLayer))
}

function buildNestedFrontendPackagePlanSpec() {
  return Effect.gen(function* () {
    const planner = yield* PlanService
    const packageTargetPath = packageManifestTargetPath('apps/web')
    const plan = yield* planner.build((dsl) => {
      buildPackageManifestJson(dsl, {
        targetPath: packageTargetPath,
        targetScope: 'package',
        base: () => ({
          name: '@demo/web',
          type: 'module',
          version: '0.0.0',
          scripts: {},
          dependencies: {},
          devDependencies: {},
        }),
        contributions: getPackageManifestContributions(reactPresetProjectConfig),
        ownership: frontendPackageJsonMutation,
      })
      buildTemplates(dsl, templateRoot, reactPresetProjectConfig, {
        targetScope: 'package',
        targetDirectory: 'apps/web',
      })
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
    ['node minimal preset', nodeMinimalPresetProjectConfig],
    ['cli minimal preset', cliMinimalPresetProjectConfig],
  ] as const)('builds a deterministic plan for %s', async (_name, config) => {
    const planSpec = await Effect.runPromise(buildPlanSpec(config))

    expect(planSpec).toMatchSnapshot()
  })
})

describe('standalone node runtime scaffold families', () => {
  it('traces node and cli package mutations through scaffold-family ownership', async () => {
    const nodePlan = await Effect.runPromise(buildPlanSpec(nodeMinimalPresetProjectConfig))
    const cliPlan = await Effect.runPromise(buildPlanSpec(cliMinimalPresetProjectConfig))
    const nodePackageJsonTask = nodePlan.tasks.find(task => task.kind === 'json' && task.path === 'package.json')
    const cliPackageJsonTask = cliPlan.tasks.find(task => task.kind === 'json' && task.path === 'package.json')

    expect(nodePackageJsonTask?.kind).toBe('json')
    expect(cliPackageJsonTask?.kind).toBe('json')
    if (nodePackageJsonTask?.kind !== 'json' || cliPackageJsonTask?.kind !== 'json') {
      throw new Error('package.json task was not a json task')
    }

    expect(nodePackageJsonTask.reducers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ownership: {
            owner: 'node-scaffold',
            unit: 'json-text-mutation',
          },
        }),
      ]),
    )
    expect(cliPackageJsonTask.reducers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ownership: {
            owner: 'cli-scaffold',
            unit: 'json-text-mutation',
          },
        }),
      ]),
    )
  })

  it('plans node and cli templates without frontend assets', async () => {
    const nodePlan = await Effect.runPromise(buildPlanSpec(nodeMinimalPresetProjectConfig))
    const cliPlan = await Effect.runPromise(buildPlanSpec(cliMinimalPresetProjectConfig))

    expect(nodePlan.tasks).toContainEqual(expect.objectContaining({
      kind: 'render',
      path: 'src/index.ts',
      ownership: {
        owner: 'node-scaffold',
        unit: 'fragment-render',
      },
    }))
    expect(cliPlan.tasks).toContainEqual(expect.objectContaining({
      kind: 'render',
      path: 'scripts/ensure-shebang.mjs',
      ownership: {
        owner: 'cli-scaffold',
        unit: 'fragment-render',
      },
    }))

    for (const plan of [nodePlan, cliPlan]) {
      expect(plan.tasks.some(task => task.path === 'public/moon-star.svg')).toBe(false)
      expect(plan.tasks.some(task => task.path === 'index.html')).toBe(false)
      expect(plan.tasks.some(task => task.path === 'vite.config.ts')).toBe(false)
    }
  })

  it('plans effect cli templates without changing the minimal cli entry template', async () => {
    const minimalPlan = await Effect.runPromise(buildPlanSpec(cliMinimalPresetProjectConfig))
    const effectPlan = await Effect.runPromise(buildPlanSpec(cliEffectPresetProjectConfig))

    expect(minimalPlan.tasks).toContainEqual(expect.objectContaining({
      kind: 'render',
      path: 'src/index.ts',
      src: '/virtual/templates/fragments/cli/index.ts.hbs',
    }))
    expect(effectPlan.tasks).toContainEqual(expect.objectContaining({
      kind: 'render',
      path: 'src/index.ts',
      src: '/virtual/templates/fragments/cli/effect-index.ts.hbs',
    }))
    expect(effectPlan.tasks).toContainEqual(expect.objectContaining({
      kind: 'render',
      path: 'README.md',
      src: '/virtual/templates/fragments/cli/effect-README.md.hbs',
    }))
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

  it('projects nested package paths while filtering root-only templates and manifest contributions', async () => {
    const plan = await Effect.runPromise(buildNestedFrontendPackagePlanSpec())
    const packageJsonTask = plan.tasks.find(task => task.kind === 'json' && task.path === 'apps/web/package.json')
    const paths = plan.tasks.map(task => task.path)

    expect(paths).toEqual([
      'apps/web/package.json',
      'apps/web/index.html',
      'apps/web/vite.config.ts',
      'apps/web/tsconfig.json',
      'apps/web/tsconfig.node.json',
      'apps/web/tsconfig.app.json',
      'apps/web/src/vite-env.d.ts',
      'apps/web/README.md',
      'apps/web/src/style.less',
      'apps/web/src/pages/app.tsx',
      'apps/web/src/pages/about.tsx',
      'apps/web/src/pages/home.tsx',
      'apps/web/src/components/Counter.tsx',
      'apps/web/src/stores/counter.ts',
      'apps/web/src/main.tsx',
      'apps/web/src/router/index.tsx',
    ])
    expect(paths).not.toContain('apps/web/eslint.config.mjs')
    expect(paths).not.toContain('apps/web/.gitignore')
    expect(paths).not.toContain('apps/web/commitlint.config.ts')
    expect(packageJsonTask).toMatchObject({
      kind: 'json',
      ownership: {
        owner: 'frontend-package',
        unit: 'json-text-mutation',
      },
    })
    expect(packageJsonTask?.kind).toBe('json')
    if (packageJsonTask?.kind !== 'json') {
      throw new Error('nested package.json task was not a json task')
    }

    expect(packageJsonTask.reducers).toEqual(
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
        expect.objectContaining({
          ownership: {
            owner: 'state-management',
            unit: 'json-text-mutation',
          },
        }),
        expect.objectContaining({
          ownership: {
            owner: 'router',
            unit: 'json-text-mutation',
          },
        }),
      ]),
    )
    expect(packageJsonTask.reducers).not.toEqual(
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

  it('plans mixed workspace packages under apps and libs with explicit internal dependency links', async () => {
    const plan = await Effect.runPromise(buildPlanSpec(workspaceMixedProjectConfig))
    const paths = plan.tasks.map(task => task.path)

    expect(paths).toContain('package.json')
    expect(paths).toContain('pnpm-workspace.yaml')
    expect(paths).toContain('turbo.json')
    expect(paths).toContain('apps/web/package.json')
    expect(paths).toContain('apps/web/index.html')
    expect(paths).toContain('apps/web/public/moon-star.svg')
    expect(paths).toContain('apps/tool/package.json')
    expect(paths).toContain('apps/tool/src/index.ts')
    expect(paths).toContain('apps/tool/scripts/ensure-shebang.mjs')
    expect(paths).toContain('libs/shared/package.json')
    expect(paths).toContain('libs/shared/src/index.ts')

    expect(paths).not.toContain('apps/web/.gitignore')
    expect(paths).not.toContain('apps/tool/.gitignore')
    expect(paths).not.toContain('libs/shared/.gitignore')

    const webPackageJsonTask = plan.tasks.find(task => task.kind === 'json' && task.path === 'apps/web/package.json')
    const toolPackageJsonTask = plan.tasks.find(task => task.kind === 'json' && task.path === 'apps/tool/package.json')
    const sharedPackageJsonTask = plan.tasks.find(task => task.kind === 'json' && task.path === 'libs/shared/package.json')

    expect(webPackageJsonTask).toMatchObject({
      ownership: {
        owner: 'frontend-package',
        unit: 'json-text-mutation',
      },
      base: {
        name: '@demo/web',
      },
    })
    expect(toolPackageJsonTask).toMatchObject({
      ownership: {
        owner: 'cli-package',
        unit: 'json-text-mutation',
      },
      base: {
        name: '@demo/tool',
      },
    })
    expect(sharedPackageJsonTask).toMatchObject({
      ownership: {
        owner: 'library-package',
        unit: 'json-text-mutation',
      },
      base: {
        name: '@demo/shared',
      },
    })
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
