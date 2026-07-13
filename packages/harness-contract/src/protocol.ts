import { Schema } from 'effect'

import { StableIdSchema } from './primitives.js'

export const MODULE_PROTOCOL_V2 = 2

export const V2_FEATURE = {
  artifactAssets: 'planning.artifact-assets',
  blockingIssues: 'issues.blocking',
  jsonKeyedItem: 'outputs.json-keyed-item',
  jsonValue: 'outputs.json-value',
  managedBlock: 'outputs.managed-block',
  managedTree: 'outputs.managed-tree',
  pinnedReferenceTree: 'outputs.pinned-reference-tree',
  packageRequirements: 'requirements.package',
  rootedLocators: 'locators.rooted',
  selectedPackageRoots: 'integrations.package-roots',
  targetChecks: 'checks.argv',
  targetObservation: 'planning.rooted-target-observation',
} as const

export const PRELUDE_V2_SUPPORTED_FEATURES = Object.freeze(
  Object.values(V2_FEATURE).sort(),
)

export const ProtocolVersionSchema = Schema.Finite.pipe(
  Schema.check(
    Schema.isInt(),
    Schema.isGreaterThan(0),
  ),
)

export type ProtocolVersion = Schema.Schema.Type<typeof ProtocolVersionSchema>

export const FeatureIdSchema = StableIdSchema
export type FeatureId = Schema.Schema.Type<typeof FeatureIdSchema>

function hasUniqueValues<Value>() {
  return Schema.makeFilter<ReadonlyArray<Value>>(
    values => new Set(values).size === values.length,
    { expected: 'unique values' },
  )
}

export const RequiredFeaturesSchema = Schema.Array(FeatureIdSchema).pipe(
  Schema.check(hasUniqueValues<FeatureId>()),
)

export type RequiredFeatures = Schema.Schema.Type<typeof RequiredFeaturesSchema>

export const HostProtocolSupportSchema = Schema.Struct({
  supportedProtocolVersions: Schema.NonEmptyArray(ProtocolVersionSchema).pipe(
    Schema.check(hasUniqueValues<ProtocolVersion>()),
  ),
  supportedFeatures: Schema.Array(FeatureIdSchema).pipe(
    Schema.check(hasUniqueValues<FeatureId>()),
  ),
})

export type HostProtocolSupport = Schema.Schema.Type<typeof HostProtocolSupportSchema>

export const ProtocolCompatibilitySchema = Schema.Union([
  Schema.Struct({
    compatible: Schema.Literal(true),
  }),
  Schema.Struct({
    compatible: Schema.Literal(false),
    reason: Schema.Literal('unsupportedProtocolVersion'),
    protocolVersion: ProtocolVersionSchema,
  }),
  Schema.Struct({
    compatible: Schema.Literal(false),
    reason: Schema.Literal('unsupportedRequiredFeatures'),
    unsupportedFeatures: Schema.NonEmptyArray(FeatureIdSchema),
  }),
])

export type ProtocolCompatibility = Schema.Schema.Type<typeof ProtocolCompatibilitySchema>

export interface ProtocolDescriptor {
  readonly protocolVersion: ProtocolVersion
  readonly requiredFeatures: ReadonlyArray<FeatureId>
}

export function checkProtocolCompatibility(
  descriptor: ProtocolDescriptor,
  host: HostProtocolSupport,
): ProtocolCompatibility {
  if (!host.supportedProtocolVersions.includes(descriptor.protocolVersion)) {
    return {
      compatible: false,
      reason: 'unsupportedProtocolVersion',
      protocolVersion: descriptor.protocolVersion,
    }
  }

  const supported = new Set(host.supportedFeatures)
  const unsupportedFeatures = Array.from(new Set(
    descriptor.requiredFeatures.filter(feature => !supported.has(feature)),
  )).sort()

  const [firstUnsupportedFeature, ...remainingUnsupportedFeatures] = unsupportedFeatures
  if (firstUnsupportedFeature !== undefined) {
    return {
      compatible: false,
      reason: 'unsupportedRequiredFeatures',
      unsupportedFeatures: [firstUnsupportedFeature, ...remainingUnsupportedFeatures],
    }
  }

  return { compatible: true }
}
