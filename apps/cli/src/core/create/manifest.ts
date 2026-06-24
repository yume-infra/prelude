import type {
  CreateSpec,
  GeneratedUserSurfaceRecord,
  PreludeManifest,
  ResolvedGraph,
  VerificationResult,
  WritePlan,
} from './model'
import { toManifestCreateSpec } from './resolve'

function generatedSurfaceRecordForOperation(operation: WritePlan['operations'][number]): GeneratedUserSurfaceRecord {
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
    lifecycleProviders: [],
    lifecycleSurfaces: [],
    generatedUserSurfaces: input.writePlan.operations.map(generatedSurfaceRecordForOperation),
    verificationRecords: input.verification.records,
  }
}

export function encodeManifest(manifest: PreludeManifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`
}
