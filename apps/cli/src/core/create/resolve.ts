import type { CapabilityId, CreateSpec, JsonCreateSpec, LogicalSurface, ProviderId, ResolvedGraph, ResolvedProvider, RootCapabilityId } from './model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'
import { effectHarnessResolvedProvider, effectHarnessVerificationId } from './effect-harness-provider'

const packageManifestLogicalSurface = {
  id: 'package-manifest:root',
  materializer: 'package-json',
  owner: 'prelude',
} as const satisfies LogicalSurface

const generatedRootSourceLogicalSurface = {
  id: 'source:root/src/index.ts',
  materializer: 'generated-user-file',
  owner: 'capability:minimal-node-package',
} as const satisfies LogicalSurface

const generatedEffectSourceLogicalSurface = {
  id: 'source:root/src/index.ts',
  materializer: 'generated-user-file',
  owner: 'capability:effect-package',
} as const satisfies LogicalSurface

const rootCapabilityLogicalSurfaces: Partial<Record<RootCapabilityId, LogicalSurface>> = {
  linting: {
    id: 'eslint-root',
    materializer: 'eslint-config',
    owner: 'capability:linting',
  },
  knip: {
    id: 'knip-root',
    materializer: 'knip-config',
    owner: 'capability:knip',
  },
}

const effectHarnessLogicalSurface = {
  id: 'provider:effect-harness',
  materializer: 'provider-artifact',
  owner: 'capability:ai-harness',
} as const satisfies LogicalSurface

const supportedRootCapabilities = ['package-manager:pnpm', 'linting', 'knip', 'ai-harness'] as const satisfies readonly RootCapabilityId[]
const supportedPackageCapabilities = ['minimal-node-package', 'react-app', 'react-counter', 'effect-package'] as const satisfies readonly CapabilityId[]
const supportedProviders = ['effect-harness'] as const satisfies readonly ProviderId[]

const minimalVerification = [
  'minimal-create-files-present',
] as const

function isRootCapabilityId(capability: string): capability is RootCapabilityId {
  return supportedRootCapabilities.includes(capability as RootCapabilityId)
}

function isPackageCapabilityId(capability: string): capability is CapabilityId {
  return supportedPackageCapabilities.includes(capability as CapabilityId)
}

function isProviderId(provider: string): provider is ProviderId {
  return supportedProviders.includes(provider as ProviderId)
}

function reactStaticSurface(packageId: string, path: string): LogicalSurface {
  return {
    id: `react-app-static:${packageId}/${path}`,
    materializer: 'generated-user-file',
    owner: 'capability:react-app',
  }
}

