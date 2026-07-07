import type {
  CapabilityId,
  CreateSpec,
  CreateSpecPackage,
  CreateSpecWorkspacePackage,
  EffectHarnessProviderDiscovery,
  LogicalSurface,
  ResolvedGraph,
  ResolvedInternalDependency,
  ResolvedPackage,
  ResolvedProvider,
  RootCapabilityId,
} from './model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'
import {
  isPackageCapabilityId,
  isProviderId,
  isRootCapabilityId,
  logicalSurfacesForPackageCapabilities,
  packageCapabilityConflicts,
  packageCapabilityRequirements,
  rootCapabilityDefinition,
  runtimeCapabilityIds,
} from './capabilities/registry'
import { effectHarnessResolvedProvider, effectHarnessVerificationId } from './effect-harness-provider'

const packageManifestLogicalSurface = {
  id: 'package-manifest:root',
  materializer: 'package-json',
  owner: 'prelude',
} as const satisfies LogicalSurface

const workspaceManifestLogicalSurface = {
  id: 'workspace-manifest:root',
  materializer: 'workspace-manifest',
  owner: 'prelude',
} as const satisfies LogicalSurface

const effectHarnessLogicalSurface = {
  id: 'provider:effect-harness',
  materializer: 'provider-artifact',
  owner: 'capability:ai-harness',
} as const satisfies LogicalSurface

function packageManifestSurface(scope: string): LogicalSurface {
  return scope === 'root'
    ? packageManifestLogicalSurface
    : {
        id: `package-manifest:${scope}`,
        materializer: 'package-json',
        owner: 'prelude',
      }
}

function packageManifestScopeForPackage(pkg: ResolvedPackage) {
  return pkg.path === '.' ? 'root' : pkg.path
}

function rootCapabilitySurfaces(rootCapabilities: readonly RootCapabilityId[]): readonly LogicalSurface[] {
  return rootCapabilities.flatMap((capability) => {
    const definition = rootCapabilityDefinition(capability)
    return definition?.logicalSurfaces() ?? []
  })
}

function resolveRootCapabilities(spec: CreateSpec): readonly RootCapabilityId[] {
  const rootCapabilities: RootCapabilityId[] = []

  for (const capability of spec.rootCapabilities) {
    if (isRootCapabilityId(capability) && !rootCapabilities.includes(capability)) {
      rootCapabilities.push(capability)
    }
  }

  return rootCapabilities
}

function resolveProviders(
  spec: CreateSpec,
  rootCapabilities: readonly RootCapabilityId[],
  effectHarnessDiscovery: EffectHarnessProviderDiscovery | undefined,
): readonly ResolvedProvider[] {
  if (!rootCapabilities.includes('ai-harness') || !spec.providers.includes('effect-harness')) {
    return []
  }

  if (effectHarnessDiscovery === undefined) {
    throw new Error('effect-harness provider discovery must be loaded before resolving effect-harness provider')
  }

  return spec.topology === 'workspace'
    ? [effectHarnessResolvedProvider(effectHarnessDiscovery, spec.packages.map(pkg => pkg.id))]
    : [effectHarnessResolvedProvider(effectHarnessDiscovery, spec.package.id)]
}

function logicalSurfacesForPackage(graph: ResolvedGraph, pkg: ResolvedPackage): readonly LogicalSurface[] {
  return [
    packageManifestSurface(packageManifestScopeForPackage(pkg)),
    ...logicalSurfacesForPackageCapabilities(graph, pkg),
  ]
}

function logicalSurfacesFor(
  graph: Omit<ResolvedGraph, 'logicalSurfaces'>,
): readonly LogicalSurface[] {
  return graph.topology === 'workspace'
    ? [
        packageManifestLogicalSurface,
        workspaceManifestLogicalSurface,
        ...rootCapabilitySurfaces(graph.rootCapabilities),
        ...(graph.providers.some(provider => provider.id === 'effect-harness') ? [effectHarnessLogicalSurface] : []),
        ...graph.packages.flatMap(pkg => logicalSurfacesForPackage(graph as ResolvedGraph, pkg)),
      ]
    : [
        packageManifestLogicalSurface,
        ...rootCapabilitySurfaces(graph.rootCapabilities),
        ...(graph.providers.some(provider => provider.id === 'effect-harness') ? [effectHarnessLogicalSurface] : []),
        ...logicalSurfacesForPackageCapabilities(graph as ResolvedGraph, graph.rootPackage),
      ]
}

