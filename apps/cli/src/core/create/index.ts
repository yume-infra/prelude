import type { CreateProjectError, CreateProjectOptions, CreateProjectPlan, CreateProjectResult } from './model'
import type { SchemaContractError } from '@/core/errors'
import { Effect } from 'effect'
import { FsService } from '@/core/services/fs'
import { applyWritePlan, writeManifest } from './apply'
import { collectCapabilityContributions } from './contributions'
import { buildManifest, encodeManifest } from './manifest'
import { materializeWritePlan } from './materializers'
import { resolveCreateSpec, validateCreateSpec } from './resolve'
import { verifyCreateOutputs } from './verify'

export { materializeWritePlan } from './materializers'
export type {
  CapabilityContribution,
  CapabilityId,
  CreateFs,
  CreateProjectError,
  CreateProjectOptions,
  CreateProjectPlan,
  CreateProjectResult,
  CreateSpec,
  JsonValue,
  LifecycleProviderRecord,
  LifecycleSurfaceRecord,
  PreludeManifest,
  ResolvedGraph,
  WriteOperation,
  WritePlan,
} from './model'

export function planCreateProjectFromSpec(spec: CreateProjectOptions['spec']): Effect.Effect<CreateProjectPlan, SchemaContractError> {
  return Effect.gen(function* () {
    yield* validateCreateSpec(spec)
    const resolvedGraph = resolveCreateSpec(spec)
    const contributions = collectCapabilityContributions(resolvedGraph)
    const writePlan = yield* materializeWritePlan(contributions)

    return {
      resolvedGraph,
      writePlan,
    }
  })
}

export function createProjectFromSpec(options: CreateProjectOptions): Effect.Effect<CreateProjectResult, CreateProjectError, FsService> {
  return Effect.gen(function* () {
    const fs = yield* FsService
    const { resolvedGraph, writePlan } = yield* planCreateProjectFromSpec(options.spec)

    yield* applyWritePlan(fs, options.targetDir, writePlan)
    const verification = yield* verifyCreateOutputs(fs, options.targetDir, resolvedGraph, writePlan)
    const manifest = buildManifest({
      preludeVersion: options.preludeVersion,
      createSpec: options.spec,
      resolvedGraph,
      writePlan,
      verification,
    })
    yield* writeManifest(fs, options.targetDir, encodeManifest(manifest))

    return {
      resolvedGraph,
      writePlan,
      verification,
      manifest,
    }
  })
}
