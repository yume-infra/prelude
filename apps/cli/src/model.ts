import type { DecodedCanonicalTreeArchive } from '@sayoriqwq/prelude-contract'

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

export const PLAN_SCHEMA_VERSION = 2
export const EXECUTION_HASH_VERSION = 2

const OwnerSchema = Schema.Struct({
  integrationId: Schema.String,
  declarationId: Schema.String,
})

export type Owner = Schema.Schema.Type<typeof OwnerSchema>

const IntegrationPlanSchema = Schema.Struct({
  integrationId: Schema.String,
  packageRoots: Schema.NonEmptyArray(Schema.String),
  integrationWorkspace: Schema.String,
  module: Schema.String,
  descriptor: HarnessModuleDescriptorSchema,
  artifact: ArtifactIdentitySchema,
  plan: ModulePlanSchema,
})

export type IntegrationPlan = Schema.Schema.Type<typeof IntegrationPlanSchema>

const PlannedOutputSchema = Schema.Struct({
  owner: OwnerSchema,
  declaration: OutputSchema,
  resolvedPath: Schema.String,
  status: Schema.Literals(['converged', 'change']),
  currentHash: Schema.optionalKey(Schema.String),
  desiredHash: Schema.String,
  evidence: Schema.Array(Schema.String),
})

export type PlannedOutput = Schema.Schema.Type<typeof PlannedOutputSchema>

