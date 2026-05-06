import type { Plan } from '../../src/core/services/planner'
import { Effect, Exit, Layer, LogLevel, Option } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeTargetDir } from '../../src/brand/target-dir'
import { makeTemplatePath } from '../../src/brand/template-path'
import { AppConfig } from '../../src/config/app-config'
import { FileIOError } from '../../src/core/errors'
import { buildPackageJson, collectPackageManifestForConfig } from '../../src/core/modifier/package-json'
import { buildTemplates } from '../../src/core/services/compose'
import { PlanService, toPlanSpec } from '../../src/core/services/planner'
import { workspaceRootPackageGlobs } from '../../src/core/workspace-bootstrap'
import { workspaceMixedProjectConfig, workspaceRootMinimalProjectConfig } from '../support/fixtures'
import { makeFsMockLayer, makeTemplateEngineMockLayer } from '../support/mock-layers'

const templateRoot = makeTemplatePath('/virtual/templates')

function renderWorkspaceTemplate(templatePath: string) {
  if (templatePath.endsWith('pnpm-workspace.yaml.hbs')) {
    return 'packages:\n  - apps/*\n  - libs/*\n'
  }

  if (templatePath.endsWith('turbo.json.hbs')) {
    return '{\n  "tasks": {}\n}\n'
  }

  if (templatePath.endsWith('knip.jsonc.hbs')) {
    return '{\n  "$schema": "https://unpkg.com/knip@6/schema-jsonc.json"\n}\n'
  }

  return ''
}

function buildWorkspaceRootPlan(): Effect.Effect<Plan, never, PlanService> {
  return Effect.gen(function* () {
    const planner = yield* PlanService
    return yield* planner.build((dsl) => {
      buildPackageJson(dsl, workspaceRootMinimalProjectConfig)
      buildTemplates(dsl, templateRoot, workspaceRootMinimalProjectConfig)
    })
  })
}

function makePlannerLayer(options: {
  readonly existingPaths?: Set<string>
  readonly writes?: Array<{ readonly path: string, readonly content: string }>
  readonly directories?: string[]
  readonly removes?: string[]
  readonly failPackageJsonWrite?: string
} = {}) {
  const existingPaths = options.existingPaths ?? new Set<string>()

  return PlanService.DefaultWithoutDependencies.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        Layer.succeed(AppConfig, AppConfig.make({
          logLevel: LogLevel.Debug,
          defaultConcurrency: 1,
          tracingEndpoint: Option.none(),
          debug: false,
        })),
        makeFsMockLayer({
          exists: path => Effect.succeed(existingPaths.has(path)),
          makeDirectory: path =>
            Effect.sync(() => {
              existingPaths.add(path)
              options.directories?.push(path)
            }),
          writeFileString: (path, content) => {
            if (path === options.failPackageJsonWrite) {
              return Effect.fail(new FileIOError({
                op: 'write',
                path,
                message: 'forced workspace root package write failure',
              }))
            }

            return Effect.sync(() => {
              existingPaths.add(path)
              options.writes?.push({ path, content })
            })
          },
          remove: path =>
            Effect.sync(() => {
              existingPaths.delete(path)
              options.removes?.push(path)
            }),
        }),
        makeTemplateEngineMockLayer({
          render: templatePath => Effect.succeed(renderWorkspaceTemplate(templatePath)),
        }),
      ),
    ),
  )
}

