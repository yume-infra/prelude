import type { CreateProjectError, CreateProjectOptions, CreateProjectPlan, CreateProjectResult, ProviderDiscoveries } from './model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'
import { FsService } from '@/core/services/fs'
import { applyWritePlan, writeManifest } from './apply'
import { collectCapabilityContributions } from './contributions'
import { EffectHarnessProviderDiscoveryService } from './effect-harness-discovery'
import { buildManifest, encodeManifest } from './manifest'
import { materializeWritePlan } from './materializers'
import { resolveCreateSpec, validateCreateSpec } from './resolve'
import { verifyCreateOutputs } from './verify'

export { effectHarnessProviderDiscoveryLayer } from './effect-harness-discovery'
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
  EffectHarnessDiscoveredProvider,
  EffectHarnessPackageLocator,
  EffectHarnessProviderDiscovery,
  JsonValue,
  LifecycleProviderRecord,
  LifecycleSurfaceRecord,
  MaintainProviderReference,
  PreludeManifest,
  ProviderDiscoveries,
  ResolvedGraph,
  WriteOperation,
  WritePlan,
} from './model'

function createSpecSelectsEffectHarness(spec: CreateProjectOptions['spec']) {
  return spec.providers.includes('effect-harness')
}

const resolveProviderDiscoveries = Effect.fn('resolveProviderDiscoveries')(
  function* (
    spec: CreateProjectOptions['spec'],
    configuredDiscoveries: ProviderDiscoveries | undefined,
  ): Effect.fn.Return<ProviderDiscoveries, SchemaContractError, EffectHarnessProviderDiscoveryService> {
    if (!createSpecSelectsEffectHarness(spec)) {
      return {}
    }

    if (configuredDiscoveries?.effectHarness !== undefined) {
      return configuredDiscoveries
    }

    const discoveryService = yield* EffectHarnessProviderDiscoveryService
    const effectHarness = yield* discoveryService.discover.pipe(
      Effect.mapError(error => new SchemaContractError({
        schema: 'EffectHarnessProviderDiscovery',
        message: error.message,
        issueCount: 1,
      })),
    )
    return { effectHarness }
  },
)

export const planCreateProjectFromSpec = Effect.fn('planCreateProjectFromSpec')(
  function* (
    spec: CreateProjectOptions['spec'],
    providerDiscoveries?: ProviderDiscoveries,
  ): Effect.fn.Return<CreateProjectPlan, SchemaContractError, EffectHarnessProviderDiscoveryService> {
    yield* validateCreateSpec(spec)
    const resolvedProviderDiscoveries = yield* resolveProviderDiscoveries(spec, providerDiscoveries)
    const resolvedGraph = resolveCreateSpec(spec, resolvedProviderDiscoveries.effectHarness)
    const contributions = collectCapabilityContributions(resolvedGraph, resolvedProviderDiscoveries)
    const writePlan = yield* materializeWritePlan(contributions)

    return {
      resolvedGraph,
      writePlan,
      providerDiscoveries: resolvedProviderDiscoveries,
    }
  },
)

export const createProjectFromSpec = Effect.fn('createProjectFromSpec')(
  function* (options: CreateProjectOptions): Effect.fn.Return<CreateProjectResult, CreateProjectError, FsService | EffectHarnessProviderDiscoveryService> {
    const fs = yield* FsService
    const { providerDiscoveries, resolvedGraph, writePlan } = yield* planCreateProjectFromSpec(options.spec, options.providerDiscoveries)

    yield* applyWritePlan(fs, options.targetDir, writePlan)
    const verification = yield* verifyCreateOutputs(fs, options.targetDir, resolvedGraph, writePlan)
    const manifest = buildManifest({
      preludeVersion: options.preludeVersion,
      createSpec: options.spec,
      resolvedGraph,
      writePlan,
      verification,
      providerDiscoveries,
    })
    yield* writeManifest(fs, options.targetDir, encodeManifest(manifest))

    return {
      resolvedGraph,
      writePlan,
      verification,
      manifest,
    }
  },
)
