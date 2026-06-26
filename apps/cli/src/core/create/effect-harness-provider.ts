import type {
  CapabilityContribution,
  JsonValue,
  LifecycleProviderRecord,
  LifecycleSurfaceRecord,
  ProviderArtifactRecord,
  ProviderProjectedContext,
  ResolvedGraph,
  ResolvedProvider,
  VerificationRecord,
} from './model'

const effectHarnessContractVersion = '1'
const effectHarnessArtifactVersion = '0.1.0'
const effectHarnessProviderPath = '.prelude/providers/effect-harness/provider.json'
export const effectHarnessVerificationId = 'provider:effect-harness:create-contract'
const effectHarnessSurfaceIds = [
  'provider-artifact:effect-harness',
  'package-manifest:root:/dependencies/effect',
  'package-manifest:root:/dependencies/@effect~1platform-node',
  'package-manifest:root:/devDependencies/@effect~1vitest',
  'package-manifest:root:/devDependencies/@effect~1tsgo',
  'package-manifest:root:/devDependencies/@effect~1language-service',
  'package-manifest:root:/devDependencies/@typescript~1native-preview',
] as const

const effectHarnessArtifact = {
  id: 'effect-harness',
  version: effectHarnessArtifactVersion,
  source: {
    repository: 'https://github.com/Effect-TS/effect-smol.git',
    branch: 'main',
    split: '3475ee6c2bda6b05c6d7a12ce30c8bb840b5b1a6',
  },
  packageBaseline: {
    'effect': '4.0.0-beta.90',
    '@effect/platform-node': '4.0.0-beta.90',
    '@effect/vitest': '4.0.0-beta.90',
    '@effect/tsgo': '0.14.6',
    '@effect/language-service': '0.86.2',
    '@typescript/native-preview': '7.0.0-dev.20260624.1',
  },
} as const satisfies ProviderArtifactRecord

export function effectHarnessResolvedProvider(packageId: string): ResolvedProvider {
  return {
    id: 'effect-harness',
    contractVersion: effectHarnessContractVersion,
    artifactVersion: effectHarnessArtifactVersion,
    packageScopes: [packageId],
  }
}

export function hasEffectHarnessProvider(graph: ResolvedGraph) {
  return graph.providers.some(provider => provider.id === 'effect-harness')
}

function effectHarnessProjectedContext(graph: ResolvedGraph): ProviderProjectedContext {
  return {
    topology: graph.topology,
    packageScopes: graph.providers.find(provider => provider.id === 'effect-harness')?.packageScopes ?? [],
    rootCapabilities: graph.rootCapabilities,
    packageCapabilities: graph.packageCapabilities,
  }
}

function effectHarnessProviderSurfaceIds(): readonly string[] {
  return effectHarnessSurfaceIds
}

function lifecycleSurfaceMetadata(input: {
  readonly id: string
  readonly scope: 'entry' | 'file'
  readonly locator: string
  readonly base?: string
}) {
  return {
    id: input.id,
    owner: 'provider:effect-harness',
    lifecycle: 'managed',
    scope: input.scope,
    locator: input.locator,
    conflictPolicy: 'block',
    contractVersion: effectHarnessContractVersion,
    implementationVersion: effectHarnessArtifactVersion,
    ...(input.base === undefined ? {} : { base: input.base, snapshot: input.base }),
  } as const
}

function encodeJsonValue(value: Record<string, JsonValue>) {
  return `${JSON.stringify(value, null, 2)}\n`
}

export function effectHarnessLifecycleSurfaces(graph: ResolvedGraph): readonly LifecycleSurfaceRecord[] {
  const providerArtifactBase = encodeJsonValue(providerJsonValue(graph))

  return [
    {
      ...lifecycleSurfaceMetadata({
        id: 'provider-artifact:effect-harness',
        scope: 'file',
        locator: effectHarnessProviderPath,
        base: providerArtifactBase,
      }),
      authority: 'owner',
      kind: 'ownedFile',
      path: effectHarnessProviderPath,
      operationId: 'write-effect-harness-provider-record',
    },
    effectPackagePointer('/dependencies/effect', effectHarnessArtifact.packageBaseline.effect),
    effectPackagePointer('/dependencies/@effect~1platform-node', effectHarnessArtifact.packageBaseline['@effect/platform-node']),
    effectPackagePointer('/devDependencies/@effect~1vitest', effectHarnessArtifact.packageBaseline['@effect/vitest']),
    effectPackagePointer('/devDependencies/@effect~1tsgo', effectHarnessArtifact.packageBaseline['@effect/tsgo']),
    effectPackagePointer('/devDependencies/@effect~1language-service', effectHarnessArtifact.packageBaseline['@effect/language-service']),
    effectPackagePointer('/devDependencies/@typescript~1native-preview', effectHarnessArtifact.packageBaseline['@typescript/native-preview']),
  ]
}