function verificationFor(
  spec: CreateSpec,
  rootCapabilities: readonly RootCapabilityId[],
  providers: readonly ResolvedProvider[],
): readonly string[] {
  const hasRootEngineeringFiles = rootCapabilities.includes('linting') || rootCapabilities.includes('knip')
  const providerVerification = providers.some(provider => provider.id === 'effect-harness')
    ? [effectHarnessVerificationId]
    : []

  if (spec.topology === 'workspace') {
    const packageVerification = spec.packages.length === 0 ? [] : ['workspace-package-files-present']

    return [
      'workspace-root-files-present',
      ...packageVerification,
      ...(hasRootEngineeringFiles ? ['root-engineering-files-present'] : []),
      ...providerVerification,
    ]
  }

  if (spec.package.capabilities.includes('react-app')) {
    return hasRootEngineeringFiles
      ? ['react-app-files-present', 'root-engineering-files-present', ...providerVerification]
      : ['react-app-files-present', ...providerVerification]
  }

  if (spec.package.capabilities.includes('vue-app')) {
    return hasRootEngineeringFiles
      ? ['vue-app-files-present', 'root-engineering-files-present', ...providerVerification]
      : ['vue-app-files-present', ...providerVerification]
  }

  if (spec.package.capabilities.includes('node-app') || spec.package.capabilities.includes('node-backend') || spec.package.capabilities.includes('library')) {
    return hasRootEngineeringFiles
      ? ['node-package-files-present', 'root-engineering-files-present', ...providerVerification]
      : ['node-package-files-present', ...providerVerification]
  }

  if (spec.package.capabilities.includes('cli-tool')) {
    return hasRootEngineeringFiles
      ? ['cli-tool-files-present', 'root-engineering-files-present', ...providerVerification]
      : ['cli-tool-files-present', ...providerVerification]
  }

  if (!hasRootEngineeringFiles) {
    return ['minimal-create-files-present', ...providerVerification]
  }

  return ['minimal-create-files-present', 'root-engineering-files-present', ...providerVerification]
}

function selectedRuntimeCapabilities(pkg: CreateSpecPackage) {
  const runtimeCapabilities = runtimeCapabilityIds()
  return pkg.capabilities.filter(capability => runtimeCapabilities.includes(capability as CapabilityId))
}

function validateCapabilityRequirements(pkg: CreateSpecPackage, issues: string[]) {
  for (const capability of pkg.capabilities) {
    if (!isPackageCapabilityId(capability)) {
      continue
    }

    for (const requirement of packageCapabilityRequirements(capability)) {
      if (requirement.allOf?.some(required => !pkg.capabilities.includes(required)) ?? false) {
        issues.push(requirement.message(pkg.id))
      }
      if (requirement.anyOf !== undefined && !requirement.anyOf.some(required => pkg.capabilities.includes(required))) {
        issues.push(requirement.message(pkg.id))
      }
    }
  }
}

function validateCapabilityConflicts(pkg: CreateSpecPackage, issues: string[]) {
  const selectedRuntimes = selectedRuntimeCapabilities(pkg)
  const runtimeSet = new Set(selectedRuntimes)

  for (const capability of pkg.capabilities) {
    if (!isPackageCapabilityId(capability) || runtimeSet.has(capability)) {
      continue
    }

    for (const conflict of packageCapabilityConflicts(capability)) {
      if (pkg.capabilities.includes(conflict)) {
        issues.push(`${capability} conflicts with ${conflict} for ${pkg.id}`)
      }
    }
  }
}

