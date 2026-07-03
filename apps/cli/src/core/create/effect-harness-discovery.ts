import type { EffectHarnessPackageLocator, EffectHarnessProviderDiscovery, JsonValue } from './model'
import { Context, Effect, Layer, Schema } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'

const decodeJsonString = Schema.decodeUnknownSync(Schema.UnknownFromJsonString)
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

function decodeTargetManagedSurfaces(input: Record<string, unknown>): Record<string, JsonValue> {
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

  return targetManagedSurfaces
}

function decodePackageLocator(value: Record<string, unknown>): EffectHarnessPackageLocator {
  const packageFiles = value.packageFiles
  if (!Array.isArray(packageFiles) || !packageFiles.every(file => typeof file === 'string')) {
    throw new TypeError('expected packageLocator.packageFiles string array')
  }

  return {
    packageName: requireString(value, 'packageName'),
    packageVersion: requireString(value, 'packageVersion'),
    binName: requireString(value, 'binName'),
    binPath: requireString(value, 'binPath'),
    discoveryCommand: requireString(value, 'discoveryCommand'),
    packageFiles,
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

      const artifactOnlyReferences = requireJsonRecord(input, 'artifactOnlyReferences')
      const references = artifactOnlyReferences.references
      if (!isRecord(references) || !isJsonValue(references)) {
        throw new TypeError('expected artifactOnlyReferences.references JSON object')
      }

      return {
        schemaVersion: 1,
        artifactRoot: requireString(input, 'artifactRoot'),
        providerProfilePath: requireString(input, 'providerProfilePath'),
        providerProfileRelativePath: requireString(input, 'providerProfileRelativePath'),
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
        targetManagedSurfaces: decodeTargetManagedSurfaces(input),
        artifactOnlyReferences: {
          ...artifactOnlyReferences,
          references,
        },
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
      ChildProcess.make('npx', ['--yes', '@sayoriqwq/effect-harness', 'provider-discover']),
    ).pipe(
      Effect.mapError(error => EffectHarnessProviderDiscoveryError.make({
        message: `Failed to run effect-harness provider discovery command "npx --yes @sayoriqwq/effect-harness provider-discover": ${error instanceof Error ? error.message : String(error)}`,
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
