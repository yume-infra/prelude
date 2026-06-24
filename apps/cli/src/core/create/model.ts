import type { Effect } from 'effect'
import type { PackageName } from '@/brand/package-name'
import type { TargetDir } from '@/brand/target-dir'
import type { FileIOError, SchemaContractError } from '@/core/errors'

export type Topology = 'single-package' | 'workspace'
export type CapabilityId = 'minimal-node-package'

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
  readonly rootCapabilities: readonly []
  readonly packageCapabilities: Record<string, readonly CapabilityId[]>
  readonly providers: readonly []
  readonly logicalSurfaces: readonly LogicalSurface[]
  readonly verification: readonly string[]
}

export interface LogicalSurface {
  readonly id: string
  readonly owner: string
  readonly materializer: string
}

export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue }

export interface PackageManifestContribution {
  readonly kind: 'packageManifest'
  readonly surfaceId: 'package-manifest:root'
  readonly owner: string
  readonly entries: Record<string, JsonValue>
}

export interface GeneratedUserFileContribution {
  readonly kind: 'generatedUserFile'
  readonly surfaceId: 'source:root/src/index.ts'
  readonly owner: string
  readonly path: 'src/index.ts'
  readonly content: string
}

export type CapabilityContribution = PackageManifestContribution | GeneratedUserFileContribution

export interface WriteStructuredFileOperation {
  readonly id: 'write-package-json'
  readonly kind: 'writeStructuredFile'
  readonly owner: 'materializer:package-json'
  readonly surfaceId: 'package-manifest:root'
  readonly path: 'package.json'
  readonly authority: 'none'
  readonly value: Record<string, JsonValue>
}

export interface WriteGeneratedUserFileOperation {
  readonly id: 'write-root-source'
  readonly kind: 'writeGeneratedUserFile'
  readonly owner: 'capability:minimal-node-package'
  readonly surfaceId: 'source:root/src/index.ts'
  readonly path: 'src/index.ts'
  readonly authority: 'none'
  readonly content: string
}

export type WriteOperation = WriteStructuredFileOperation | WriteGeneratedUserFileOperation

export interface WritePlan {
  readonly operations: readonly WriteOperation[]
}

export interface VerificationRecord {
  readonly id: 'minimal-create-files-present'
  readonly status: 'passed'
  readonly checkedPaths: readonly ['package.json', 'src/index.ts']
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

export interface PreludeManifest {
  readonly schemaVersion: 1
  readonly preludeVersion: string
  readonly createSpec: JsonCreateSpec
  readonly resolvedGraph: ResolvedGraph
  readonly pins: {
    readonly packageManager: 'pnpm@10.33.4'
    readonly typescript: 'catalog:'
  }
  readonly lifecycleProviders: readonly []
  readonly lifecycleSurfaces: readonly []
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
