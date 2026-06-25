import type { CreateProjectError, CreateProjectOptions, CreateProjectResult } from './model'
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
  CreateFs,
  CreateProjectError,
  CreateProjectOptions,
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

export function createProjectFromSpec(options: CreateProjectOptions): Effect.Effect<CreateProjectResult, CreateProjectError, FsService> {
  return Effect.gen(function* () {
    const fs = yield* FsService
    yield* validateCreateSpec(options.spec)
    const resolvedGraph = resolveCreateSpec(options.spec)
    const contributions = collectCapabilityContributions(resolvedGraph)
    const writePlan = yield* materializeWritePlan(contributions)

    yield* applyWritePlan(fs, options.targetDir, writePlan)
    const verification = yield* verifyCreateOutputs(fs, options.targetDir, resolvedGraph)
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
