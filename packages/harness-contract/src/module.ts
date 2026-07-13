import type { Effect } from 'effect'
import type { ObservationLocator } from './locators.js'
import type { ArtifactPath, PackageRoot } from './primitives.js'
import { Schema } from 'effect'

import { CheckSchema, IssueSchema, PackageRequirementSchema } from './declarations.js'
import { ObservationLocatorSchema } from './locators.js'
import { OutputSchema } from './outputs.js'
import {
  ArtifactPathSchema,
  BarePackageExportSchema,
  NonEmptyTextSchema,
  PackageNameSchema,
  PackageRootSchema,
  StableIdSchema,
} from './primitives.js'
import {
  HostProtocolSupportSchema,
  ProtocolVersionSchema,
  RequiredFeaturesSchema,
} from './protocol.js'

export const HarnessModuleDescriptorSchema = Schema.Struct({
  harnessId: StableIdSchema,
  protocolVersion: ProtocolVersionSchema,
  requiredFeatures: RequiredFeaturesSchema,
})

export type HarnessModuleDescriptor = Schema.Schema.Type<typeof HarnessModuleDescriptorSchema>

const hasUniqueDeclarationIds = Schema.makeFilter<{
  readonly outputs: ReadonlyArray<{ readonly id: string }>
  readonly requirements: ReadonlyArray<{ readonly id: string }>
  readonly checks: ReadonlyArray<{ readonly id: string }>
  readonly issues: ReadonlyArray<{ readonly id: string }>
}>(
  (plan) => {
    const ids = [
      ...plan.outputs.map(output => output.id),
      ...plan.requirements.map(requirement => requirement.id),
      ...plan.checks.map(check => check.id),
      ...plan.issues.map(issue => issue.id),
    ]

    return new Set(ids).size === ids.length
  },
  { expected: 'declaration ids unique across one Module plan' },
)

export const ModulePlanSchema = Schema.Struct({
  outputs: Schema.Array(OutputSchema),
  requirements: Schema.Array(PackageRequirementSchema),
  checks: Schema.Array(CheckSchema),
  issues: Schema.Array(IssueSchema),
}).pipe(
  Schema.check(hasUniqueDeclarationIds),
)

export type ModulePlan = Schema.Schema.Type<typeof ModulePlanSchema>

export const IntegrationIdentitySchema = Schema.Struct({
  integrationId: StableIdSchema,
  packageRoots: Schema.NonEmptyArray(PackageRootSchema).pipe(
    Schema.check(
      Schema.isMaxLength(64),
      Schema.makeFilter(
        roots => new Set(roots).size === roots.length,
        { expected: 'unique Package Roots' },
      ),
    ),
  ),
})

export type IntegrationIdentity = Schema.Schema.Type<typeof IntegrationIdentitySchema>

export const ArtifactIdentitySchema = Schema.Struct({
  packageName: PackageNameSchema,
  packageVersion: NonEmptyTextSchema,
  module: BarePackageExportSchema,
  resolutionId: NonEmptyTextSchema,
})

export type ArtifactIdentity = Schema.Schema.Type<typeof ArtifactIdentitySchema>

export const HarnessModuleContextIdentitySchema = Schema.Struct({
  integration: IntegrationIdentitySchema,
  artifact: ArtifactIdentitySchema,
  host: HostProtocolSupportSchema,
})

export type HarnessModuleContextIdentity = Schema.Schema.Type<typeof HarnessModuleContextIdentitySchema>

export const DirectoryEntrySchema = Schema.Struct({
  name: NonEmptyTextSchema,
  kind: Schema.Literals(['file', 'directory', 'symbolicLink', 'other']),
})

export type DirectoryEntry = Schema.Schema.Type<typeof DirectoryEntrySchema>

export const ArtifactObservationErrorSchema = Schema.TaggedStruct('ArtifactObservationError', {
  operation: Schema.Literals(['readBytes', 'readText', 'readDirectory']),
  path: ArtifactPathSchema,
  message: NonEmptyTextSchema,
})

export type ArtifactObservationError = Schema.Schema.Type<typeof ArtifactObservationErrorSchema>

export const TargetObservationErrorSchema = Schema.TaggedStruct('TargetObservationError', {
  operation: Schema.Literals(['readBytes', 'readText', 'readDirectory', 'readPackageManifest']),
  locator: ObservationLocatorSchema,
  message: NonEmptyTextSchema,
})

export type TargetObservationError = Schema.Schema.Type<typeof TargetObservationErrorSchema>

export const ObservationErrorSchema = Schema.Union([
  ArtifactObservationErrorSchema,
  TargetObservationErrorSchema,
])

export type ObservationError = Schema.Schema.Type<typeof ObservationErrorSchema>

export interface ReadonlyArtifactAssets {
  readonly readBytes: (path: ArtifactPath) => Effect.Effect<Uint8Array | undefined, ArtifactObservationError>
  readonly readText: (path: ArtifactPath) => Effect.Effect<string | undefined, ArtifactObservationError>
  readonly readDirectory: (path: ArtifactPath) => Effect.Effect<ReadonlyArray<DirectoryEntry> | undefined, ArtifactObservationError>
}

export interface ReadonlyTarget {
  readonly readBytes: (locator: ObservationLocator) => Effect.Effect<Uint8Array | undefined, TargetObservationError>
  readonly readText: (locator: ObservationLocator) => Effect.Effect<string | undefined, TargetObservationError>
  readonly readDirectory: (locator: ObservationLocator) => Effect.Effect<ReadonlyArray<DirectoryEntry> | undefined, TargetObservationError>
  readonly readPackageManifest: (packageRoot: PackageRoot) => Effect.Effect<Schema.JsonObject | undefined, TargetObservationError>
}

export type HarnessModuleContext = HarnessModuleContextIdentity & {
  readonly artifactAssets: ReadonlyArtifactAssets
  readonly target: ReadonlyTarget
}

export interface HarnessModule<PlanError = never> {
  readonly descriptor: HarnessModuleDescriptor
  readonly plan: (context: HarnessModuleContext) => Effect.Effect<ModulePlan, PlanError>
}

export function defineHarnessModule<PlanError>(
  harnessModule: HarnessModule<PlanError>,
): HarnessModule<PlanError> {
  return harnessModule
}

export const decodeHarnessModuleDescriptor = Schema.decodeUnknownSync(
  HarnessModuleDescriptorSchema,
  { errors: 'all', onExcessProperty: 'error' },
)

export const encodeHarnessModuleDescriptor = Schema.encodeUnknownSync(
  HarnessModuleDescriptorSchema,
  { errors: 'all' },
)

export const decodeModulePlan = Schema.decodeUnknownSync(
  ModulePlanSchema,
  { errors: 'all', onExcessProperty: 'error' },
)

export const encodeModulePlan = Schema.encodeUnknownSync(
  ModulePlanSchema,
  { errors: 'all' },
)
