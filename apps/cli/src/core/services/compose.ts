import type { StandardCommand } from '@effect/platform/Command'
import type { PostGenerateCommand } from '../commands'
import type { TargetDir } from '@/brand/target-dir'
import type { TemplatePath } from '@/brand/template-path'
import type { ComposeDSL, Plan, PostGenerateFileAction } from '@/core/services/planner'
import type { ProjectConfig } from '@/schema/project-config'
import type { GenerationTargetScope } from '@/schema/target-scope'
import type { TemplateRegistry } from '@/schema/template-registry'
import path from 'node:path'
import { Command } from '@effect/platform'
import { Effect } from 'effect'
import { makeProjectTargetDir } from '@/brand/target-dir'
import { makeTemplatePath } from '@/brand/template-path'
import { PlanTargetPathError } from '@/core/errors'
import { matchesGenerationTargetScope } from '@/schema/target-scope'
import { isCliProject, isNodeProject, isReactProject, isVueProject, isWorkspaceRootProject } from '@/utils/type-guard'
import { FsService } from '~/fs'
import { CliContext } from '../cli-context'
import { buildCommands, buildPostGenerateFileActions } from '../commands'
import { CliTemplates, NodeTemplates } from '../template-registry/node-runtime'
import { ReactTemplates } from '../template-registry/react'
import { VueTemplates } from '../template-registry/vue'
import { workspaceBootstrapRootTemplates } from '../template-registry/workspace-bootstrap'
import { CommandService } from './command'
import { withProjectAnnotations } from './observability'
import { OrchestratorService } from './orchestrator'
import { projectPlanSpec } from './planner'
import { formatDryRunPreview } from './preview'
import { collectTemplatePartialEntries } from './template-engine'

interface TemplateBuildOptions {
  readonly targetScope?: GenerationTargetScope
  readonly targetDirectory?: string
}

function targetScopeForConfig(config: ProjectConfig): GenerationTargetScope {
  return isWorkspaceRootProject(config) ? 'root' : 'both'
}

function targetPathWithinDirectory(targetDirectory: string | undefined, targetPath: string): string {
  const normalizedDirectory = targetDirectory?.replace(/^\/+|\/+$/g, '') ?? ''
  if (!normalizedDirectory) {
    return targetPath
  }

  return `${normalizedDirectory}/${targetPath.replace(/^\/+/, '')}`
}

// 纯函数：直接把符合条件的模板注册到 DSL（不依赖环境）
export function buildTemplates(
  dsl: ComposeDSL,
  templateRoot: TemplatePath,
  config: ProjectConfig,
  options: TemplateBuildOptions = {},
) {
  const targetScope = options.targetScope ?? targetScopeForConfig(config)

  const register = <T>(registry: TemplateRegistry<T>) => {
    for (const item of Object.values(registry)) {
      if (!matchesGenerationTargetScope(item.scope, targetScope))
        continue
      if (!item.condition(config as T))
        continue
      const target = targetPathWithinDirectory(
        options.targetDirectory,
        typeof item.target === 'string' ? item.target : item.target(config as T),
      )
      const src = makeTemplatePath(path.join(templateRoot, item.template))
      dsl.render(src, target, undefined, item.ownership)
    }
  }
  if (isVueProject(config))
    register(VueTemplates)
  if (isReactProject(config))
    register(ReactTemplates)
  if (isWorkspaceRootProject(config))
    register(workspaceBootstrapRootTemplates)
  if (isNodeProject(config))
    register(NodeTemplates)
  if (isCliProject(config))
    register(CliTemplates)
}

// 兼容别名：partial 选择逻辑由 TemplateEngine 拥有，新代码应直接依赖 TemplateEngine.prepare。
export const collectPartialEntries = collectTemplatePartialEntries

