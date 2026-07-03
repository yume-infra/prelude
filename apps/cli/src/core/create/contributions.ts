import type { CapabilityContribution, JsonValue, ProviderDiscoveries, ResolvedGraph, ResolvedPackage } from './model'
import {
  packageCapabilityContributions,
  rootCapabilityContributions,
} from './capabilities/registry'
import {
  rootVerifyContribution,
  workspaceGlobs,
  workspaceRootPackageEntries,
} from './capabilities/root'

function packageManifestSurfaceId(pkg: ResolvedPackage) {
  return pkg.path === '.' ? 'package-manifest:root' : `package-manifest:${pkg.path}` as const
}

function workspaceInternalDependencyEntries(pkg: ResolvedPackage): Record<string, JsonValue> | undefined {
  if (pkg.internalDependencies === undefined || pkg.internalDependencies.length === 0) {
    return undefined
  }

  return {
    dependencies: Object.fromEntries(
      pkg.internalDependencies.map(dependency => [dependency.dependencyName, dependency.range]),
    ),
  }
}

function workspaceRootContributions(graph: ResolvedGraph, providerDiscoveries: ProviderDiscoveries): CapabilityContribution[] {
  return [
    {
      kind: 'packageManifest',
      surfaceId: 'package-manifest:root',
      owner: 'topology:workspace',
      entries: workspaceRootPackageEntries(graph, providerDiscoveries.effectHarness),
    },
    {
      kind: 'workspaceManifest',
      surfaceId: 'workspace-manifest:root',
      owner: 'topology:workspace',
      globs: workspaceGlobs(graph.packages),
    },
    ...rootCapabilityContributions(graph, providerDiscoveries.effectHarness),
  ]
}

function collectWorkspacePackageContributions(graph: ResolvedGraph, pkg: ResolvedPackage, providerDiscoveries: ProviderDiscoveries): CapabilityContribution[] {
  const contributions: CapabilityContribution[] = []
  const internalDependencyEntries = workspaceInternalDependencyEntries(pkg)

  if (internalDependencyEntries !== undefined) {
    contributions.push({
      kind: 'packageManifest',
      surfaceId: packageManifestSurfaceId(pkg),
      owner: 'resolver:workspace-dependencies',
      entries: internalDependencyEntries,
    })
  }

  contributions.push(...packageCapabilityContributions(graph, pkg, providerDiscoveries.effectHarness))

  return contributions
}

export function collectCapabilityContributions(graph: ResolvedGraph, providerDiscoveries: ProviderDiscoveries): readonly CapabilityContribution[] {
  if (graph.topology === 'workspace') {
    return [
      ...workspaceRootContributions(graph, providerDiscoveries),
      ...graph.packages.flatMap(pkg => collectWorkspacePackageContributions(graph, pkg, providerDiscoveries)),
    ]
  }

  const verifyContribution = rootVerifyContribution(graph, providerDiscoveries.effectHarness)
  const verificationContributions: CapabilityContribution[] = Object.keys(verifyContribution).length === 0
    ? []
    : [{
        kind: 'packageManifest',
        surfaceId: 'package-manifest:root',
        owner: 'resolver:verification',
        entries: verifyContribution,
      }]

  return [
    ...packageCapabilityContributions(graph, graph.rootPackage, providerDiscoveries.effectHarness),
    ...rootCapabilityContributions(graph, providerDiscoveries.effectHarness),
    ...verificationContributions,
  ]
}