describe('workspace root materialization', () => {
  it('plans root package, pnpm workspace, and turbo files without child packages', async () => {
    const plan = await Effect.runPromise(
      buildWorkspaceRootPlan().pipe(Effect.provide(makePlannerLayer())),
    )
    const planSpec = toPlanSpec(plan)

    expect(planSpec.tasks.map(task => task.path)).toEqual([
      'package.json',
      'pnpm-workspace.yaml',
      'turbo.json',
      'knip.jsonc',
    ])
    expect(planSpec.tasks).toContainEqual(expect.objectContaining({
      kind: 'render',
      path: 'pnpm-workspace.yaml',
      ownership: {
        owner: 'workspace-bootstrap',
        unit: 'fragment-render',
      },
    }))
    expect(planSpec.tasks).toContainEqual(expect.objectContaining({
      kind: 'json',
      path: 'package.json',
      ownership: {
        owner: 'workspace-bootstrap',
        unit: 'json-text-mutation',
      },
    }))

    const manifest = collectPackageManifestForConfig(workspaceRootMinimalProjectConfig).manifest
    expect(manifest).toMatchObject({
      name: workspaceRootMinimalProjectConfig.name,
      private: true,
      packageManager: 'pnpm@10.12.4',
      scripts: {
        knip: 'knip',
        verify: 'pnpm knip',
      },
      devDependencies: {
        knip: '^6.12.0',
        turbo: '^2.9.6',
      },
    })
    expect(workspaceRootPackageGlobs).toEqual(['apps/*', 'libs/*'])
    expect(manifest).not.toHaveProperty('dependencies')
  })

  it('plans only root scripts that correspond to emitted workspace package scripts', () => {
    const manifest = collectPackageManifestForConfig(workspaceMixedProjectConfig).manifest

    expect(manifest.scripts).toEqual({
      build: 'turbo run build',
      dev: 'turbo run dev',
      knip: 'knip',
      typecheck: 'turbo run typecheck',
      verify: 'pnpm build && pnpm typecheck && pnpm knip',
    })
  })

  it('applies the minimal workspace root plan as root-level files', async () => {
    const writes: Array<{ path: string, content: string }> = []
    const directories: string[] = []
    const baseDir = makeTargetDir('/tmp/create-yume-workspace-root-apply')

    await Effect.runPromise(
      Effect.gen(function* () {
        const planner = yield* PlanService
        const plan = yield* buildWorkspaceRootPlan()
        yield* planner.apply(plan, baseDir, workspaceRootMinimalProjectConfig)
      }).pipe(Effect.provide(makePlannerLayer({ writes, directories }))),
    )

    expect(directories).toEqual([baseDir])
    expect(writes.map(write => write.path)).toEqual([
      `${baseDir}/pnpm-workspace.yaml`,
      `${baseDir}/turbo.json`,
      `${baseDir}/knip.jsonc`,
      `${baseDir}/package.json`,
    ])
    expect(writes.find(write => write.path.endsWith('pnpm-workspace.yaml'))?.content).toBe(
      'packages:\n  - apps/*\n  - libs/*\n',
    )

    const packageJson = JSON.parse(
      writes.find(write => write.path.endsWith('package.json'))?.content ?? '{}',
    ) as Record<string, unknown>
    expect(packageJson).toMatchObject({
      private: true,
      packageManager: 'pnpm@10.12.4',
      scripts: {
        knip: 'knip',
        verify: 'pnpm knip',
      },
      devDependencies: {
        knip: '^6.12.0',
        turbo: '^2.9.6',
      },
    })
  })

  it('rolls back generated workspace root files when root package writing fails', async () => {
    const writes: Array<{ path: string, content: string }> = []
    const removes: string[] = []
    const baseDir = makeTargetDir('/tmp/create-yume-workspace-root-rollback')
    const packageJsonPath = `${baseDir}/package.json`

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const planner = yield* PlanService
        const plan = yield* buildWorkspaceRootPlan()
        yield* planner.apply(plan, baseDir, workspaceRootMinimalProjectConfig)
      }).pipe(Effect.provide(makePlannerLayer({
        writes,
        removes,
        failPackageJsonWrite: packageJsonPath,
      }))),
    )

    expect(Exit.isFailure(exit)).toBe(true)
    expect(writes.map(write => write.path)).toEqual([
      `${baseDir}/pnpm-workspace.yaml`,
      `${baseDir}/turbo.json`,
      `${baseDir}/knip.jsonc`,
    ])
    expect(removes).toEqual([
      `${baseDir}/knip.jsonc`,
      `${baseDir}/turbo.json`,
      `${baseDir}/pnpm-workspace.yaml`,
      baseDir,
    ])
  })
})
