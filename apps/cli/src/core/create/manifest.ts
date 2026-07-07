import type {
  MaintainProviderReference,
  PreludeManifest,
  ProviderDiscoveries,
  ResolvedGraph,
  VerificationResult,
} from './model'
import {
  effectHarnessLifecycleProviderRecord,
  effectHarnessMaintainProviderReference,
  hasEffectHarnessProvider,
} from './effect-harness-provider'

function maintainProvidersFor(graph: ResolvedGraph, providerDiscoveries: ProviderDiscoveries): readonly MaintainProviderReference[] {
  if (!hasEffectHarnessProvider(graph)) {
    return []
  }

  if (providerDiscoveries.effectHarness === undefined) {
    throw new Error('effect-harness provider discovery must be loaded before building maintain provider references')
  }

  return [effectHarnessMaintainProviderReference(effectHarnessLifecycleProviderRecord(providerDiscoveries.effectHarness, graph))]
}

export function buildManifest(input: {
  readonly preludeVersion: string
  readonly resolvedGraph: ResolvedGraph
  readonly verification: VerificationResult
  readonly providerDiscoveries: ProviderDiscoveries
}): PreludeManifest | undefined {
  const maintainProviders = maintainProvidersFor(input.resolvedGraph, input.providerDiscoveries)
  if (maintainProviders.length === 0) {
    return undefined
  }

  return {
    schemaVersion: 1,
    preludeVersion: input.preludeVersion,
    maintainProviders,
    verificationRecords: input.verification.records,
  }
}

export function encodeManifest(manifest: PreludeManifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`
}
