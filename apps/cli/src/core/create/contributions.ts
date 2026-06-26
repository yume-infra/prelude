import type { CapabilityContribution, JsonValue, ResolvedGraph, ResolvedPackage } from './model'
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
  if (!pkg.internalDependencies || pkg.internalDependencies.length === 0) {
    return undefined
  }

  return {
    dependencies: Object.fromEntries(
      pkg.internalDependencies.map(dependency => [dependency.dependencyName, dependency.range]),
    ),
  }
}

function workspaceRootContributions(graph: ResolvedGraph): CapabilityContribution[] {
  return [
    {
      kind: 'packageManifest',
      surfaceId: 'package-manifest:root',
      owner: 'topology:workspace',
      entries: workspaceRootPackageEntries(graph),
    },
    {
      kind: 'workspaceManifest',
      surfaceId: 'workspace-manifest:root',
      owner: 'topology:workspace',
      globs: workspaceGlobs(graph.packages),
    },
    ...rootCapabilityContributions(graph),
  ]
}

function collectWorkspacePackageContributions(graph: ResolvedGraph, pkg: ResolvedPackage): CapabilityContribution[] {
  const contributions: CapabilityContribution[] = []
  const internalDependencyEntries = workspaceInternalDependencyEntries(pkg)

  if (internalDependencyEntries) {
    contributions.push({
      kind: 'packageManifest',
      surfaceId: packageManifestSurfaceId(pkg),
      owner: 'resolver:workspace-dependencies',
      entries: internalDependencyEntries,
    })
  }

  contributions.push(...packageCapabilityContributions(graph, pkg))

  return contributions
}

export function collectCapabilityContributions(graph: ResolvedGraph): readonly CapabilityContribution[] {
  if (graph.topology === 'workspace') {
    return [
      ...workspaceRootContributions(graph),
      ...graph.packages.flatMap(pkg => collectWorkspacePackageContributions(graph, pkg)),
    ]
  }

  const verifyContribution = rootVerifyContribution(graph)
  const verificationContributions: CapabilityContribution[] = Object.keys(verifyContribution).length === 0
    ? []
    : [{
        kind: 'packageManifest',
        surfaceId: 'package-manifest:root',
        owner: 'resolver:verification',
        entries: verifyContribution,
      }]

  return [
    ...packageCapabilityContributions(graph, graph.rootPackage),
    ...rootCapabilityContributions(graph),
    ...verificationContributions,
  ]
}
