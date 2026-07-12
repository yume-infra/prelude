import { Schema } from 'effect'

import {
  ArtifactFilePathSchema,
  NonEmptyCommandSchema,
  NonEmptyTextSchema,
  PackageNameSchema,
  PackageRootSchema,
  StableIdSchema,
} from './primitives.js'

export const PackageRequirementSchema = Schema.Struct({
  id: StableIdSchema,
  packageRoot: PackageRootSchema,
  packageName: PackageNameSchema,
  range: NonEmptyTextSchema,
  section: Schema.Literals(['dependencies', 'devDependencies']),
})

export type PackageRequirement = Schema.Schema.Type<typeof PackageRequirementSchema>

export const IssueSchema = Schema.Struct({
  id: StableIdSchema,
  summary: NonEmptyTextSchema,
  detail: Schema.optionalKey(NonEmptyTextSchema),
  evidence: Schema.optionalKey(NonEmptyTextSchema),
  guidance: Schema.optionalKey(ArtifactFilePathSchema),
})

export type Issue = Schema.Schema.Type<typeof IssueSchema>

export const CheckSchema = Schema.Struct({
  id: StableIdSchema,
  summary: NonEmptyTextSchema,
  packageRoot: PackageRootSchema,
  argv: NonEmptyCommandSchema,
})

export type Check = Schema.Schema.Type<typeof CheckSchema>
