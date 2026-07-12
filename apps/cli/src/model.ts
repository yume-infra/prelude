import { createHash } from 'node:crypto'

import {
  ArtifactIdentitySchema,
  CheckSchema,
  HarnessModuleDescriptorSchema,
  IssueSchema,
  ModulePlanSchema,
  OutputSchema,
  PackageRequirementSchema,
} from '@sayoriqwq/prelude-contract'
import { Schema } from 'effect'

const PLAN_SCHEMA_VERSION = 1
const EXECUTION_HASH_VERSION = 1

const OwnerSchema = Schema.Struct({
  integrationId: Schema.String,
  declarationId: Schema.String,
})

export type Owner = Schema.Schema.Type<typeof OwnerSchema>

const IntegrationPlanSchema = Schema.Struct({
  integrationId: Schema.String,
  packageRoot: Schema.String,
  module: Schema.String,
  descriptor: HarnessModuleDescriptorSchema,
  artifact: ArtifactIdentitySchema,
  plan: ModulePlanSchema,
})

export type IntegrationPlan = Schema.Schema.Type<typeof IntegrationPlanSchema>

const PlannedOutputSchema = Schema.Struct({
  owner: OwnerSchema,
  declaration: OutputSchema,
  status: Schema.Literals(['converged', 'change']),
  currentHash: Schema.optionalKey(Schema.String),
  desiredHash: Schema.String,
  evidence: Schema.Array(Schema.String),
})

export type PlannedOutput = Schema.Schema.Type<typeof PlannedOutputSchema>

const RequirementResultSchema = Schema.Struct({
  owner: OwnerSchema,
  declaration: PackageRequirementSchema,
  satisfied: Schema.Boolean,
  directDeclaration: Schema.optionalKey(Schema.String),
  lockResolution: Schema.optionalKey(Schema.String),
  installedVersion: Schema.optionalKey(Schema.String),
  evidence: Schema.Array(Schema.String),
})

export type RequirementResult = Schema.Schema.Type<typeof RequirementResultSchema>

const OwnedIssueSchema = Schema.Struct({
  owner: OwnerSchema,
  declaration: IssueSchema,
})

export type OwnedIssue = Schema.Schema.Type<typeof OwnedIssueSchema>

const OwnedCheckSchema = Schema.Struct({
  owner: OwnerSchema,
  declaration: CheckSchema,
})

export type OwnedCheck = Schema.Schema.Type<typeof OwnedCheckSchema>

const ConflictSchema = Schema.Struct({
  kind: Schema.Literals([
    'treeOverlap',
    'treeBoundedOverlap',
    'blockIdentity',
    'boundedFileKind',
    'jsonPointerOverlap',
    'jsonKeyIdentity',
    'packageRequirement',
    'invalidCurrentState',
  ]),
  owners: Schema.Array(OwnerSchema),
  summary: Schema.String,
})

export type Conflict = Schema.Schema.Type<typeof ConflictSchema>

const _PlanDocumentSchema = Schema.Struct({
  schemaVersion: Schema.Literal(PLAN_SCHEMA_VERSION),
  executionHashVersion: Schema.Literal(EXECUTION_HASH_VERSION),
  integrations: Schema.Array(IntegrationPlanSchema),
  outputs: Schema.Array(PlannedOutputSchema),
  requirements: Schema.Array(RequirementResultSchema),
  issues: Schema.Array(OwnedIssueSchema),
  checks: Schema.Array(OwnedCheckSchema),
  conflicts: Schema.Array(ConflictSchema),
  blocked: Schema.Boolean,
  executionHash: Schema.String,
})

export type PlanDocument = Schema.Schema.Type<typeof _PlanDocumentSchema>

export interface TreeOperation {
  readonly kind: 'tree'
  readonly owner: Owner
  readonly sourcePath: string
  readonly targetPath: string
  readonly desiredHash: string
  readonly changed: boolean
}

export interface FileOperation {
  readonly kind: 'file'
  readonly owners: ReadonlyArray<Owner>
  readonly targetPath: string
  readonly desiredContent: string
  readonly changed: boolean
}

export type ApplyOperation = TreeOperation | FileOperation

export interface PlannedConvergence {
  readonly document: PlanDocument
  readonly operations: ReadonlyArray<ApplyOperation>
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(sortJson)

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortJson(entry)]),
    )
  }

  return value
}

export function stableJson(value: unknown, pretty = false): string {
  return `${JSON.stringify(sortJson(value), null, pretty ? 2 : undefined)}${pretty ? '\n' : ''}`
}

export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

export function executionHash(input: Omit<PlanDocument, 'executionHash'>): string {
  const execution = {
    schemaVersion: input.schemaVersion,
    executionHashVersion: input.executionHashVersion,
    integrations: input.integrations.map(integration => ({
      integrationId: integration.integrationId,
      packageRoot: integration.packageRoot,
      module: integration.module,
      descriptor: integration.descriptor,
      artifact: integration.artifact,
    })),
    outputs: input.outputs.map(output => ({
      owner: output.owner,
      declaration: output.declaration,
      status: output.status,
      ...(output.currentHash === undefined ? {} : { currentHash: output.currentHash }),
      desiredHash: output.desiredHash,
    })),
    requirements: input.requirements.map(requirement => ({
      owner: requirement.owner,
      declaration: requirement.declaration,
      satisfied: requirement.satisfied,
      ...(requirement.directDeclaration === undefined ? {} : { directDeclaration: requirement.directDeclaration }),
      ...(requirement.lockResolution === undefined ? {} : { lockResolution: requirement.lockResolution }),
      ...(requirement.installedVersion === undefined ? {} : { installedVersion: requirement.installedVersion }),
    })),
    issues: input.issues.map(issue => ({ owner: issue.owner, id: issue.declaration.id })),
    checks: input.checks.map(check => ({
      owner: check.owner,
      declaration: {
        id: check.declaration.id,
        packageRoot: check.declaration.packageRoot,
        argv: check.declaration.argv,
      },
    })),
    conflicts: input.conflicts.map(conflict => ({ kind: conflict.kind, owners: conflict.owners })),
  }

  return sha256(stableJson(execution))
}

export function ownerKey(owner: Owner): string {
  return `${owner.integrationId}\0${owner.declarationId}`
}
