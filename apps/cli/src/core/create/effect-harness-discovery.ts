import type {
  EffectHarnessArtifactOnlyReferenceAudit,
  EffectHarnessArtifactOnlyReferences,
  EffectHarnessPackageArtifactIdentity,
  EffectHarnessPackageLocator,
  EffectHarnessProviderDiscovery,
  EffectHarnessSemanticContributions,
  JsonValue,
} from './model'
import { Context, Effect, Layer, Schema } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'

const decodeJsonString = Schema.decodeUnknownSync(Schema.UnknownFromJsonString)
const providerArtifactDiscoveryCommand = 'npx --yes --package @sayoriqwq/effect-harness effect-harness provider-discover'
const targetManagedContributionKeys = [
  'packageJson',
  'tsconfig',
  'editorPolicy',
  'lintGuardrails',
  'testPolicy',
  'verificationPolicy',
] as const

class EffectHarnessProviderDiscoveryError extends Schema.TaggedErrorClass<EffectHarnessProviderDiscoveryError>()('EffectHarnessProviderDiscoveryError', {
  message: Schema.String,
}) {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return true
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue)
  }

  return isRecord(value) && Object.values(value).every(isJsonValue)
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw new TypeError(`expected string field ${key}`)
  }
  return value
}

function requireStringArrayValue(value: unknown, source: string): readonly string[] {
  if (!Array.isArray(value) || !value.every(file => typeof file === 'string')) {
    throw new TypeError(`expected ${source} string array`)
  }

  return value
}

function requireRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key]
  if (!isRecord(value)) {
    throw new TypeError(`expected object field ${key}`)
  }
  return value
}

function requireJsonRecord(record: Record<string, unknown>, key: string): Record<string, JsonValue> {
  const value = requireRecord(record, key)
  if (!isJsonValue(value)) {
    throw new TypeError(`expected JSON object field ${key}`)
  }
  return value
}

function decodeTargetManagedSurfaces(input: Record<string, unknown>): EffectHarnessProviderDiscovery['targetManagedSurfaces'] {
  const targetManagedSurfaces = requireJsonRecord(input, 'targetManagedSurfaces')
  const documentationBundle = targetManagedSurfaces.documentationBundle
  const snippets = targetManagedSurfaces.snippets
  const contributions = targetManagedSurfaces.contributions

  if (!isRecord(documentationBundle)) {
    throw new TypeError('expected targetManagedSurfaces.documentationBundle JSON object')
  }

  if (!isRecord(snippets)) {
    throw new TypeError('expected targetManagedSurfaces.snippets JSON object')
  }

  if (!isRecord(contributions)) {
    throw new TypeError('expected targetManagedSurfaces.contributions JSON object')
  }

  for (const key of targetManagedContributionKeys) {
    if (!isRecord(contributions[key])) {
      throw new TypeError(`expected targetManagedSurfaces.contributions.${key} JSON object`)
    }
  }

  return {
    ...targetManagedSurfaces,
    contributions: decodeSemanticContributions(contributions),
  }
}

