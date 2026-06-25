import type { Effect } from 'effect'
import type { PackageName } from '@/brand/package-name'
import type { TargetDir } from '@/brand/target-dir'
import type { FileIOError, SchemaContractError } from '@/core/errors'

export type Topology = 'single-package' | 'workspace'
export type CapabilityId = 'minimal-node-package' | 'react-app' | 'react-counter' | 'effect-package'
export type RootCapabilityId = 'package-manager:pnpm' | 'linting' | 'knip' | 'ai-harness'
export type ProviderId = 'effect-harness'
export type PackageManifestSurfaceId = `package-manifest:${string}`
export type ReactAppShellSurfaceId = `react-app-shell:${string}`
type ProviderSurfaceId = `provider:${ProviderId}`
type SurfaceAuthority = 'none' | 'owner' | 'bounded'

export interface CreateSpecPackage {
  readonly id: string
  readonly name: PackageName
  readonly capabilities: readonly CapabilityId[]
}

export interface CreateSpec {
  readonly topology: Topology
  readonly package: CreateSpecPackage
  readonly rootCapabilities: readonly string[]
  readonly providers: readonly string[]
  readonly overrides: Record<string, never>
}

export interface CreateProjectOptions {
  readonly spec: CreateSpec
  readonly targetDir: TargetDir
  readonly preludeVersion: string
}

export interface ResolvedPackage {
  readonly id: string
  readonly name: string
  readonly path: '.'
  readonly capabilities: readonly CapabilityId[]
}

export interface ResolvedGraph {
  readonly topology: 'single-package'
  readonly rootPackage: ResolvedPackage
  readonly packages: readonly []
  readonly rootCapabilities: readonly RootCapabilityId[]
  readonly packageCapabilities: Record<string, readonly CapabilityId[]>
  readonly providers: readonly ResolvedProvider[]
  readonly logicalSurfaces: readonly LogicalSurface[]
  readonly verification: readonly string[]
}

export interface LogicalSurface {
  readonly id: string
  readonly owner: string
  readonly materializer: string
}

export interface ResolvedProvider {
  readonly id: ProviderId
  readonly contractVersion: string
  readonly artifactVersion: string
  readonly packageScopes: readonly string[]
}

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue }

export interface PackageManifestContribution {
  readonly kind: 'packageManifest'
  readonly surfaceId: PackageManifestSurfaceId
  readonly owner: string
  readonly entries: Record<string, JsonValue>
}

export interface EslintRootContribution {
  readonly kind: 'eslintRoot'
  readonly surfaceId: 'eslint-root'
  readonly owner: string
}

export interface KnipRootContribution {
  readonly kind: 'knipRoot'
  readonly surfaceId: 'knip-root'
  readonly owner: string
  readonly config: Record<string, JsonValue>
}

export interface GeneratedUserFileContribution {
  readonly kind: 'generatedUserFile'
  readonly surfaceId: string
  readonly owner: string
  readonly path: string
  readonly content: string
}

export interface ReactAppShellContribution {
  readonly kind: 'reactAppShell'
  readonly surfaceId: ReactAppShellSurfaceId
  readonly owner: string
  readonly imports: readonly string[]
  readonly declarations: readonly string[]
  readonly body: readonly string[]
}

export interface ProviderArtifactContribution {
  readonly kind: 'providerArtifact'
  readonly surfaceId: ProviderSurfaceId
  readonly owner: `provider:${ProviderId}`
  readonly providerId: ProviderId
  readonly path: string
  readonly value: Record<string, JsonValue>
}

export type CapabilityContribution
  = | PackageManifestContribution
    | EslintRootContribution
    | KnipRootContribution
    | GeneratedUserFileContribution
    | ReactAppShellContribution
    | ProviderArtifactContribution

export interface WriteStructuredFileOperation {
  readonly id: string
  readonly kind: 'writeStructuredFile'
  readonly owner: string
  readonly surfaceId: string
  readonly path: string
  readonly authority: SurfaceAuthority
  readonly value: Record<string, JsonValue>
}

