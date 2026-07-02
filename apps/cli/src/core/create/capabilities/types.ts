import type {
  CapabilityContribution,
  CapabilityId,
  EffectHarnessProviderDiscovery,
  JsonValue,
  LogicalSurface,
  ResolvedGraph,
  ResolvedPackage,
  RootCapabilityId,
} from '../model'

interface CapabilityRequirement {
  readonly anyOf?: readonly CapabilityId[]
  readonly allOf?: readonly CapabilityId[]
  readonly message: (packageId: string) => string
}

export interface PackageCapabilityContext {
  readonly graph: ResolvedGraph
  readonly pkg: ResolvedPackage
  readonly packageId: string
  readonly packageName: string
  readonly packageSurfaceScope: string
  readonly packageManifestSurfaceId: `package-manifest:${string}`
  readonly packageManifestScope: string
  readonly sourceScope: string
  readonly scopedPath: (filePath: string) => string
  readonly scopedTypeScriptConfigSurfaceId: string
  readonly scopedTsdownConfigSurfaceId: string
  readonly effectHarnessDiscovery?: EffectHarnessProviderDiscovery
}

interface RootCapabilityContext {
  readonly graph: ResolvedGraph
}

export interface PackageCapabilityDefinition {
  readonly id: CapabilityId
  readonly scope: 'package'
  readonly runtime: boolean
  readonly requirements?: readonly CapabilityRequirement[]
  readonly conflicts?: readonly CapabilityId[]
  readonly logicalSurfaces: (context: PackageCapabilityContext) => readonly LogicalSurface[]
  readonly contribute: (context: PackageCapabilityContext) => readonly CapabilityContribution[]
}

export interface RootCapabilityDefinition {
  readonly id: RootCapabilityId
  readonly scope: 'root'
  readonly requirements?: readonly RootCapabilityId[]
  readonly conflicts?: readonly RootCapabilityId[]
  readonly logicalSurfaces: () => readonly LogicalSurface[]
  readonly contribute: (context: RootCapabilityContext) => readonly CapabilityContribution[]
}

export type PackageManifestEntries = Record<string, JsonValue>