export function generateProject(projectConfig: ProjectConfig) {
  const targetDir = makeProjectTargetDir(projectConfig.name)

  return Effect.gen(function* () {
    yield* Effect.logInfo('🔧 Generating your project...')
    const cli = yield* CliContext
    const orchestrator = yield* OrchestratorService
    const plan = yield* orchestrator.execute(targetDir, projectConfig, {
      rollbackOnFailure: cli.args.rollback ?? true,
    })
    const postGenerateCommands = yield* buildCommands(projectConfig)
    const postGenerateFileActions = yield* buildPostGenerateFileActions(projectConfig)
    return {
      ...plan,
      ...(postGenerateCommands.length > 0 ? { postGenerateCommands } : {}),
      ...(postGenerateFileActions.length > 0 ? { postGenerateFileActions } : {}),
    } satisfies Plan
  }).pipe(
    Effect.withSpan('generate.project'),
    withProjectAnnotations(projectConfig, 'generate.project', targetDir),
  )
}

export function previewProject(projectConfig: ProjectConfig) {
  const targetDir = makeProjectTargetDir(projectConfig.name)

  return Effect.gen(function* () {
    yield* Effect.logInfo('🔎 Building dry-run preview...')
    const orchestrator = yield* OrchestratorService
    const plan = yield* orchestrator.build(targetDir, projectConfig)
    const postGenerateCommands = yield* buildCommands(projectConfig)
    const postGenerateFileActions = yield* buildPostGenerateFileActions(projectConfig)
    const planSpec = yield* projectPlanSpec({
      ...plan,
      ...(postGenerateCommands.length > 0 ? { postGenerateCommands } : {}),
      ...(postGenerateFileActions.length > 0 ? { postGenerateFileActions } : {}),
    })
    return formatDryRunPreview(planSpec)
  }).pipe(
    Effect.withSpan('preview.project'),
    withProjectAnnotations(projectConfig, 'preview.project', targetDir),
  )
}

export function withWorkingDirectory(command: StandardCommand, dir: TargetDir): StandardCommand {
  return Command.workingDirectory(command, dir) as StandardCommand
}

function executePostGenerateCommand(command: PostGenerateCommand, dir: TargetDir) {
  return Effect.gen(function* () {
    const commandSvc = yield* CommandService
    yield* commandSvc.execute(withWorkingDirectory(command.command, dir)).pipe(
      Effect.annotateLogs({
        commandOwner: command.ownership.owner,
        commandUnit: command.ownership.unit,
        commandPhase: command.phase,
      }),
      Effect.annotateSpans({
        commandOwner: command.ownership.owner,
        commandUnit: command.ownership.unit,
        commandPhase: command.phase,
      }),
    )
  })
}

export function executeAllCommandsInDir(commands: PostGenerateCommand[], dir: TargetDir) {
  return Effect.forEach(commands, command => executePostGenerateCommand(command, dir), {
    concurrency: 1,
    discard: true,
  })
}

