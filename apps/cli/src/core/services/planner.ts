import type { ComposeDSL, Plan } from './plan/build'
import type { TargetDir } from '@/brand/target-dir'
import type { FileIOError, PlanConflictError, PlanTargetPathError, TemplateError } from '@/core/errors'
import type { ProjectConfig } from '@/schema/project-config'
import { Effect } from 'effect'
import { AppConfig as AppConfigService } from '@/config/app-config'
import { FsService } from '~/fs'
import { TemplateEngineService } from '~/template-engine'
import { withProjectAnnotations } from './observability'
import { applyPlan } from './plan/apply'
import { buildPlan } from './plan/build'

export type {
  ComposeDSL,
  CopyTask,
  GenerateTask,
  JsonBuilder,
  JsonTask,
  ModifyTask,
  Plan,
  PostGenerateFileAction,
  RenderTask,
  Task,
  TextBuilder,
  TextTask,
} from './plan/build'
export { toPlanSpec } from './plan/build'

interface PlanServiceShape {
  // 组合 tasks 但是不触发
  readonly build: (
    program: (dsl: ComposeDSL) => void,
  ) => Effect.Effect<Plan, never>
  // 执行计划中的所有任务
  readonly apply: (
    plan: Plan,
    baseDir: TargetDir,
    config: ProjectConfig,
    options?: { readonly rollbackOnFailure?: boolean },
  ) => Effect.Effect<void, FileIOError | PlanConflictError | PlanTargetPathError | TemplateError>
}

export class PlanService extends Effect.Service<PlanService>()('PlanService', {
  effect: Effect.gen(function* () {
    const fs = yield* FsService
    const templates = yield* TemplateEngineService
    const appConfig = yield* AppConfigService

    const build: PlanServiceShape['build'] = program =>
      Effect.sync(() => buildPlan(program)).pipe(
        Effect.withSpan('plan.build'),
        Effect.annotateLogs({ taskKind: 'plan.build' }),
        Effect.annotateSpans({ taskKind: 'plan.build' }),
      )

    const apply: PlanServiceShape['apply'] = (plan, baseDir, config, options) =>
      applyPlan(
        { fs, templates, appConfig },
        plan.tasks,
        baseDir,
        config,
        options,
      ).pipe(
        Effect.withSpan('plan.apply'),
        withProjectAnnotations(config, 'plan.apply', baseDir),
      )

    return { build, apply } satisfies PlanServiceShape
  }),
  dependencies: [FsService.Default, TemplateEngineService.Default, AppConfigService.Default],
}) {}

export const PlanLive = PlanService.Default
