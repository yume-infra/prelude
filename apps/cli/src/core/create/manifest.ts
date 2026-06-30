import type {
  CreateSpec,
  GeneratedUserSurfaceRecord,
  MaintainProviderReference,
  PreludeManifest,
  ResolvedGraph,
  VerificationResult,
  WritePlan,
} from './model'
import {
  effectHarnessLifecycleProviderRecord,
  effectHarnessMaintainProviderReference,
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

function maintainProvidersFor(graph: ResolvedGraph): readonly MaintainProviderReference[] {
  if (!hasEffectHarnessProvider(graph)) {
    return []
  }

  return [effectHarnessMaintainProviderReference(effectHarnessLifecycleProviderRecord(graph))]
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
    maintainProviders: maintainProvidersFor(input.resolvedGraph),
    generatedUserSurfaces: input.writePlan.operations
      .filter(isGeneratedUserOperation)
      .map(generatedSurfaceRecordForOperation),
    verificationRecords: input.verification.records,
  }
}

export function encodeManifest(manifest: PreludeManifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`
}
