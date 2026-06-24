import type { CreateSpec, JsonCreateSpec, LogicalSurface, ResolvedGraph, RootCapabilityId } from './model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'

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

const supportedRootCapabilities = ['package-manager:pnpm', 'linting', 'knip'] as const satisfies readonly RootCapabilityId[]

const minimalVerification = [
  'minimal-create-files-present',
] as const

function isRootCapabilityId(capability: string): capability is RootCapabilityId {
  return supportedRootCapabilities.includes(capability as RootCapabilityId)
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

function logicalSurfacesFor(rootCapabilities: readonly RootCapabilityId[]): readonly LogicalSurface[] {
  const surfaces: LogicalSurface[] = [packageManifestLogicalSurface]

  for (const capability of rootCapabilities) {
    const surface = rootCapabilityLogicalSurfaces[capability]
    if (surface) {
      surfaces.push(surface)
    }
  }

  surfaces.push(generatedRootSourceLogicalSurface)
  return surfaces
}

function verificationFor(rootCapabilities: readonly RootCapabilityId[]): readonly string[] {
  if (rootCapabilities.length === 0) {
    return minimalVerification
  }

  return [...minimalVerification, 'root-engineering-files-present']
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

  if (spec.providers.length > 0) {
    issues.push(`unsupported providers: ${spec.providers.join(', ')}`)
  }

  if (!spec.package.capabilities.includes('minimal-node-package')) {
    issues.push('minimal-node-package capability is required for the minimal creation path')
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
    providers: [],
    logicalSurfaces: rootCapabilities.length === 0 ? minimalLogicalSurfaces : logicalSurfacesFor(rootCapabilities),
    verification: verificationFor(rootCapabilities),
  }
}