export interface WriteManagedFileOperation {
  readonly id: string
  readonly kind: 'writeManagedFile'
  readonly owner: string
  readonly surfaceId: string
  readonly path: string
  readonly authority: SurfaceAuthority
  readonly content: string
}

export interface WriteGeneratedUserFileOperation {
  readonly id: string
  readonly kind: 'writeGeneratedUserFile'
  readonly owner: string
  readonly surfaceId: string
  readonly path: string
  readonly authority: 'none'
  readonly content: string
}

export type WriteOperation = WriteStructuredFileOperation | WriteManagedFileOperation | WriteGeneratedUserFileOperation

export interface WritePlan {
  readonly operations: readonly WriteOperation[]
}

export interface VerificationRecord {
  readonly id: string
  readonly status: 'passed'
  readonly checkedPaths: readonly string[]
}

export interface VerificationResult {
  readonly records: readonly VerificationRecord[]
}

export interface GeneratedUserSurfaceRecord {
  readonly path: string
  readonly creator: string
  readonly authority: 'none'
  readonly operationId: string
}

export interface ProviderArtifactRecord {
  readonly id: ProviderId
  readonly version: string
  readonly source: {
    readonly repository: string
    readonly branch: string
    readonly split: string
  }
  readonly packageBaseline: Record<string, string>
}

export interface ProviderProjectedContext {
  readonly topology: 'single-package'
  readonly packageScopes: readonly string[]
  readonly rootCapabilities: readonly RootCapabilityId[]
  readonly packageCapabilities: Record<string, readonly CapabilityId[]>
}

export interface LifecycleProviderRecord {
  readonly id: ProviderId
  readonly contractVersion: string
  readonly artifact: ProviderArtifactRecord
  readonly projectedContext: ProviderProjectedContext
  readonly lifecycleSurfaces: readonly string[]
  readonly verificationRecordId: string
}

interface OwnedFileLifecycleSurfaceRecord {
  readonly id: string
  readonly owner: `provider:${ProviderId}`
  readonly authority: 'owner'
  readonly kind: 'ownedFile'
  readonly path: string
  readonly snapshot?: string
  readonly operationId: string
}

interface StructuredPointerLifecycleSurfaceRecord {
  readonly id: string
  readonly owner: `provider:${ProviderId}`
  readonly authority: 'bounded'
  readonly kind: 'structuredPointer'
  readonly path: string
  readonly pointer: string
  readonly snapshot: string
  readonly operationId: string
}

export type LifecycleSurfaceRecord = OwnedFileLifecycleSurfaceRecord | StructuredPointerLifecycleSurfaceRecord

export interface PreludeManifest {
  readonly schemaVersion: 1
  readonly preludeVersion: string
  readonly createSpec: JsonCreateSpec
  readonly resolvedGraph: ResolvedGraph
  readonly pins: {
    readonly packageManager: 'pnpm@10.33.4'
    readonly typescript: 'catalog:'
  }
  readonly lifecycleProviders: readonly LifecycleProviderRecord[]
  readonly lifecycleSurfaces: readonly LifecycleSurfaceRecord[]
  readonly generatedUserSurfaces: readonly GeneratedUserSurfaceRecord[]
  readonly verificationRecords: readonly VerificationRecord[]
}

export interface CreateProjectResult {
  readonly resolvedGraph: ResolvedGraph
  readonly writePlan: WritePlan
  readonly verification: VerificationResult
  readonly manifest: PreludeManifest
}

export type CreateProjectError = FileIOError | SchemaContractError

export interface CreateFs {
  readonly exists: (path: string) => Effect.Effect<boolean, FileIOError>
  readonly readFileString: (path: string) => Effect.Effect<string, FileIOError>
  readonly writeFileString: (path: string, content: string) => Effect.Effect<void, FileIOError>
  readonly ensureDir: (path: string) => Effect.Effect<void, FileIOError>
}

export interface JsonCreateSpecPackage {
  readonly id: string
  readonly name: string
  readonly capabilities: readonly CapabilityId[]
}

export interface JsonCreateSpec {
  readonly topology: Topology
  readonly package: JsonCreateSpecPackage
  readonly rootCapabilities: readonly string[]
  readonly providers: readonly string[]
  readonly overrides: Record<string, never>
}