function validatePackageCapabilities(pkg: CreateSpecPackage, issues: string[]) {
  const unsupportedPackageCapabilities = pkg.capabilities.filter(capability => !isPackageCapabilityId(capability))
  if (unsupportedPackageCapabilities.length > 0) {
    issues.push(`unsupported package capabilities for ${pkg.id}: ${unsupportedPackageCapabilities.join(', ')}`)
  }

  const selectedRuntimes = selectedRuntimeCapabilities(pkg)
  if (selectedRuntimes.length === 0) {
    issues.push(`one package runtime capability is required for ${pkg.id}: minimal-node-package, node-app, react-app, vue-app, effect-package, node-backend, library, or cli-tool`)
  }
  if (selectedRuntimes.length > 1) {
    issues.push(`only one package runtime capability is supported for ${pkg.id}: ${selectedRuntimes.join(', ')}`)
  }

  validateCapabilityRequirements(pkg, issues)
  validateCapabilityConflicts(pkg, issues)
}

function validateWorkspacePackageGraph(packages: readonly CreateSpecWorkspacePackage[], issues: string[]) {
  const packageIds = new Set<string>()
  const packageNames = new Set<string>()

  for (const pkg of packages) {
    if (!/^[a-z][a-z0-9-]*$/u.test(pkg.id)) {
      issues.push(`workspace package id must be kebab-case: ${pkg.id}`)
    }
    if (packageIds.has(pkg.id)) {
      issues.push(`duplicate workspace package id: ${pkg.id}`)
    }
    packageIds.add(pkg.id)

    if (packageNames.has(pkg.name)) {
      issues.push(`duplicate workspace package name: ${pkg.name}`)
    }
    packageNames.add(pkg.name)
  }

  for (const pkg of packages) {
    for (const dependency of pkg.internalDependencies) {
      const targetExists = dependency.target.by === 'id'
        ? packageIds.has(dependency.target.value)
        : packageNames.has(dependency.target.value)
      if (!targetExists) {
        issues.push(`${pkg.id} internal dependency target not found by ${dependency.target.by}: ${dependency.target.value}`)
        continue
      }
      if (
        (dependency.target.by === 'id' && dependency.target.value === pkg.id)
        || (dependency.target.by === 'name' && dependency.target.value === pkg.name)
      ) {
        issues.push(`${pkg.id} cannot depend on itself`)
      }
    }
  }
}

export function validateCreateSpec(spec: CreateSpec): Effect.Effect<void, SchemaContractError> {
  const issues: string[] = []

  const unsupportedRootCapabilities = spec.rootCapabilities.filter(capability => !isRootCapabilityId(capability))
  if (unsupportedRootCapabilities.length > 0) {
    issues.push(`unsupported root capabilities: ${unsupportedRootCapabilities.join(', ')}`)
  }

  const unsupportedProviders = spec.providers.filter(provider => !isProviderId(provider))
  if (unsupportedProviders.length > 0) {
    issues.push(`unsupported providers: ${unsupportedProviders.join(', ')}`)
  }

  if (spec.topology === 'workspace') {
    if (!Array.isArray(spec.packages)) {
      issues.push('workspace topology requires packages')
    }

    const workspacePackages = Array.isArray(spec.packages) ? spec.packages : []

    for (const pkg of workspacePackages) {
      validatePackageCapabilities(pkg, issues)
    }
    validateWorkspacePackageGraph(workspacePackages, issues)
    if (spec.providers.length > 0 && !spec.rootCapabilities.includes('ai-harness')) {
      issues.push('providers require root capability: ai-harness')
    }
    if (spec.rootCapabilities.includes('ai-harness') && spec.providers.length === 0) {
      issues.push('ai-harness requires provider: effect-harness')
    }
    if (spec.rootCapabilities.includes('ai-harness') && spec.providers.length > 1) {
      issues.push(`only one ai-harness provider is supported: ${spec.providers.join(', ')}`)
    }
    if (spec.providers.includes('effect-harness') && workspacePackages.length === 0) {
      issues.push('workspace effect-harness requires at least one package scope')
    }
  }
  else {
    validatePackageCapabilities(spec.package, issues)
    if (spec.providers.length > 0 && !spec.rootCapabilities.includes('ai-harness')) {
      issues.push('providers require root capability: ai-harness')
    }
    if (spec.rootCapabilities.includes('ai-harness') && spec.providers.length === 0) {
      issues.push('ai-harness requires provider: effect-harness')
    }
    if (spec.rootCapabilities.includes('ai-harness') && spec.providers.length > 1) {
      issues.push(`only one ai-harness provider is supported: ${spec.providers.join(', ')}`)
    }
    if (spec.providers.includes('effect-harness') && !spec.package.capabilities.includes('effect-package')) {
      issues.push('effect-harness requires effect-package')
    }
  }

  if (issues.length > 0) {
    return Effect.fail(SchemaContractError.make({
      schema: 'CreateSpec',
      message: `Unsupported CreateSpec for the minimal creation path: ${issues.join('; ')}`,
      issueCount: issues.length,
    }))
  }

  return Effect.void
}