function isWithinDirectory(baseDir: string, targetPath: string) {
  const relative = path.relative(baseDir, targetPath)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function resolvePostGenerateFileActionPath(dir: TargetDir, action: PostGenerateFileAction) {
  const resolvedBaseDir = path.resolve(dir)

  if (path.isAbsolute(action.path) || path.win32.isAbsolute(action.path)) {
    return Effect.fail(new PlanTargetPathError({
      path: action.path,
      baseDir: resolvedBaseDir,
      message: `Post-generate file action path "${action.path}" must be relative to "${resolvedBaseDir}"`,
    }))
  }

  const absPath = path.resolve(resolvedBaseDir, action.path)
  if (!isWithinDirectory(resolvedBaseDir, absPath)) {
    return Effect.fail(new PlanTargetPathError({
      path: action.path,
      baseDir: resolvedBaseDir,
      message: `Post-generate file action path "${action.path}" escapes target directory "${resolvedBaseDir}"`,
    }))
  }

  return Effect.succeed(absPath)
}

function executePostGenerateFileAction(action: PostGenerateFileAction, dir: TargetDir) {
  return Effect.gen(function* () {
    const fs = yield* FsService
    const absPath = yield* resolvePostGenerateFileActionPath(dir, action)
    yield* fs.ensureDir(path.dirname(absPath))
    yield* fs.writeFileString(absPath, action.content)
    if (action.executable) {
      yield* fs.chmod(absPath, 0o755)
    }
  }).pipe(
    Effect.annotateLogs({
      fileActionKind: action.kind,
      fileActionPath: action.path,
      fileActionPhase: action.phase,
      ...(action.ownership
        ? {
            fileActionOwner: action.ownership.owner,
            fileActionUnit: action.ownership.unit,
          }
        : {}),
    }),
    Effect.annotateSpans({
      fileActionKind: action.kind,
      fileActionPath: action.path,
      fileActionPhase: action.phase,
      ...(action.ownership
        ? {
            fileActionOwner: action.ownership.owner,
            fileActionUnit: action.ownership.unit,
          }
        : {}),
    }),
  )
}

export function executeAllPostGenerateFileActionsInDir(actions: PostGenerateFileAction[], dir: TargetDir) {
  return Effect.forEach(actions, action => executePostGenerateFileAction(action, dir), {
    concurrency: 1,
    discard: true,
  })
}

function rollbackGeneratedProject(targetDir: TargetDir) {
  return Effect.gen(function* () {
    const fs = yield* FsService
    yield* fs.remove(targetDir, { recursive: true, force: true }).pipe(
      Effect.catchAll(error =>
        Effect.logWarning(`Failed to roll back generated project ${targetDir}: ${error.message}`),
      ),
    )
  })
}

export function finishProject(
  config: ProjectConfig,
  plan: Plan,
  options?: { readonly rollbackOnFailure?: boolean },
) {
  const targetDir = makeProjectTargetDir(config.name)
  const rollbackOnFailure = options?.rollbackOnFailure ?? true

  return Effect.gen(function* () {
    const tracedPlanSpec = yield* projectPlanSpec(plan)
    const postGenerateCommands = tracedPlanSpec.postGenerateCommands ?? []
    const postGenerateFileActions = tracedPlanSpec.postGenerateFileActions ?? []
    const postGenerateCommandTrace = postGenerateCommands
      .map(command => `${command.phase}:${command.ownership.owner}:${command.command} ${command.args.join(' ')}`)
      .join(' | ')
    const postGenerateFileActionTrace = postGenerateFileActions
      .map(action => `${action.phase}:${action.ownership?.owner ?? 'unknown'}:${action.kind} ${action.path}`)
      .join(' | ')
    yield* Effect.logDebug('Prepared traced plan spec for post-generate actions').pipe(
      Effect.annotateLogs({
        postGenerateCommandCount: postGenerateCommands.length,
        postGenerateFileActionCount: postGenerateFileActions.length,
        ...(postGenerateCommandTrace ? { postGenerateCommands: postGenerateCommandTrace } : {}),
        ...(postGenerateFileActionTrace ? { postGenerateFileActions: postGenerateFileActionTrace } : {}),
      }),
      Effect.annotateSpans({
        postGenerateCommandCount: postGenerateCommands.length,
        postGenerateFileActionCount: postGenerateFileActions.length,
        ...(postGenerateCommandTrace ? { postGenerateCommands: postGenerateCommandTrace } : {}),
        ...(postGenerateFileActionTrace ? { postGenerateFileActions: postGenerateFileActionTrace } : {}),
      }),
    )
    yield* executeAllCommandsInDir(plan.postGenerateCommands ?? [], targetDir)
    yield* executeAllPostGenerateFileActionsInDir(plan.postGenerateFileActions ?? [], targetDir)
    yield* Effect.logInfo('🎉 Project generated successfully!')
  }).pipe(
    Effect.tapError(() => rollbackOnFailure ? rollbackGeneratedProject(targetDir) : Effect.void),
    Effect.withSpan('finish.project'),
    withProjectAnnotations(config, 'finish.project', targetDir),
  )
}
