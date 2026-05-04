// 编排整个阶段

import type { TargetDir } from '@/brand/target-dir'
import type { FileIOError, PlanConflictError, PlanTargetPathError, TemplateError } from '@/core/errors'
import type { ComposeDSL, Plan } from '@/core/services/planner'
import type { ProjectConfig } from '@/schema/project-config'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Effect } from 'effect'
import { makeTemplatePath } from '@/brand/template-path'
import { isFrontendProject } from '@/utils/type-guard'
import { PlanService } from '~/planner'
import { TemplateEngineService } from '~/template-engine'
import { buildPackageJson } from '../modifier/package-json'
import { buildRootSvg } from '../template-registry/root-svg'
import {
  buildWorkspacePackages,
  workspacePackageProjectConfigs,
} from '../workspace-packages'
import { buildTemplates } from './compose'
import { withProjectAnnotations } from './observability'

interface OrchestratorServiceShape {
  readonly build: (
    baseDir: TargetDir,
    config: ProjectConfig,
  ) => Effect.Effect<Plan, FileIOError | TemplateError>
  readonly execute: (
    baseDir: TargetDir,
    config: ProjectConfig,
    options?: { readonly rollbackOnFailure?: boolean },
  ) => Effect.Effect<Plan, FileIOError | PlanConflictError | PlanTargetPathError | TemplateError>
}

export class OrchestratorService extends Effect.Service<OrchestratorService>()(
  'OrchestratorService',
  {
    effect: Effect.gen(function* () {
      const planner = yield* PlanService
      const templateEngine = yield* TemplateEngineService
      // 计算模板根目录：dist 文件夹旁的 templates 目录（发布包中二者同级）
      const __dirname = path.dirname(fileURLToPath(import.meta.url))
      const templateRoot = makeTemplatePath(path.resolve(__dirname, '../templates'))
      const partialRoot = makeTemplatePath(path.join(templateRoot, 'partials'))

      const buildProgram = (config: ProjectConfig) => (dsl: ComposeDSL) => {
        if (config.type === 'workspace-root') {
          buildPackageJson(dsl, config)
          buildTemplates(dsl, templateRoot, config)
          buildWorkspacePackages(dsl, templateRoot, config)
          return
        }

        if (isFrontendProject(config)) {
          buildRootSvg(dsl, templateRoot)
        }

        buildPackageJson(dsl, config)
        buildTemplates(dsl, templateRoot, config)
      }

      const build: OrchestratorServiceShape['build'] = (baseDir, config) =>
        Effect.gen(function* () {
          // 1. 准备模板引擎（helpers + 框架/global partials）
          yield* templateEngine.prepare(config, partialRoot)
          if (config.type === 'workspace-root') {
            yield* Effect.forEach(
              workspacePackageProjectConfigs(config),
              packageConfig => templateEngine.prepare(packageConfig, partialRoot),
              { concurrency: 1, discard: true },
            )
          }

          // 2. 组合 DSL（纯同步，不能产生 Effect）并生成计划
          return yield* planner.build(buildProgram(config))
        }).pipe(
          Effect.withSpan('orchestrator.build'),
          withProjectAnnotations(config, 'orchestrator.build', baseDir),
        )

      const execute: OrchestratorServiceShape['execute'] = (baseDir, config, options) =>
        Effect.gen(function* () {
          const plan = yield* build(baseDir, config)
          yield* planner.apply(plan, baseDir, config, options)
          return plan
        }).pipe(
          Effect.withSpan('orchestrator.execute'),
          withProjectAnnotations(config, 'orchestrator.execute', baseDir),
        )

      return { build, execute } satisfies OrchestratorServiceShape
    }),
    dependencies: [PlanService.Default, TemplateEngineService.Default],
  },
) {}

export const OrchestratorLive = OrchestratorService.Default