function effectPackagePointer(pointer: string, snapshot: string): LifecycleSurfaceRecord {
  const id = `package-manifest:root:${pointer}`

  return {
    ...lifecycleSurfaceMetadata({
      id,
      scope: 'entry',
      locator: `package.json#${pointer}`,
      base: snapshot,
    }),
    authority: 'bounded',
    kind: 'structuredPointer',
    path: 'package.json',
    pointer,
    base: snapshot,
    snapshot,
    operationId: 'write-package-json',
  }
}

export function effectHarnessLifecycleProviderRecord(graph: ResolvedGraph): LifecycleProviderRecord {
  return {
    id: 'effect-harness',
    contractVersion: effectHarnessContractVersion,
    artifact: effectHarnessArtifact,
    projectedContext: effectHarnessProjectedContext(graph),
    lifecycleSurfaces: effectHarnessProviderSurfaceIds(),
    verificationRecordId: effectHarnessVerificationId,
  }
}

export function effectHarnessVerificationRecord(): VerificationRecord {
  return {
    id: effectHarnessVerificationId,
    status: 'passed',
    checkedPaths: ['package.json', effectHarnessProviderPath],
  }
}

function providerJsonValue(graph: ResolvedGraph): Record<string, JsonValue> {
  const projectedContext = effectHarnessProjectedContext(graph)

  return {
    id: 'effect-harness',
    contractVersion: effectHarnessContractVersion,
    artifact: {
      id: effectHarnessArtifact.id,
      version: effectHarnessArtifact.version,
      source: {
        repository: effectHarnessArtifact.source.repository,
        branch: effectHarnessArtifact.source.branch,
        split: effectHarnessArtifact.source.split,
      },
      packageBaseline: {
        'effect': effectHarnessArtifact.packageBaseline.effect,
        '@effect/platform-node': effectHarnessArtifact.packageBaseline['@effect/platform-node'],
        '@effect/vitest': effectHarnessArtifact.packageBaseline['@effect/vitest'],
        '@effect/tsgo': effectHarnessArtifact.packageBaseline['@effect/tsgo'],
        '@effect/language-service': effectHarnessArtifact.packageBaseline['@effect/language-service'],
        '@typescript/native-preview': effectHarnessArtifact.packageBaseline['@typescript/native-preview'],
      },
    },
    projectedContext: {
      topology: projectedContext.topology,
      packageScopes: projectedContext.packageScopes,
      rootCapabilities: projectedContext.rootCapabilities,
      packageCapabilities: Object.fromEntries(
        Object.entries(projectedContext.packageCapabilities).map(([packageId, capabilities]) => [packageId, [...capabilities]]),
      ),
    },
    lifecycleSurfaces: effectHarnessProviderSurfaceIds(),
    verification: {
      id: effectHarnessVerificationId,
      status: 'passed',
    },
  }
}

export function effectHarnessContributions(graph: ResolvedGraph): readonly CapabilityContribution[] {
  return [
    {
      kind: 'packageManifest',
      surfaceId: 'package-manifest:root',
      owner: 'provider:effect-harness',
      entries: {
        dependencies: {
          '@effect/platform-node': effectHarnessArtifact.packageBaseline['@effect/platform-node'],
          'effect': effectHarnessArtifact.packageBaseline.effect,
        },
        devDependencies: {
          '@effect/language-service': effectHarnessArtifact.packageBaseline['@effect/language-service'],
          '@effect/tsgo': effectHarnessArtifact.packageBaseline['@effect/tsgo'],
          '@effect/vitest': effectHarnessArtifact.packageBaseline['@effect/vitest'],
          '@typescript/native-preview': effectHarnessArtifact.packageBaseline['@typescript/native-preview'],
          'typescript': 'catalog:',
        },
      },
    },
    {
      kind: 'providerArtifact',
      surfaceId: 'provider:effect-harness',
      owner: 'provider:effect-harness',
      providerId: 'effect-harness',
      path: effectHarnessProviderPath,
      value: providerJsonValue(graph),
    },
  ]
}
