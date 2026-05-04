import type { Task } from './build'
import type { TargetDir } from '@/brand/target-dir'
import type { TemplatePath } from '@/brand/template-path'
import type { TemplateError } from '@/core/errors'
import type { ProjectConfig } from '@/schema/project-config'
import * as path from 'node:path'
import { Effect, Exit, Ref, Schema, Scope } from 'effect'
import { produce } from 'immer'
import { makeTargetDir } from '@/brand/target-dir'
import { makeTemplatePath } from '@/brand/template-path'
import { FileIOError, PlanConflictError, PlanTargetPathError } from '@/core/errors'
import { sortJsonKeys } from '@/utils/file-helper'
import { safeParseJson } from '../../adapters/json'
import { withProjectAnnotations } from '../observability'

interface PlanApplyFs {
  readonly exists: (path: string) => Effect.Effect<boolean, FileIOError>
  readonly readFileString: (path: string) => Effect.Effect<string, FileIOError>
  readonly writeFileString: (path: string, content: string) => Effect.Effect<void, FileIOError>
  readonly makeDirectory: (
    path: string,
    options?: { readonly recursive?: boolean },
  ) => Effect.Effect<void, FileIOError>
  readonly ensureDir: (path: string) => Effect.Effect<void, FileIOError>
  readonly remove: (
    path: string,
    options?: { readonly recursive?: boolean, readonly force?: boolean },
  ) => Effect.Effect<void, FileIOError>
  readonly copyFile: (src: string, dest: string) => Effect.Effect<void, FileIOError>
}

interface PlanApplyTemplateEngine {
  readonly render: (
    path: TemplatePath,
    data: unknown,
    config: ProjectConfig,
  ) => Effect.Effect<string, TemplateError | FileIOError>
}

interface PlanApplyConfig {
  readonly defaultConcurrency: number
}

export interface PlanApplyDependencies {
  readonly fs: PlanApplyFs
  readonly templates: PlanApplyTemplateEngine
  readonly appConfig: PlanApplyConfig
}

export interface PlanApplyOptions {
  readonly rollbackOnFailure?: boolean
}

interface ResolvedTaskTarget {
  readonly task: Task
  readonly absPath: string
  readonly canonicalPath: string
}

