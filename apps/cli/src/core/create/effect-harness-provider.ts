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
export const effectHarnessProviderPath = '.prelude/providers/effect-harness/provider.json'
export const effectHarnessVerificationId = 'provider:effect-harness:create-contract'

const effectHarnessArtifact = {
  id: 'effect-harness',
  version: effectHarnessArtifactVersion,
  source: {
    repository: 'https://github.com/Effect-TS/effect-smol.git',
    branch: 'main',
    split: '95545bdc334f4cd27a14f3308e68114e5bed92f2',
  },
  packageBaseline: {
    'effect': '4.0.0-beta.83',
    '@effect/platform-node': '4.0.0-beta.83',
    '@effect/vitest': '4.0.0-beta.83',
    '@effect/tsgo': '0.14.4',
    '@effect/language-service': '0.86.2',
    '@typescript/native-preview': '7.0.0-dev.20260615.1',
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
  return effectHarnessLifecycleSurfaces().map(surface => surface.id)
}

export function effectHarnessLifecycleSurfaces(): readonly LifecycleSurfaceRecord[] {
  return [
    {
      id: 'provider-artifact:effect-harness',
      owner: 'provider:effect-harness',
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
  return {
    id: `package-manifest:root:${pointer}`,
    owner: 'provider:effect-harness',
    authority: 'bounded',
    kind: 'structuredPointer',
    path: 'package.json',
    pointer,
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
