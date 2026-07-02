import type {
  CapabilityContribution,
  CapabilityId,
  EffectHarnessProviderDiscovery,
  LogicalSurface,
  ProviderId,
  ResolvedGraph,
  ResolvedPackage,
  RootCapabilityId,
} from '../model'
import type { PackageCapabilityDefinition } from './types'
import { effectHarnessContributions } from '../effect-harness-provider'
import { frontendCapabilityDefinitions } from './frontend'
import { makePackageCapabilityContext } from './helpers'
import { packageRuntimeCapabilityDefinitions } from './package-runtimes'
import { rootCapabilityDefinitions } from './root'

const packageCapabilityDefinitions: readonly PackageCapabilityDefinition[] = [
  ...packageRuntimeCapabilityDefinitions,
  ...frontendCapabilityDefinitions,
] as const

const supportedProviders: readonly string[] = ['effect-harness']

export function isRootCapabilityId(capability: string): capability is RootCapabilityId {
  return rootCapabilityDefinitions.some(definition => definition.id === capability)
}

export function isPackageCapabilityId(capability: string): capability is CapabilityId {
  return packageCapabilityDefinitions.some(definition => definition.id === capability)
}

export function isProviderId(provider: string): provider is ProviderId {
  return supportedProviders.includes(provider)
}

function packageCapabilityDefinition(capability: CapabilityId) {
  return packageCapabilityDefinitions.find(definition => definition.id === capability)
}

export function rootCapabilityDefinition(capability: RootCapabilityId) {
  return rootCapabilityDefinitions.find(definition => definition.id === capability)
}

export function runtimeCapabilityIds(): readonly CapabilityId[] {
  return packageCapabilityDefinitions
    .filter(definition => definition.runtime)
    .map(definition => definition.id)
}

export function packageCapabilityRequirements(capability: CapabilityId) {
  return packageCapabilityDefinition(capability)?.requirements ?? []
}

export function packageCapabilityConflicts(capability: CapabilityId) {
  return packageCapabilityDefinition(capability)?.conflicts ?? []
}

export function logicalSurfacesForPackageCapabilities(graph: ResolvedGraph, pkg: ResolvedPackage): readonly LogicalSurface[] {
  const context = makePackageCapabilityContext(graph, pkg)

  return pkg.capabilities.flatMap((capability) => {
    const definition = packageCapabilityDefinition(capability)
    return definition?.logicalSurfaces(context) ?? []
  })
}

export function packageCapabilityContributions(
  graph: ResolvedGraph,
  pkg: ResolvedPackage,
  effectHarnessDiscovery?: EffectHarnessProviderDiscovery,
): readonly CapabilityContribution[] {
  const context = makePackageCapabilityContext(graph, pkg, effectHarnessDiscovery)

  return pkg.capabilities.flatMap((capability) => {
    const definition = packageCapabilityDefinition(capability)
    return definition?.contribute(context) ?? []
  })
}

export function rootCapabilityContributions(
  graph: ResolvedGraph,
  effectHarnessDiscovery: EffectHarnessProviderDiscovery | undefined,
): readonly CapabilityContribution[] {
  const context = { graph }
  const rootContributions = graph.rootCapabilities.flatMap((capability) => {
    const definition = rootCapabilityDefinition(capability)
    return definition?.contribute(context) ?? []
  })

  if (!graph.providers.some(provider => provider.id === 'effect-harness')) {
    return rootContributions
  }

  if (effectHarnessDiscovery === undefined) {
    throw new Error('effect-harness provider discovery must be loaded before collecting provider contributions')
  }

  return [...rootContributions, ...effectHarnessContributions(effectHarnessDiscovery, graph)]
}