function reactAppShellSurface(packageId: string): LogicalSurface {
  return {
    id: `react-app-shell:${packageId}`,
    materializer: 'react-app-shell',
    owner: 'capability:react-app',
  }
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

function resolveProviders(spec: CreateSpec, rootCapabilities: readonly RootCapabilityId[]): readonly ResolvedProvider[] {
  if (!rootCapabilities.includes('ai-harness') || !spec.providers.includes('effect-harness')) {
    return []
  }

  return [effectHarnessResolvedProvider(spec.package.id)]
}

function logicalSurfacesFor(spec: CreateSpec, rootCapabilities: readonly RootCapabilityId[]): readonly LogicalSurface[] {
  const surfaces: LogicalSurface[] = spec.package.capabilities.includes('react-app')
    ? [
        packageManifestLogicalSurface,
        reactStaticSurface(spec.package.id, 'index.html'),
        reactStaticSurface(spec.package.id, 'src/main.tsx'),
        reactAppShellSurface(spec.package.id),
      ]
    : [packageManifestLogicalSurface]

  for (const capability of rootCapabilities) {
    const surface = rootCapabilityLogicalSurfaces[capability]
    if (surface) {
      surfaces.push(surface)
    }
  }

  if (rootCapabilities.includes('ai-harness') && spec.providers.includes('effect-harness')) {
    surfaces.push(effectHarnessLogicalSurface)
  }

  if (spec.package.capabilities.includes('minimal-node-package')) {
    surfaces.push(generatedRootSourceLogicalSurface)
  }
  if (spec.package.capabilities.includes('effect-package')) {
    surfaces.push(generatedEffectSourceLogicalSurface)
  }

  return surfaces
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

  if (spec.package.capabilities.includes('react-app')) {
    return hasRootEngineeringFiles
      ? ['react-app-files-present', 'root-engineering-files-present', ...providerVerification]
      : ['react-app-files-present', ...providerVerification]
  }

  if (!hasRootEngineeringFiles) {
    return [...minimalVerification, ...providerVerification]
  }

  return [...minimalVerification, 'root-engineering-files-present', ...providerVerification]
}

const minimalLogicalSurfaces = [
  {
    id: 'package-manifest:root',
    materializer: 'package-json',
    owner: 'prelude',
  },
  {
    id: 'source:root/src/index.ts',
    materializer: 'generated-user-file',
    owner: 'capability:minimal-node-package',
  },
] as const satisfies readonly LogicalSurface[]

export function toManifestCreateSpec(spec: CreateSpec): JsonCreateSpec {
  return {
    topology: spec.topology,
    package: {
      id: spec.package.id,
      name: spec.package.name,
      capabilities: spec.package.capabilities,
    },
    rootCapabilities: spec.rootCapabilities,
    providers: spec.providers,
    overrides: spec.overrides,
  }
}

export function validateCreateSpec(spec: CreateSpec): Effect.Effect<void, SchemaContractError> {
  const issues: string[] = []

  if (spec.topology !== 'single-package') {
    issues.push(`unsupported topology "${spec.topology}"`)
  }

  const unsupportedRootCapabilities = spec.rootCapabilities.filter(capability => !isRootCapabilityId(capability))
  if (unsupportedRootCapabilities.length > 0) {
    issues.push(`unsupported root capabilities: ${unsupportedRootCapabilities.join(', ')}`)
  }

  const unsupportedPackageCapabilities = spec.package.capabilities.filter(capability => !isPackageCapabilityId(capability))
  if (unsupportedPackageCapabilities.length > 0) {
    issues.push(`unsupported package capabilities: ${unsupportedPackageCapabilities.join(', ')}`)
  }

  const unsupportedProviders = spec.providers.filter(provider => !isProviderId(provider))
  if (unsupportedProviders.length > 0) {
    issues.push(`unsupported providers: ${unsupportedProviders.join(', ')}`)
  }

  const selectedRuntimeCapabilities = spec.package.capabilities.filter(
    capability => capability === 'minimal-node-package' || capability === 'react-app' || capability === 'effect-package',
  )
  if (selectedRuntimeCapabilities.length === 0) {
    issues.push('one package runtime capability is required: minimal-node-package, react-app, or effect-package')
  }
  if (selectedRuntimeCapabilities.length > 1) {
    issues.push(`only one package runtime capability is supported: ${selectedRuntimeCapabilities.join(', ')}`)
  }
  if (spec.package.capabilities.includes('react-counter') && !spec.package.capabilities.includes('react-app')) {
    issues.push('react-counter requires react-app')
  }
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

  if (issues.length > 0) {
    return Effect.fail(new SchemaContractError({
      schema: 'CreateSpec',
      message: `Unsupported CreateSpec for the minimal creation path: ${issues.join('; ')}`,
      issueCount: issues.length,
    }))
  }

  return Effect.void
}

export function resolveCreateSpec(spec: CreateSpec): ResolvedGraph {
  const rootCapabilities = resolveRootCapabilities(spec)
  const providers = resolveProviders(spec, rootCapabilities)

  return {
    topology: 'single-package',
    rootPackage: {
      id: spec.package.id,
      name: spec.package.name,
      path: '.',
      capabilities: spec.package.capabilities,
    },
    packages: [],
    rootCapabilities,
    packageCapabilities: {
      [spec.package.id]: spec.package.capabilities,
    },
    providers,
    logicalSurfaces: rootCapabilities.length === 0 && spec.package.capabilities.includes('minimal-node-package')
      ? minimalLogicalSurfaces
      : logicalSurfacesFor(spec, rootCapabilities),
    verification: verificationFor(spec, rootCapabilities, providers),
  }
}
