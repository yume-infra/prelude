import { Effect, Layer, LogLevel, Option } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeTargetDir } from '../../../src/brand/target-dir'
import { AppConfig } from '../../../src/config/app-config'
import { OrchestratorService } from '../../../src/core/services/orchestrator'
import { PlanService } from '../../../src/core/services/planner'
import { reactPresetProjectConfig, workspaceMixedProjectConfig } from '../../support/fixtures'
import { makeFsMockLayer, makeTemplateEngineMockLayer } from '../../support/mock-layers'

function makeOrchestratorLayer({
  copiedPaths = [],
  directories = [],
  preparedConfigs = [],
  writtenPaths = [],
}: {
  readonly copiedPaths?: string[]
  readonly directories?: string[]
  readonly preparedConfigs?: string[]
  readonly writtenPaths?: string[]
} = {}) {
  const appConfigLayer = Layer.succeed(AppConfig, AppConfig.make({
    logLevel: LogLevel.Debug,
    defaultConcurrency: 1,
    tracingEndpoint: Option.none(),
    debug: false,
  }))

  const fsLayer = makeFsMockLayer({
    copyFile: (_src, dest) => Effect.sync(() => {
      copiedPaths.push(dest)
    }),
    makeDirectory: path => Effect.sync(() => {
      directories.push(path)
    }),
    writeFileString: path => Effect.sync(() => {
      writtenPaths.push(path)
    }),
  })

  const templateLayer = makeTemplateEngineMockLayer({
    prepare: config => Effect.sync(() => {
      preparedConfigs.push(config.name)
    }),
  })

  const planLayer = PlanService.DefaultWithoutDependencies.pipe(
    Layer.provideMerge(Layer.mergeAll(appConfigLayer, fsLayer, templateLayer)),
  )

  return OrchestratorService.DefaultWithoutDependencies.pipe(
    Layer.provideMerge(Layer.mergeAll(planLayer, templateLayer)),
  )
}

describe('orchestratorService', () => {
  it('builds a plan without applying filesystem side effects', async () => {
    const copiedPaths: string[] = []
    const directories: string[] = []
    const preparedConfigs: string[] = []
    const writtenPaths: string[] = []

    const plan = await Effect.runPromise(
      Effect.gen(function* () {
        const orchestrator = yield* OrchestratorService
        return yield* orchestrator.build(
          makeTargetDir('/tmp/prelude-orchestrator-build-only'),
          reactPresetProjectConfig,
        )
      }).pipe(Effect.provide(makeOrchestratorLayer({
        copiedPaths,
        directories,
        preparedConfigs,
        writtenPaths,
      }))),
    )

    expect(plan.tasks.length).toBeGreaterThan(0)
    expect(preparedConfigs).toEqual([reactPresetProjectConfig.name])
    expect(copiedPaths).toEqual([])
    expect(directories).toEqual([])
    expect(writtenPaths).toEqual([])
  })

  it('keeps execute as the build-then-apply path', async () => {
    const copiedPaths: string[] = []
    const directories: string[] = []
    const preparedConfigs: string[] = []
    const writtenPaths: string[] = []

    const plan = await Effect.runPromise(
      Effect.gen(function* () {
        const orchestrator = yield* OrchestratorService
        return yield* orchestrator.execute(
          makeTargetDir('/tmp/prelude-orchestrator-execute'),
          reactPresetProjectConfig,
        )
      }).pipe(Effect.provide(makeOrchestratorLayer({
        copiedPaths,
        directories,
        preparedConfigs,
        writtenPaths,
      }))),
    )

    expect(plan.tasks.length).toBeGreaterThan(0)
    expect(preparedConfigs).toEqual([reactPresetProjectConfig.name])
    expect([...copiedPaths, ...writtenPaths].length).toBeGreaterThan(0)
    expect(directories.length).toBeGreaterThan(0)
  })

  it('materializes mixed workspace child package manifests with explicit workspace dependencies', async () => {
    const writtenFiles = new Map<string, string>()
    const preparedConfigs: string[] = []

    const appConfigLayer = Layer.succeed(AppConfig, AppConfig.make({
      logLevel: LogLevel.Debug,
      defaultConcurrency: 1,
      tracingEndpoint: Option.none(),
      debug: false,
    }))
    const fsLayer = makeFsMockLayer({
      writeFileString: (file, content) => Effect.sync(() => {
        writtenFiles.set(file, content)
      }),
    })
    const templateLayer = makeTemplateEngineMockLayer({
      prepare: config => Effect.sync(() => {
        preparedConfigs.push(config.name)
      }),
      render: (_templatePath, _data, config) => Effect.succeed(`rendered:${config.type}:${config.name}\n`),
    })
    const planLayer = PlanService.DefaultWithoutDependencies.pipe(
      Layer.provideMerge(Layer.mergeAll(appConfigLayer, fsLayer, templateLayer)),
    )
    const orchestratorLayer = OrchestratorService.DefaultWithoutDependencies.pipe(
      Layer.provideMerge(Layer.mergeAll(planLayer, templateLayer)),
    )

    await Effect.runPromise(
      Effect.gen(function* () {
        const orchestrator = yield* OrchestratorService
        return yield* orchestrator.execute(
          makeTargetDir('/tmp/prelude-mixed-workspace'),
          workspaceMixedProjectConfig,
        )
      }).pipe(Effect.provide(orchestratorLayer)),
    )

    expect(preparedConfigs).toEqual([
      'workspace-mixed-fixture',
      'web',
      'tool',
      'shared',
    ])

    const webPackageJson = JSON.parse(writtenFiles.get('/tmp/prelude-mixed-workspace/apps/web/package.json') ?? '{}')
    const toolPackageJson = JSON.parse(writtenFiles.get('/tmp/prelude-mixed-workspace/apps/tool/package.json') ?? '{}')
    const sharedPackageJson = JSON.parse(writtenFiles.get('/tmp/prelude-mixed-workspace/libs/shared/package.json') ?? '{}')

    expect(webPackageJson.dependencies).toMatchObject({
      '@demo/shared': 'workspace:*',
      'react': '^19.2.6',
    })
    expect(toolPackageJson.dependencies).toEqual({
      '@demo/shared-runtime': 'workspace:*',
      '@effect/cli': '^0.75.1',
      '@effect/platform': '^0.96.1',
      '@effect/platform-node': '^0.106.0',
      '@effect/printer': '^0.49.0',
      '@effect/printer-ansi': '^0.49.0',
      'effect': '^3.21.2',
    })
    expect(sharedPackageJson.dependencies).toEqual({})
    expect(writtenFiles.get('/tmp/prelude-mixed-workspace/apps/web/index.html')).toBe('rendered:react:web\n')
    expect(writtenFiles.get('/tmp/prelude-mixed-workspace/apps/tool/src/index.ts')).toBe('rendered:cli:tool\n')
    expect(writtenFiles.get('/tmp/prelude-mixed-workspace/libs/shared/src/index.ts')).toBe('rendered:library:shared\n')
  })
})