const RequirementResultSchema = Schema.Struct({
  owner: OwnerSchema,
  declaration: PackageRequirementSchema,
  selectionSatisfied: Schema.Boolean,
  installationSatisfied: Schema.Boolean,
  satisfied: Schema.Boolean,
  manifestHash: Schema.String,
  lockfileHash: Schema.String,
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

const PlanDocumentSchema = Schema.Struct({
  schemaVersion: Schema.Literal(PLAN_SCHEMA_VERSION),
  executionHashVersion: Schema.Literal(EXECUTION_HASH_VERSION),
  controlRoot: Schema.String,
  integrations: Schema.Array(IntegrationPlanSchema),
  outputs: Schema.Array(PlannedOutputSchema),
  requirements: Schema.Array(RequirementResultSchema),
  issues: Schema.Array(OwnedIssueSchema),
  checks: Schema.Array(OwnedCheckSchema),
  conflicts: Schema.Array(ConflictSchema),
  blocked: Schema.Boolean,
  converged: Schema.Boolean,
  executionHash: Schema.String,
})

export type PlanDocument = Schema.Schema.Type<typeof PlanDocumentSchema>

const CHECK_RESULT_SCHEMA_VERSION = 1

export interface CheckOutcome {
  readonly integrationId: string
  readonly checkId: string
  readonly exitCode: number | null
  readonly error?: string
}

type CheckFailureCode = 'non-converged' | 'checks-failed' | 'replan-failed' | 'check-failed'

type CheckPlanPhase = 'before-checks' | 'after-checks'

export interface CheckFailureEnvelope {
  readonly schemaVersion: typeof CHECK_RESULT_SCHEMA_VERSION
  readonly result: 'error'
  readonly error: {
    readonly code: CheckFailureCode
    readonly message: string
    readonly plan?: PlanDocument
    readonly planPhase?: CheckPlanPhase
    readonly checks?: ReadonlyArray<CheckOutcome>
    readonly replanError?: string
  }
}

export interface CheckFailureOptions {
  readonly code: CheckFailureCode
  readonly message: string
  readonly plan?: PlanDocument
  readonly planPhase?: CheckPlanPhase
  readonly checks?: ReadonlyArray<CheckOutcome>
  readonly replanError?: string
}

export function makeCheckFailureEnvelope(options: CheckFailureOptions): CheckFailureEnvelope {
  return {
    schemaVersion: CHECK_RESULT_SCHEMA_VERSION,
    result: 'error',
    error: {
      code: options.code,
      message: options.message,
      ...(options.plan === undefined ? {} : { plan: options.plan }),
      ...(options.planPhase === undefined ? {} : { planPhase: options.planPhase }),
      ...(options.checks === undefined ? {} : { checks: options.checks }),
      ...(options.replanError === undefined ? {} : { replanError: options.replanError }),
    },
  }
}

export function formatCheckFailure(envelope: CheckFailureEnvelope): string {
  const { error } = envelope
  const lines = [`Check failed: ${error.message}`]
  if (error.plan !== undefined) {
    const plan = error.plan
    lines.push(`Execution hash: ${plan.executionHash}`)
    lines.push('Changed Outputs:')
    const changed = plan.outputs.filter(output => output.status === 'change')
    lines.push(...(changed.length === 0 ? ['- none'] : changed.map(output => `- ${output.owner.integrationId}/${output.declaration.id} -> ${output.resolvedPath}`)))
    lines.push('Unsatisfied Requirements:')
    const unsatisfied = plan.requirements.filter(requirement => !requirement.satisfied)
    lines.push(...(unsatisfied.length === 0 ? ['- none'] : unsatisfied.map(requirement => `- ${requirement.owner.integrationId}/${requirement.declaration.id} -> ${requirement.declaration.packageRoot}: ${requirement.declaration.packageName} ${requirement.declaration.range}`)))
    lines.push('Issues:')
    lines.push(...(plan.issues.length === 0 ? ['- none'] : plan.issues.map(issue => `- ${issue.owner.integrationId}/${issue.declaration.id}: ${issue.declaration.summary}`)))
    lines.push('Conflicts:')
    lines.push(...(plan.conflicts.length === 0 ? ['- none'] : plan.conflicts.map(conflict => `- ${conflict.kind} (${conflict.owners.map(owner => `${owner.integrationId}/${owner.declarationId}`).join(', ')}): ${conflict.summary}`)))
  }
  if (error.checks !== undefined) {
    lines.push('Checks:')
    lines.push(...(error.checks.length === 0 ? ['- none'] : error.checks.map(check => `- ${check.integrationId}/${check.checkId}: ${check.exitCode === 0 ? 'passed' : check.exitCode === null ? `error${check.error === undefined ? '' : ` (${check.error})`}` : `failed (${check.exitCode})`}`)))
    if (error.plan !== undefined && error.planPhase === 'after-checks')
      lines.push(`finalPlanHash: ${error.plan.executionHash}`)
  }
  if (error.replanError !== undefined)
    lines.push(`replanError: ${error.replanError}`)
  lines.push('Review the Plan Document before approving apply.')
  return lines.join('\n')
}

export const decodePlanDocument = Schema.decodeUnknownSync(PlanDocumentSchema, {
  errors: 'all',
  onExcessProperty: 'error',
})

interface TreeOperationBase {
  readonly kind: 'tree'
  readonly owner: Owner
  readonly targetPath: string
  readonly desiredHash: string
  readonly changed: boolean
}

interface ManagedTreeOperation extends TreeOperationBase {
  readonly outputKind: 'ManagedTree'
  readonly sourcePath: string
}

interface PinnedReferenceTreeOperation extends TreeOperationBase {
  readonly outputKind: 'PinnedReferenceTree'
  readonly archive: DecodedCanonicalTreeArchive
}

export type TreeOperation = ManagedTreeOperation | PinnedReferenceTreeOperation

export interface FileOperation {
  readonly kind: 'file'
  readonly owners: ReadonlyArray<Owner>
  readonly targetPath: string
  readonly desiredContent: string
  readonly changed: boolean
}

export type ApplyOperation = TreeOperation | FileOperation

export interface PlannedConvergence {
  readonly controlRoot: string
  readonly document: PlanDocument
  readonly operations: ReadonlyArray<ApplyOperation>
  readonly installRequired: boolean
}

export function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(sortJson)

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareText(left, right))
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
    controlRoot: input.controlRoot,
    integrations: input.integrations.map(integration => ({
      integrationId: integration.integrationId,
      packageRoots: integration.packageRoots,
      integrationWorkspace: integration.integrationWorkspace,
      module: integration.module,
      descriptor: integration.descriptor,
      artifact: integration.artifact,
    })),
    outputs: input.outputs.map(output => ({
      owner: output.owner,
      declaration: output.declaration,
      resolvedPath: output.resolvedPath,
      status: output.status,
      ...(output.currentHash === undefined ? {} : { currentHash: output.currentHash }),
      desiredHash: output.desiredHash,
    })),
    requirements: input.requirements.map(requirement => ({
      owner: requirement.owner,
      declaration: requirement.declaration,
      selectionSatisfied: requirement.selectionSatisfied,
      installationSatisfied: requirement.installationSatisfied,
      manifestHash: requirement.manifestHash,
      lockfileHash: requirement.lockfileHash,
      ...(requirement.directDeclaration === undefined ? {} : { directDeclaration: requirement.directDeclaration }),
      ...(requirement.lockResolution === undefined ? {} : { lockResolution: requirement.lockResolution }),
      ...(requirement.installedVersion === undefined ? {} : { installedVersion: requirement.installedVersion }),
    })),
    issues: input.issues,
    checks: input.checks,
    conflicts: input.conflicts,
    blocked: input.blocked,
    converged: input.converged,
  }

  return sha256(stableJson(execution))
}

export function ownerKey(owner: Owner): string {
  return `${owner.integrationId}\0${owner.declarationId}`
}