function isWithinDirectory(baseDir: string, targetPath: string) {
  const relative = path.relative(baseDir, targetPath)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function resolveTaskTargetPath(baseDir: TargetDir, task: Task) {
  const resolvedBaseDir = path.resolve(baseDir)

  if (path.isAbsolute(task.path) || path.win32.isAbsolute(task.path)) {
    return Effect.fail(new PlanTargetPathError({
      path: task.path,
      baseDir: resolvedBaseDir,
      message: `Plan target path "${task.path}" must be relative to "${resolvedBaseDir}"`,
    }))
  }

  const absPath = path.resolve(resolvedBaseDir, task.path)
  if (!isWithinDirectory(resolvedBaseDir, absPath)) {
    return Effect.fail(new PlanTargetPathError({
      path: task.path,
      baseDir: resolvedBaseDir,
      message: `Plan target path "${task.path}" escapes target directory "${resolvedBaseDir}"`,
    }))
  }

  return Effect.succeed({
    task,
    absPath,
    canonicalPath: path.relative(resolvedBaseDir, absPath) || '.',
  })
}

function resolveTaskTargets(baseDir: TargetDir, tasks: Task[]) {
  return Effect.forEach(tasks, task => resolveTaskTargetPath(baseDir, task), {
    concurrency: 1,
  })
}

function findDuplicateTargetPath(targets: ResolvedTaskTarget[]) {
  const taskKindsByPath = new Map<string, Task['kind'][]>()

  for (const target of targets) {
    const taskKinds = taskKindsByPath.get(target.absPath)
    if (taskKinds) {
      taskKinds.push(target.task.kind)
      return {
        path: target.canonicalPath,
        taskKinds,
      }
    }

    taskKindsByPath.set(target.absPath, [target.task.kind])
  }

  return undefined
}

function trackCreatedFile(writtenPaths: Ref.Ref<TargetDir[]>, absPath: string) {
  return Ref.update(writtenPaths, paths => [...paths, makeTargetDir(absPath)])
}

function encodeJson(value: Record<string, unknown>) {
  return Schema.encode(Schema.parseJson({ space: 2 }))(value).pipe(
    Effect.mapError(error => new FileIOError({
      op: 'parse',
      path: '<memory>',
      message: `Failed to encode JSON: ${error}`,
    })),
  )
}

function trackCreatedDirectory(createdDirs: Ref.Ref<TargetDir[]>, absPath: string) {
  return Ref.update(createdDirs, paths => [...paths, makeTargetDir(absPath)])
}

function ensureTrackedDirectories(fs: PlanApplyFs, baseDir: TargetDir, absPath: string, createdDirs: Ref.Ref<TargetDir[]>) {
  return Effect.gen(function* () {
    const resolvedBaseDir = path.resolve(baseDir)
    const targetDir = path.dirname(absPath)
    const relativeTargetDir = path.relative(resolvedBaseDir, targetDir)

    if (relativeTargetDir.startsWith('..') || path.isAbsolute(relativeTargetDir)) {
      yield* fs.ensureDir(targetDir)
      return
    }

    const segments = relativeTargetDir === ''
      ? []
      : relativeTargetDir.split(path.sep).filter(Boolean)

    let currentDir = resolvedBaseDir
    const directories = [resolvedBaseDir]

    for (const segment of segments) {
      currentDir = path.join(currentDir, segment)
      directories.push(currentDir)
    }

    for (const directory of directories) {
      if (yield* fs.exists(directory)) {
        continue
      }

      yield* fs.makeDirectory(directory).pipe(
        Effect.tap(() => trackCreatedDirectory(createdDirs, directory)),
        Effect.catchAll(error =>
          fs.exists(directory).pipe(
            Effect.flatMap(exists => exists ? Effect.void : Effect.fail(error)),
          ),
        ),
      )
    }
  })
}

function writeText(fs: PlanApplyFs, baseDir: TargetDir, absPath: string, content: string, createdDirs: Ref.Ref<TargetDir[]>) {
  return ensureTrackedDirectories(fs, baseDir, absPath, createdDirs).pipe(
    Effect.zipRight(fs.writeFileString(absPath, content)),
  )
}

function cleanupCreatedPaths(fs: PlanApplyFs, writtenPaths: Ref.Ref<TargetDir[]>) {
  return Ref.get(writtenPaths).pipe(
    Effect.flatMap(paths =>
      Effect.forEach(
        [...paths].reverse(),
        createdPath =>
          fs.remove(createdPath, { force: true, recursive: true }).pipe(
            Effect.catchAll(error =>
              Effect.logWarning(`Failed to clean up generated path ${createdPath}: ${error.message}`),
            ),
          ),
        { concurrency: 1, discard: true },
      ),
    ),
  )
}

function cleanupCreatedDirectories(fs: PlanApplyFs, createdDirs: Ref.Ref<TargetDir[]>) {
  return Ref.get(createdDirs).pipe(
    Effect.flatMap(paths =>
      Effect.forEach(
        [...paths].reverse(),
        createdDir =>
          fs.remove(createdDir, { force: true, recursive: true }).pipe(
            Effect.catchAll(error =>
              Effect.logWarning(`Failed to clean up generated directory ${createdDir}: ${error.message}`),
            ),
          ),
        { concurrency: 1, discard: true },
      ),
    ),
  )
}

function registerRollbackFinalizer(fs: PlanApplyFs, writtenPaths: Ref.Ref<TargetDir[]>, createdDirs: Ref.Ref<TargetDir[]>, enabled: boolean) {
  if (!enabled) {
    return Effect.void
  }

  return Effect.scopeWith((scope) => {
    const rollbackOnFailure = (exit: Exit.Exit<unknown, unknown>) =>
      Exit.isFailure(exit)
        ? cleanupCreatedPaths(fs, writtenPaths).pipe(
            Effect.zipRight(cleanupCreatedDirectories(fs, createdDirs)),
          )
        : Effect.void

    return Scope.addFinalizerExit(scope, rollbackOnFailure)
  })
}

function runTask(deps: PlanApplyDependencies, target: ResolvedTaskTarget, baseDir: TargetDir, config: ProjectConfig, writtenPaths: Ref.Ref<TargetDir[]>, createdDirs: Ref.Ref<TargetDir[]>) {
  return Effect.gen(function* () {
    const { fs, templates } = deps
    const { task, absPath: abs } = target

    switch (task.kind) {
      case 'copy': {
        if (yield* fs.exists(abs)) {
          return
        }
        yield* ensureTrackedDirectories(fs, baseDir, abs, createdDirs)
        yield* fs.copyFile(task.src, abs)
        yield* trackCreatedFile(writtenPaths, abs)
        return
      }
      case 'render': {
        const content = yield* templates.render(makeTemplatePath(task.src), task.data, task.config ?? config)
        const existed = yield* fs.exists(abs)
        yield* writeText(fs, baseDir, abs, content, createdDirs)
        if (!existed)
          yield* trackCreatedFile(writtenPaths, abs)
        return
      }
      case 'json': {
        const existed = yield* fs.exists(abs)
        let draft: Record<string, unknown> = {}
        if (task.readExisting && (yield* fs.exists(abs))) {
          const s = yield* fs.readFileString(abs)
          draft = yield* safeParseJson(s, abs)
        }
        else if (task.base) {
          draft = task.base()
        }
        for (const reducer of task.reducers) {
          draft = produce(draft, (d) => {
            reducer(d)
          })
        }
        if (task.finalize) {
          const finalize = task.finalize
          draft = produce(draft, (d) => {
            finalize(d)
          })
        }

        let out = draft
        if (task.sortKeys) {
          out = sortJsonKeys(draft)
        }
        const content = `${yield* encodeJson(out)}\n`
        yield* writeText(fs, baseDir, abs, content, createdDirs)
        if (!existed)
          yield* trackCreatedFile(writtenPaths, abs)
        return
      }
      case 'text': {
        const existed = yield* fs.exists(abs)
        let current = ''
        const shouldRead = task.readExisting !== false
        if (shouldRead && (yield* fs.exists(abs))) {
          current = yield* fs.readFileString(abs)
        }
        else if (task.base) {
          current = task.base()
        }
        for (const tr of task.transforms) current = tr(current)

        yield* writeText(fs, baseDir, abs, current, createdDirs)
        if (!existed)
          yield* trackCreatedFile(writtenPaths, abs)
      }
    }
  }).pipe(withProjectAnnotations(config, `plan.task.${target.task.kind}`, target.task.path))
}

export function applyPlan(
  deps: PlanApplyDependencies,
  tasks: Task[],
  baseDir: TargetDir,
  config: ProjectConfig,
  options?: PlanApplyOptions,
) {
  return Effect.scoped(Effect.gen(function* () {
    const targets = yield* resolveTaskTargets(baseDir, tasks)
    const conflict = findDuplicateTargetPath(targets)
    if (conflict) {
      return yield* new PlanConflictError({
        path: conflict.path,
        taskKinds: [...conflict.taskKinds],
        message: `Duplicate target path "${conflict.path}" is not allowed within a plan apply`,
      })
    }

    const writtenPaths = yield* Ref.make<TargetDir[]>([])
    const createdDirs = yield* Ref.make<TargetDir[]>([])
    yield* registerRollbackFinalizer(
      deps.fs,
      writtenPaths,
      createdDirs,
      options?.rollbackOnFailure ?? true,
    )

    const generate = targets.filter(({ task }) => task.kind === 'copy' || task.kind === 'render')
    const modify = targets.filter(({ task }) => task.kind === 'json' || task.kind === 'text')

    yield* Effect.forEach(
      generate,
      target => runTask(deps, target, baseDir, config, writtenPaths, createdDirs),
      { concurrency: deps.appConfig.defaultConcurrency },
    )

    yield* Effect.forEach(
      modify,
      target => runTask(deps, target, baseDir, config, writtenPaths, createdDirs),
      { concurrency: deps.appConfig.defaultConcurrency },
    )
  }))
}
