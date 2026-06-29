import type { Effect } from 'effect'
import type { PackageName } from '@/brand/package-name'
import type { TargetDir } from '@/brand/target-dir'
import type { FileIOError, SchemaContractError } from '@/core/errors'

export type Topology = 'single-package' | 'workspace'
export type CapabilityId = 'minimal-node-package' | 'node-app' | 'react-app' | 'react-counter' | 'vue-app' | 'effect-package' | 'node-backend' | 'library' | 'cli-tool' | 'router:react-router' | 'router:vue-router' | 'state:jotai' | 'state:pinia' | 'css:less' | 'css:tailwind'
export type RootCapabilityId = 'package-manager:pnpm' | 'task-runner:turbo' | 'linting' | 'knip' | 'dependency-update:taze' | 'ai-harness'
export type ProviderId = 'effect-harness'
export type PackageManifestSurfaceId = `package-manifest:${string}`
export type WorkspaceManifestSurfaceId = 'workspace-manifest:root'
export type ReactAppShellSurfaceId = `react-app-shell:${string}`
export type VueAppShellSurfaceId = `vue-app-shell:${string}`
export type ReactAppEntrySurfaceId = `react-app-entry:${string}`
export type VueAppEntrySurfaceId = `vue-app-entry:${string}`
export type ViteConfigSurfaceId = `vite-config:${string}`
export type StyleSheetSurfaceId = `stylesheet:${string}/${string}`
type ProviderSurfaceId = `provider:${ProviderId}`
type SurfaceAuthority = 'none' | 'owner' | 'bounded'
type LifecycleConflictPolicy = 'block'
type LifecycleScope = 'entry' | 'file'

export interface CreateSpecPackage {
  readonly id: string
  readonly name: PackageName
  readonly capabilities: readonly CapabilityId[]
}

export interface CreateSpecInternalDependency {
  readonly target: {
    readonly by: 'id' | 'name'
    readonly value: string
  }
  readonly alias?: PackageName
}

export interface CreateSpecWorkspacePackage extends CreateSpecPackage {
  readonly internalDependencies: readonly CreateSpecInternalDependency[]
}

export interface SinglePackageCreateSpec {
  readonly topology: 'single-package'
  readonly package: CreateSpecPackage
  readonly rootCapabilities: readonly string[]
  readonly providers: readonly string[]
  readonly overrides: Record<string, never>
}

export interface WorkspaceCreateSpec {
  readonly topology: 'workspace'
  readonly packages: readonly CreateSpecWorkspacePackage[]
  readonly rootCapabilities: readonly string[]
  readonly providers: readonly string[]
  readonly overrides: Record<string, never>
}

export type CreateSpec = SinglePackageCreateSpec | WorkspaceCreateSpec

export interface CreateProjectOptions {
  readonly spec: CreateSpec
  readonly targetDir: TargetDir
  readonly preludeVersion: string
}

export interface CreateProjectPlan {
  readonly resolvedGraph: ResolvedGraph
  readonly writePlan: WritePlan
}

export interface ResolvedPackage {
  readonly id: string
  readonly name: string
  readonly path: string
  readonly capabilities: readonly CapabilityId[]
  readonly internalDependencies?: readonly ResolvedInternalDependency[]
}

export interface ResolvedInternalDependency {
  readonly targetPackageId: string
  readonly targetPackageName: string
  readonly dependencyName: string
  readonly range: string
}

