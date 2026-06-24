import type { CreateSpec, JsonCreateSpec, LogicalSurface, ResolvedGraph } from './model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'

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

  if (spec.rootCapabilities.length > 0) {
    issues.push(`unsupported root capabilities: ${spec.rootCapabilities.join(', ')}`)
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
  return {
    topology: 'single-package',
    rootPackage: {
      id: spec.package.id,
      name: spec.package.name,
      path: '.',
      capabilities: spec.package.capabilities,
    },
    packages: [],
    rootCapabilities: [],
    packageCapabilities: {
      [spec.package.id]: spec.package.capabilities,
    },
    providers: [],
    logicalSurfaces: minimalLogicalSurfaces,
    verification: ['minimal-create-files-present'],
  }
}
