import type { Plan } from '../src/core/services/planner'
import { Effect, Exit, Layer, LogLevel, Option } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeTargetDir } from '../src/brand/target-dir'
import { makeTemplatePath } from '../src/brand/template-path'
import { AppConfig } from '../src/config/app-config'
import { FileIOError, PlanConflictError, PlanTargetPathError } from '../src/core/errors'
import { PlanService } from '../src/core/services/planner'
import { reactPresetProjectConfig } from './support/fixtures'
import { makeFsMockLayer, makeTemplateEngineMockLayer } from './support/mock-layers'

describe('planner rollback', () => {
  it('removes created files and directories when plan application fails', async () => {
    const existingPaths = new Set<string>()
    const writes: string[] = []
    const directories: string[] = []
    const removes: string[] = []
    const baseDir = makeTargetDir('/tmp/prelude-rollback')
    const okDir = `${baseDir}/nested`
    const okPath = `${okDir}/ok.txt`
    const failedPath = `${okDir}/fail.txt`

    const fsLayer = makeFsMockLayer({
      exists: path => Effect.succeed(existingPaths.has(path)),
      makeDirectory: path =>
        Effect.sync(() => {
          existingPaths.add(path)
          directories.push(path)
        }),
      writeFileString: (path, content) => {
        if (path === failedPath) {
          return Effect.fail(new FileIOError({
            op: 'write',
            path,
            message: 'forced write failure',
          }))
        }

        return Effect.sync(() => {
          existingPaths.add(path)
          writes.push(`${path}:${content}`)
        })
      },
      remove: path =>
        Effect.sync(() => {
          existingPaths.delete(path)
          removes.push(path)
        }),
    })

    const templateLayer = makeTemplateEngineMockLayer({
      render: (_templatePath, data) => Effect.succeed(String(data)),
    })

    const appConfigLayer = Layer.succeed(AppConfig, AppConfig.make({
      logLevel: LogLevel.Debug,
      defaultConcurrency: 1,
      tracingEndpoint: Option.none(),
      debug: false,
    }))

    const layer = PlanService.DefaultWithoutDependencies.pipe(
      Layer.provideMerge(Layer.mergeAll(appConfigLayer, fsLayer, templateLayer)),
    )

    const plan: Plan = {
      tasks: [
        { kind: 'render', src: makeTemplatePath('/tmp/ok.hbs'), path: 'nested/ok.txt', data: 'ok' },
        { kind: 'render', src: makeTemplatePath('/tmp/fail.hbs'), path: 'nested/fail.txt', data: 'fail' },
      ],
    }

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const planner = yield* PlanService
        yield* planner.apply(plan, baseDir, reactPresetProjectConfig)
      }).pipe(Effect.provide(layer)),
    )

    expect(Exit.isFailure(exit)).toBe(true)
    expect(directories).toEqual([baseDir, okDir])
    expect(writes).toEqual([`${okPath}:ok`])
    expect(removes).toEqual([okPath, okDir, baseDir])
  })

  it('keeps generated paths when rollback is disabled', async () => {
    const existingPaths = new Set<string>()
    const writes: string[] = []
    const directories: string[] = []
    const removes: string[] = []
    const baseDir = makeTargetDir('/tmp/prelude-no-rollback')
    const okDir = `${baseDir}/nested`
    const okPath = `${okDir}/ok.txt`
    const failedPath = `${okDir}/fail.txt`

    const fsLayer = makeFsMockLayer({
      exists: path => Effect.succeed(existingPaths.has(path)),
      makeDirectory: path =>
        Effect.sync(() => {
          existingPaths.add(path)
          directories.push(path)
        }),
      writeFileString: (path, content) => {
        if (path === failedPath) {
          return Effect.fail(new FileIOError({
            op: 'write',
            path,
            message: 'forced write failure',
          }))
        }

        return Effect.sync(() => {
          existingPaths.add(path)
          writes.push(`${path}:${content}`)
        })
      },
      remove: path =>
        Effect.sync(() => {
          existingPaths.delete(path)
          removes.push(path)
        }),
    })

    const templateLayer = makeTemplateEngineMockLayer({
      render: (_templatePath, data) => Effect.succeed(String(data)),
    })

    const appConfigLayer = Layer.succeed(AppConfig, AppConfig.make({
      logLevel: LogLevel.Debug,
      defaultConcurrency: 1,
      tracingEndpoint: Option.none(),
      debug: false,
    }))

    const layer = PlanService.DefaultWithoutDependencies.pipe(
      Layer.provideMerge(Layer.mergeAll(appConfigLayer, fsLayer, templateLayer)),
    )

    const plan: Plan = {
      tasks: [
        { kind: 'render', src: makeTemplatePath('/tmp/ok.hbs'), path: 'nested/ok.txt', data: 'ok' },
        { kind: 'render', src: makeTemplatePath('/tmp/fail.hbs'), path: 'nested/fail.txt', data: 'fail' },
      ],
    }

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const planner = yield* PlanService
        yield* planner.apply(plan, baseDir, reactPresetProjectConfig, { rollbackOnFailure: false })
      }).pipe(Effect.provide(layer)),
    )

    expect(Exit.isFailure(exit)).toBe(true)
    expect(directories).toEqual([baseDir, okDir])
    expect(writes).toEqual([`${okPath}:ok`])
    expect(removes).toEqual([])
    expect(existingPaths.has(baseDir)).toBe(true)
    expect(existingPaths.has(okDir)).toBe(true)
    expect(existingPaths.has(okPath)).toBe(true)
  })

  it('rejects duplicate target paths before plan application starts', async () => {
    const writes: string[] = []
    const directories: string[] = []
    const removes: string[] = []
    const baseDir = makeTargetDir('/tmp/prelude-duplicate-guard')

    const fsLayer = makeFsMockLayer({
      makeDirectory: path =>
        Effect.sync(() => {
          directories.push(path)
        }),
      writeFileString: (path, content) =>
        Effect.sync(() => {
          writes.push(`${path}:${content}`)
        }),
      remove: path =>
        Effect.sync(() => {
          removes.push(path)
        }),
    })

    const templateLayer = makeTemplateEngineMockLayer({
      render: (_templatePath, data) => Effect.succeed(String(data)),
    })

    const appConfigLayer = Layer.succeed(AppConfig, AppConfig.make({
      logLevel: LogLevel.Debug,
      defaultConcurrency: 1,
      tracingEndpoint: Option.none(),
      debug: false,
    }))

    const layer = PlanService.DefaultWithoutDependencies.pipe(
      Layer.provideMerge(Layer.mergeAll(appConfigLayer, fsLayer, templateLayer)),
    )

    const plan: Plan = {
      tasks: [
        { kind: 'render', src: makeTemplatePath('/tmp/first.hbs'), path: 'nested/shared.txt', data: 'first' },
        { kind: 'copy', src: makeTemplatePath('/tmp/second.hbs'), path: 'nested/shared.txt' },
      ],
    }

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const planner = yield* PlanService
        yield* planner.apply(plan, baseDir, reactPresetProjectConfig)
      }).pipe(Effect.provide(layer)),
    )

    expect(Exit.isFailure(exit)).toBe(true)
    expect(writes).toEqual([])
    expect(directories).toEqual([])
    expect(removes).toEqual([])

    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PlanConflictError)
      expect(exit.cause.error).toMatchObject({
        path: 'nested/shared.txt',
        taskKinds: ['render', 'copy'],
      })
    }
  })

  it.each([
    'package.json',
    'apps/web/package.json',
  ] as const)('rejects duplicate %s tasks instead of merging them at PlanService level', async (targetPath) => {
    const writes: string[] = []
    const directories: string[] = []
    const removes: string[] = []
    const baseDir = makeTargetDir('/tmp/prelude-duplicate-package-json')

    const fsLayer = makeFsMockLayer({
      makeDirectory: path =>
        Effect.sync(() => {
          directories.push(path)
        }),
      writeFileString: (path, content) =>
        Effect.sync(() => {
          writes.push(`${path}:${content}`)
        }),
      remove: path =>
        Effect.sync(() => {
          removes.push(path)
        }),
    })

    const templateLayer = makeTemplateEngineMockLayer()

    const appConfigLayer = Layer.succeed(AppConfig, AppConfig.make({
      logLevel: LogLevel.Debug,
      defaultConcurrency: 1,
      tracingEndpoint: Option.none(),
      debug: false,
    }))

    const layer = PlanService.DefaultWithoutDependencies.pipe(
      Layer.provideMerge(Layer.mergeAll(appConfigLayer, fsLayer, templateLayer)),
    )

    const plan: Plan = {
      tasks: [
        { kind: 'json', path: targetPath, reducers: [] },
        { kind: 'json', path: targetPath, reducers: [] },
      ],
    }

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const planner = yield* PlanService
        yield* planner.apply(plan, baseDir, reactPresetProjectConfig)
      }).pipe(Effect.provide(layer)),
    )

    expect(Exit.isFailure(exit)).toBe(true)
    expect(writes).toEqual([])
    expect(directories).toEqual([])
    expect(removes).toEqual([])

    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PlanConflictError)
      expect(exit.cause.error).toMatchObject({
        path: targetPath,
        taskKinds: ['json', 'json'],
      })
    }
  })

  it('rejects duplicate target paths after canonical normalization', async () => {
    const writes: string[] = []
    const directories: string[] = []
    const removes: string[] = []
    const baseDir = makeTargetDir('/tmp/prelude-canonical-duplicate')

    const fsLayer = makeFsMockLayer({
      makeDirectory: path =>
        Effect.sync(() => {
          directories.push(path)
        }),
      writeFileString: (path, content) =>
        Effect.sync(() => {
          writes.push(`${path}:${content}`)
        }),
      remove: path =>
        Effect.sync(() => {
          removes.push(path)
        }),
    })

    const templateLayer = makeTemplateEngineMockLayer({
      render: (_templatePath, data) => Effect.succeed(String(data)),
    })

    const appConfigLayer = Layer.succeed(AppConfig, AppConfig.make({
      logLevel: LogLevel.Debug,
      defaultConcurrency: 1,
      tracingEndpoint: Option.none(),
      debug: false,
    }))

    const layer = PlanService.DefaultWithoutDependencies.pipe(
      Layer.provideMerge(Layer.mergeAll(appConfigLayer, fsLayer, templateLayer)),
    )

    const plan: Plan = {
      tasks: [
        { kind: 'render', src: makeTemplatePath('/tmp/first.hbs'), path: 'src/../shared.txt', data: 'first' },
        { kind: 'copy', src: makeTemplatePath('/tmp/second.hbs'), path: 'shared.txt' },
      ],
    }

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const planner = yield* PlanService
        yield* planner.apply(plan, baseDir, reactPresetProjectConfig)
      }).pipe(Effect.provide(layer)),
    )

    expect(Exit.isFailure(exit)).toBe(true)
    expect(writes).toEqual([])
    expect(directories).toEqual([])
    expect(removes).toEqual([])

    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PlanConflictError)
      expect(exit.cause.error).toMatchObject({
        path: 'shared.txt',
        taskKinds: ['render', 'copy'],
      })
    }
  })

  it('rejects target paths that escape the project directory', async () => {
    const writes: string[] = []
    const directories: string[] = []
    const removes: string[] = []
    const baseDir = makeTargetDir('/tmp/prelude-path-boundary')

    const fsLayer = makeFsMockLayer({
      makeDirectory: path =>
        Effect.sync(() => {
          directories.push(path)
        }),
      writeFileString: (path, content) =>
        Effect.sync(() => {
          writes.push(`${path}:${content}`)
        }),
      remove: path =>
        Effect.sync(() => {
          removes.push(path)
        }),
    })

    const templateLayer = makeTemplateEngineMockLayer({
      render: (_templatePath, data) => Effect.succeed(String(data)),
    })

    const appConfigLayer = Layer.succeed(AppConfig, AppConfig.make({
      logLevel: LogLevel.Debug,
      defaultConcurrency: 1,
      tracingEndpoint: Option.none(),
      debug: false,
    }))

    const layer = PlanService.DefaultWithoutDependencies.pipe(
      Layer.provideMerge(Layer.mergeAll(appConfigLayer, fsLayer, templateLayer)),
    )

    const plan: Plan = {
      tasks: [
        { kind: 'render', src: makeTemplatePath('/tmp/escape.hbs'), path: '../outside.txt', data: 'escape' },
      ],
    }

    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const planner = yield* PlanService
        yield* planner.apply(plan, baseDir, reactPresetProjectConfig)
      }).pipe(Effect.provide(layer)),
    )

    expect(Exit.isFailure(exit)).toBe(true)
    expect(writes).toEqual([])
    expect(directories).toEqual([])
    expect(removes).toEqual([])

    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PlanTargetPathError)
      expect(exit.cause.error).toMatchObject({
        path: '../outside.txt',
        baseDir,
      })
    }
  })
})