function workspacePackagePath(pkg: CreateSpecWorkspacePackage) {
  return pkg.capabilities.includes('library')
    ? `libs/${pkg.id}`
    : `apps/${pkg.id}`
}

function resolveWorkspaceInternalDependencies(
  pkg: CreateSpecWorkspacePackage,
  packages: readonly CreateSpecWorkspacePackage[],
): readonly ResolvedInternalDependency[] {
  return pkg.internalDependencies.map((dependency) => {
    const target = dependency.target.by === 'id'
      ? packages.find(candidate => candidate.id === dependency.target.value)
      : packages.find(candidate => candidate.name === dependency.target.value)

    if (target === undefined) {
      throw new Error(`unvalidated workspace dependency target: ${dependency.target.value}`)
    }

    return {
      targetPackageId: target.id,
      targetPackageName: target.name,
      dependencyName: dependency.alias ?? target.name,
      range: dependency.alias === undefined ? 'workspace:*' : `workspace:${target.name}@*`,
    }
  })
}

function resolveWorkspacePackages(spec: Extract<CreateSpec, { topology: 'workspace' }>): readonly ResolvedPackage[] {
  return spec.packages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    path: workspacePackagePath(pkg),
    capabilities: pkg.capabilities,
    internalDependencies: resolveWorkspaceInternalDependencies(pkg, spec.packages),
  }))
}

function packageCapabilitiesFor(packages: readonly ResolvedPackage[]) {
  return Object.fromEntries(
    packages.map(pkg => [pkg.id, pkg.capabilities]),
  ) as Record<string, readonly CapabilityId[]>
}

function withLogicalSurfaces(graph: Omit<ResolvedGraph, 'logicalSurfaces'>): ResolvedGraph {
  return {
    ...graph,
    logicalSurfaces: logicalSurfacesFor(graph),
  }
}

export function resolveCreateSpec(spec: CreateSpec, effectHarnessDiscovery?: EffectHarnessProviderDiscovery): ResolvedGraph {
  const rootCapabilities = resolveRootCapabilities(spec)
  const providers = resolveProviders(spec, rootCapabilities, effectHarnessDiscovery)

  if (spec.topology === 'workspace') {
    const packages = resolveWorkspacePackages(spec)

    return withLogicalSurfaces({
      topology: 'workspace',
      rootPackage: {
        id: 'root',
        name: 'workspace-root',
        path: '.',
        capabilities: [],
      },
      packages,
      rootCapabilities,
      packageCapabilities: packageCapabilitiesFor(packages),
      providers,
      verification: verificationFor(spec, rootCapabilities, providers),
    })
  }

  const rootPackage: ResolvedPackage = {
    id: spec.package.id,
    name: spec.package.name,
    path: '.',
    capabilities: spec.package.capabilities,
  }

  return withLogicalSurfaces({
    topology: 'single-package',
    rootPackage,
    packages: [],
    rootCapabilities,
    packageCapabilities: {
      [spec.package.id]: spec.package.capabilities,
    },
    providers,
    verification: verificationFor(spec, rootCapabilities, providers),
  })
}
