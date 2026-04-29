import { Effect, Layer, LogLevel, Option } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeTargetDir } from '../../../src/brand/target-dir'
import { AppConfig } from '../../../src/config/app-config'
import { OrchestratorService } from '../../../src/core/services/orchestrator'
import { PlanService } from '../../../src/core/services/planner'
import { reactPresetProjectConfig } from '../../support/fixtures'
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
          makeTargetDir('/tmp/create-yume-orchestrator-build-only'),
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
          makeTargetDir('/tmp/create-yume-orchestrator-execute'),
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
})
