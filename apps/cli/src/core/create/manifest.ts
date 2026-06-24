import type {
  CreateSpec,
  GeneratedUserSurfaceRecord,
  LifecycleProviderRecord,
  LifecycleSurfaceRecord,
  PreludeManifest,
  ResolvedGraph,
  VerificationResult,
  WritePlan,
} from './model'
import {
  effectHarnessLifecycleProviderRecord,
  effectHarnessLifecycleSurfaces,
  hasEffectHarnessProvider,
} from './effect-harness-provider'
import { toManifestCreateSpec } from './resolve'

function isGeneratedUserOperation(operation: WritePlan['operations'][number]): operation is WritePlan['operations'][number] & { readonly authority: 'none' } {
  return operation.authority === 'none'
}

function generatedSurfaceRecordForOperation(operation: WritePlan['operations'][number] & { readonly authority: 'none' }): GeneratedUserSurfaceRecord {
  switch (operation.kind) {
    case 'writeStructuredFile':
      return {
        path: operation.path,
        creator: operation.owner,
        authority: operation.authority,
        operationId: operation.id,
      }
    case 'writeManagedFile':
      return {
        path: operation.path,
        creator: operation.owner,
        authority: operation.authority,
        operationId: operation.id,
      }
    case 'writeGeneratedUserFile':
      return {
        path: operation.path,
        creator: operation.owner,
        authority: operation.authority,
        operationId: operation.id,
      }
  }
}

function lifecycleProvidersFor(graph: ResolvedGraph): readonly LifecycleProviderRecord[] {
  if (!hasEffectHarnessProvider(graph)) {
    return []
  }

  return [effectHarnessLifecycleProviderRecord(graph)]
}

function lifecycleSurfacesFor(graph: ResolvedGraph): readonly LifecycleSurfaceRecord[] {
  if (!hasEffectHarnessProvider(graph)) {
    return []
  }

  return effectHarnessLifecycleSurfaces()
}

export function buildManifest(input: {
  readonly preludeVersion: string
  readonly createSpec: CreateSpec
  readonly resolvedGraph: ResolvedGraph
  readonly writePlan: WritePlan
  readonly verification: VerificationResult
}): PreludeManifest {
  return {
    schemaVersion: 1,
    preludeVersion: input.preludeVersion,
    createSpec: toManifestCreateSpec(input.createSpec),
    resolvedGraph: input.resolvedGraph,
    pins: {
      packageManager: 'pnpm@10.33.4',
      typescript: 'catalog:',
    },
    lifecycleProviders: lifecycleProvidersFor(input.resolvedGraph),
    lifecycleSurfaces: lifecycleSurfacesFor(input.resolvedGraph),
    generatedUserSurfaces: input.writePlan.operations
      .filter(isGeneratedUserOperation)
      .map(generatedSurfaceRecordForOperation),
    verificationRecords: input.verification.records,
  }
}

export function encodeManifest(manifest: PreludeManifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`
}