function requireProviderArtifactContractRecord(record: Record<string, unknown>, key: string): Record<string, unknown> {
  try {
    return requireRecord(record, key)
  }
  catch (error) {
    throw new TypeError(`provider artifact discovery contract missing: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function requireProviderArtifactContractJsonRecord(record: Record<string, unknown>, key: string): Record<string, JsonValue> {
  try {
    return requireJsonRecord(record, key)
  }
  catch (error) {
    throw new TypeError(`provider artifact discovery contract missing: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function jsonValuesEqual(left: JsonValue, right: JsonValue): boolean {
  if (left === right) {
    return true
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((entry, index) => jsonValuesEqual(entry, right[index] as JsonValue))
  }

  if (!isRecord(left) || !isRecord(right)) {
    return false
  }

  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) =>
      key === rightKeys[index]
      && jsonValuesEqual(left[key] as JsonValue, right[key] as JsonValue),
    )
}

function decodeSemanticContributions(value: Record<string, unknown>): EffectHarnessSemanticContributions {
  return {
    packageJson: requireJsonRecord(value, 'packageJson'),
    tsconfig: requireJsonRecord(value, 'tsconfig'),
    editorPolicy: requireJsonRecord(value, 'editorPolicy'),
    lintGuardrails: requireJsonRecord(value, 'lintGuardrails'),
    testPolicy: requireJsonRecord(value, 'testPolicy'),
    verificationPolicy: requireJsonRecord(value, 'verificationPolicy'),
  } satisfies EffectHarnessSemanticContributions
}

function decodePackageLocator(value: Record<string, unknown>): EffectHarnessPackageLocator {
  return {
    packageName: requireString(value, 'packageName'),
    packageVersion: requireString(value, 'packageVersion'),
    binName: requireString(value, 'binName'),
    binPath: requireString(value, 'binPath'),
    discoveryCommand: requireString(value, 'discoveryCommand'),
    packageFiles: requireStringArrayValue(value.packageFiles, 'packageLocator.packageFiles'),
  }
}

function decodePackageArtifactIdentity(value: Record<string, unknown>): EffectHarnessPackageArtifactIdentity {
  const invocationFailureClassification = requireRecord(value, 'invocationFailureClassification')
  const sameNameCwdShortCircuit = requireRecord(invocationFailureClassification, 'sameNameCwdShortCircuit')
  const classification = requireString(sameNameCwdShortCircuit, 'classification')
  const code = requireString(sameNameCwdShortCircuit, 'code')

  if (classification !== 'npm-invocation-failure') {
    throw new TypeError(`expected packageArtifactIdentity.invocationFailureClassification.sameNameCwdShortCircuit.classification npm-invocation-failure, got ${classification}`)
  }

  if (code !== 'npm-same-name-cwd-short-circuit') {
    throw new TypeError(`expected packageArtifactIdentity.invocationFailureClassification.sameNameCwdShortCircuit.code npm-same-name-cwd-short-circuit, got ${code}`)
  }

  if (sameNameCwdShortCircuit.providerDiscoveryStarted !== false) {
    throw new TypeError('expected packageArtifactIdentity.invocationFailureClassification.sameNameCwdShortCircuit.providerDiscoveryStarted false')
  }

  return {
    packageName: requireString(value, 'packageName'),
    packageVersion: requireString(value, 'packageVersion'),
    packageManager: requireString(value, 'packageManager'),
    artifactRoot: requireString(value, 'artifactRoot'),
    packageJsonPath: requireString(value, 'packageJsonPath'),
    providerProfilePath: requireString(value, 'providerProfilePath'),
    npmSelector: requireString(value, 'npmSelector'),
    neutralDiscoveryCommand: requireString(value, 'neutralDiscoveryCommand'),
    invocationFailureClassification: {
      sameNameCwdShortCircuit: {
        classification: 'npm-invocation-failure',
        code: 'npm-same-name-cwd-short-circuit',
        providerDiscoveryStarted: false,
      },
    },
  }
}

function decodeArtifactOnlyReferences(value: Record<string, unknown>): EffectHarnessArtifactOnlyReferences {
  const packageSurface = requireStringArrayValue(value.packageSurface, 'artifactOnlyReferences.packageSurface')
  const references = requireJsonRecord(value, 'references')

  if (!packageSurface.includes('dist')) {
    throw new TypeError('expected artifactOnlyReferences.packageSurface to include dist')
  }

  return {
    mode: requireString(value, 'mode'),
    targetDelivery: requireString(value, 'targetDelivery'),
    packageSurface,
    references,
  }
}

function decodeArtifactOnlyReferenceAudit(value: Record<string, unknown>): EffectHarnessArtifactOnlyReferenceAudit {
  const mode = requireString(value, 'mode')
  if (mode !== 'artifact-only-reference-audit') {
    throw new TypeError(`expected artifactOnlyReferenceAudit.mode artifact-only-reference-audit, got ${mode}`)
  }

  const references = value.references
  if (!Array.isArray(references)) {
    throw new TypeError('expected artifactOnlyReferenceAudit.references array')
  }

  return {
    mode: 'artifact-only-reference-audit',
    references: references.map((reference, index) => {
      if (!isRecord(reference)) {
        throw new TypeError(`expected artifactOnlyReferenceAudit.references[${index}] object`)
      }

      if (reference.available !== true) {
        throw new TypeError(`expected artifactOnlyReferenceAudit.references[${index}].available true`)
      }

      return {
        id: requireString(reference, 'id'),
        path: requireString(reference, 'path'),
        sourceEntry: requireString(reference, 'sourceEntry'),
        targetDelivery: requireString(reference, 'targetDelivery'),
        available: true,
      }
    }),
  }
}

function decodeEffectHarnessProviderDiscovery(input: unknown): Effect.Effect<EffectHarnessProviderDiscovery, EffectHarnessProviderDiscoveryError> {
  return Effect.try({
    try: () => {
      if (!isRecord(input)) {
        throw new TypeError('expected provider discovery object')
      }

      if (input.schemaVersion !== 1) {
        throw new TypeError('expected provider discovery schemaVersion 1')
      }

      const provider = requireRecord(input, 'provider')
      const providerId = requireString(provider, 'id')
      if (providerId !== 'effect-harness') {
        throw new TypeError(`expected effect-harness provider id, got ${providerId}`)
      }

      const packageArtifactIdentity = decodePackageArtifactIdentity(requireProviderArtifactContractRecord(input, 'packageArtifactIdentity'))
      const semanticContributions = decodeSemanticContributions(requireProviderArtifactContractRecord(input, 'semanticContributions'))
      const targetManagedSurfaces = decodeTargetManagedSurfaces(input)
      const artifactOnlyReferences = decodeArtifactOnlyReferences(requireProviderArtifactContractJsonRecord(input, 'artifactOnlyReferences'))
      const artifactOnlyReferenceAudit = decodeArtifactOnlyReferenceAudit(requireProviderArtifactContractRecord(input, 'artifactOnlyReferenceAudit'))

      if (!jsonValuesEqual(semanticContributions, targetManagedSurfaces.contributions)) {
        throw new TypeError('provider artifact discovery contract missing: expected semanticContributions to match targetManagedSurfaces.contributions')
      }

      return {
        schemaVersion: 1,
        artifactRoot: requireString(input, 'artifactRoot'),
        providerProfilePath: requireString(input, 'providerProfilePath'),
        providerProfileRelativePath: requireString(input, 'providerProfileRelativePath'),
        packageArtifactIdentity,
        packageLocator: decodePackageLocator(requireRecord(input, 'packageLocator')),
        provider: {
          id: 'effect-harness',
          contractVersion: requireString(provider, 'contractVersion'),
          providerVersion: requireString(provider, 'providerVersion'),
          defaultProfile: requireString(provider, 'defaultProfile'),
        },
        selectedProfile: requireString(input, 'selectedProfile'),
        discovery: requireJsonRecord(input, 'discovery'),
        deliveryModes: requireJsonRecord(input, 'deliveryModes'),
        semanticContributions,
        targetManagedSurfaces,
        artifactOnlyReferences,
        artifactOnlyReferenceAudit,
        sourceIdentities: requireJsonRecord(input, 'sourceIdentities'),
        internalHarnessSurfaces: requireJsonRecord(input, 'internalHarnessSurfaces'),
      }
    },
    catch: error => EffectHarnessProviderDiscoveryError.make({
      message: `Invalid effect-harness provider discovery output: ${error instanceof Error ? error.message : String(error)}`,
    }),
  })
}

function discoverEffectHarnessProviderViaCli(
  spawner: ChildProcessSpawner.ChildProcessSpawner['Service'],
): Effect.Effect<EffectHarnessProviderDiscovery, EffectHarnessProviderDiscoveryError> {
  return Effect.gen(function* () {
    const output = yield* spawner.string(
      ChildProcess.make('npx', ['--yes', '--package', '@sayoriqwq/effect-harness', 'effect-harness', 'provider-discover']),
    ).pipe(
      Effect.mapError(error => EffectHarnessProviderDiscoveryError.make({
        message: `Failed to run effect-harness provider discovery command "${providerArtifactDiscoveryCommand}": ${error instanceof Error ? error.message : String(error)}`,
      })),
    )

    const parsed = yield* Effect.try({
      try: () => decodeJsonString(output),
      catch: error => EffectHarnessProviderDiscoveryError.make({
        message: `Failed to parse effect-harness provider discovery JSON: ${error instanceof Error ? error.message : String(error)}`,
      }),
    })

    return yield* decodeEffectHarnessProviderDiscovery(parsed)
  })
}

interface EffectHarnessProviderDiscoveryServiceShape {
  readonly discover: Effect.Effect<EffectHarnessProviderDiscovery, EffectHarnessProviderDiscoveryError>
}

export class EffectHarnessProviderDiscoveryService extends Context.Service<EffectHarnessProviderDiscoveryService, EffectHarnessProviderDiscoveryServiceShape>()('@sayoriqwq/prelude/core/create/effect-harness-discovery/EffectHarnessProviderDiscoveryService') {
  static readonly Default = Layer.effect(
    EffectHarnessProviderDiscoveryService,
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
      return EffectHarnessProviderDiscoveryService.of({
        discover: discoverEffectHarnessProviderViaCli(spawner),
      })
    }),
  )
}

export function effectHarnessProviderDiscoveryLayer(discovery: EffectHarnessProviderDiscovery) {
  return Layer.succeed(
    EffectHarnessProviderDiscoveryService,
    EffectHarnessProviderDiscoveryService.of({
      discover: Effect.succeed(discovery),
    }),
  )
}

export function effectHarnessProviderDiscoveryDecodeService(discovery: unknown) {
  return EffectHarnessProviderDiscoveryService.of({
    discover: decodeEffectHarnessProviderDiscovery(discovery),
  })
}