export interface ResolvedGraph {
  readonly topology: Topology
  readonly rootPackage: ResolvedPackage
  readonly packages: readonly ResolvedPackage[]
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

export interface WorkspaceManifestContribution {
  readonly kind: 'workspaceManifest'
  readonly surfaceId: WorkspaceManifestSurfaceId
  readonly owner: string
  readonly globs: readonly string[]
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
  readonly operationId?: string
  readonly operationOwner?: string
  readonly content: string
}

export interface TypeScriptConfigContribution {
  readonly kind: 'typescriptConfig'
  readonly surfaceId: string
  readonly owner: string
  readonly value: Record<string, JsonValue>
}

export interface TsdownConfigContribution {
  readonly kind: 'tsdownConfig'
  readonly surfaceId: string
  readonly owner: string
}

export interface ReactAppShellContribution {
  readonly kind: 'reactAppShell'
  readonly surfaceId: ReactAppShellSurfaceId
  readonly owner: string
  readonly path: string
  readonly imports: readonly string[]
  readonly moduleDeclarations: readonly string[]
  readonly componentDeclarations: readonly string[]
  readonly content: readonly string[]
  readonly mainClassNameTokens: readonly string[]
  readonly routing: readonly 'react-router'[]
}

export interface VueAppShellContribution {
  readonly kind: 'vueAppShell'
  readonly surfaceId: VueAppShellSurfaceId
  readonly owner: string
  readonly path: string
  readonly scriptImports: readonly string[]
  readonly scriptSetup: readonly string[]
  readonly templateContent: readonly string[]
  readonly mainClassNameTokens: readonly string[]
  readonly routing: readonly 'vue-router'[]
}

export interface FrontendEntryContribution {
  readonly kind: 'frontendEntry'
  readonly surfaceId: ReactAppEntrySurfaceId | VueAppEntrySurfaceId
  readonly owner: string
  readonly path: string
  readonly framework?: 'react' | 'vue'
  readonly imports: readonly string[]
  readonly declarations: readonly string[]
  readonly appUse: readonly string[]
  readonly styleImports: readonly string[]
}

export interface ViteConfigContribution {
  readonly kind: 'viteConfig'
  readonly surfaceId: ViteConfigSurfaceId
  readonly owner: string
  readonly path: string
  readonly imports: readonly string[]
  readonly plugins: readonly string[]
}

export interface StyleSheetContribution {
  readonly kind: 'styleSheet'
  readonly surfaceId: StyleSheetSurfaceId
  readonly owner: string
  readonly path: string
  readonly content: readonly string[]
}

export interface ProviderArtifactContribution {
  readonly kind: 'providerArtifact'
  readonly surfaceId: ProviderSurfaceId
  readonly owner: `provider:${ProviderId}`
  readonly providerId: ProviderId
  readonly path: string
  readonly value: Record<string, JsonValue>
}

export interface ProviderManagedFileContribution {
  readonly kind: 'providerManagedFile'
  readonly surfaceId: string
  readonly operationId: string
  readonly owner: `provider:${ProviderId}`
  readonly providerId: ProviderId
  readonly path: string
  readonly content: string
}

export interface ProviderManagedBlockContribution {
  readonly kind: 'providerManagedBlock'
  readonly surfaceId: string
  readonly operationId: string
  readonly owner: `provider:${ProviderId}`
  readonly providerId: ProviderId
  readonly path: string
  readonly startMarker: string
  readonly endMarker: string
  readonly content: string
}

export type CapabilityContribution
  = | PackageManifestContribution
    | WorkspaceManifestContribution
    | EslintRootContribution
    | KnipRootContribution
    | GeneratedUserFileContribution
    | TypeScriptConfigContribution
    | TsdownConfigContribution
    | ReactAppShellContribution
    | VueAppShellContribution
    | FrontendEntryContribution
    | ViteConfigContribution
    | StyleSheetContribution
    | ProviderArtifactContribution
    | ProviderManagedFileContribution
    | ProviderManagedBlockContribution

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

export interface WriteManagedBlockOperation {
  readonly id: string
  readonly kind: 'writeManagedBlock'
  readonly owner: string
  readonly surfaceId: string
  readonly path: string
  readonly authority: 'bounded'
  readonly startMarker: string
  readonly endMarker: string
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

export type WriteOperation = WriteStructuredFileOperation | WriteManagedFileOperation | WriteManagedBlockOperation | WriteGeneratedUserFileOperation

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
  readonly topology: Topology
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

interface LifecycleSurfaceMetadata {
  readonly id: string
  readonly owner: `provider:${ProviderId}`
  readonly lifecycle: 'managed'
  readonly scope: LifecycleScope
  readonly locator: string
  readonly conflictPolicy: LifecycleConflictPolicy
  readonly contractVersion: string
  readonly implementationVersion: string
  readonly base?: string
  readonly snapshot?: string
  readonly operationId: string
}

interface OwnedFileLifecycleSurfaceRecord extends LifecycleSurfaceMetadata {
  readonly authority: 'owner'
  readonly kind: 'ownedFile'
  readonly path: string
}

interface StructuredPointerLifecycleSurfaceRecord extends LifecycleSurfaceMetadata {
  readonly authority: 'bounded'
  readonly kind: 'structuredPointer'
  readonly path: string
  readonly pointer: string
  readonly base: string
  readonly snapshot: string
}

interface ManagedBlockLifecycleSurfaceRecord extends LifecycleSurfaceMetadata {
  readonly authority: 'bounded'
  readonly kind: 'managedBlock'
  readonly path: string
  readonly startMarker: string
  readonly endMarker: string
  readonly base: string
  readonly snapshot: string
}

export type LifecycleSurfaceRecord = OwnedFileLifecycleSurfaceRecord | StructuredPointerLifecycleSurfaceRecord | ManagedBlockLifecycleSurfaceRecord

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

export interface JsonCreateSpecInternalDependency {
  readonly target: {
    readonly by: 'id' | 'name'
    readonly value: string
  }
  readonly alias?: string
}

export interface JsonCreateSpecWorkspacePackage extends JsonCreateSpecPackage {
  readonly internalDependencies: readonly JsonCreateSpecInternalDependency[]
}

export interface JsonSinglePackageCreateSpec {
  readonly topology: 'single-package'
  readonly package: JsonCreateSpecPackage
  readonly rootCapabilities: readonly string[]
  readonly providers: readonly string[]
  readonly overrides: Record<string, never>
}

export interface JsonWorkspaceCreateSpec {
  readonly topology: 'workspace'
  readonly packages: readonly JsonCreateSpecWorkspacePackage[]
  readonly rootCapabilities: readonly string[]
  readonly providers: readonly string[]
  readonly overrides: Record<string, never>
}

export type JsonCreateSpec = JsonSinglePackageCreateSpec | JsonWorkspaceCreateSpec
