import { Schema } from 'effect'

const AcceptanceCommandSchema = Schema.Struct({
  phase: Schema.Literals(['bootstrap', 'prepare', 'apply', 'verify']),
  argv: Schema.Array(Schema.String),
})

const PreparedPlanEvidenceSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  phase: Schema.Literal('PREPARE'),
  plan: Schema.Record(Schema.String, Schema.Unknown),
  planHash: Schema.String,
  observedStateBinding: Schema.Struct({ executionHash: Schema.String }),
  commands: Schema.Array(AcceptanceCommandSchema),
  targetRoot: Schema.String,
})

export type AcceptanceCommand = Schema.Schema.Type<typeof AcceptanceCommandSchema>

export type PreparedPlanEvidence = Schema.Schema.Type<typeof PreparedPlanEvidenceSchema>

export function makePreparedPlanEvidence(input: {
  readonly plan: Record<string, unknown>
  readonly commands: ReadonlyArray<AcceptanceCommand>
  readonly targetRoot: string
}): PreparedPlanEvidence {
  const planHash = input.plan.executionHash
  if (typeof planHash !== 'string' || !/^[a-f0-9]{64}$/u.test(planHash))
    throw new Error('PREPARE requires a canonical Plan Document execution hash')
  return {
    schemaVersion: 1,
    phase: 'PREPARE',
    plan: input.plan,
    planHash,
    observedStateBinding: { executionHash: planHash },
    commands: input.commands,
    targetRoot: input.targetRoot,
  }
}

export function authorizePreparedPlan(
  input: unknown,
  approvedPlanHash: string | undefined,
  approvedTargetRoot: string | undefined,
  actualTargetRoot: string,
) {
  const evidence = decodePreparedPlanEvidence(input)
  if (evidence.plan.executionHash !== evidence.planHash || evidence.observedStateBinding.executionHash !== evidence.planHash)
    throw new Error('PREPARE evidence Plan hash and observed-state binding must agree')
  if (!/^[a-f0-9]{64}$/u.test(evidence.planHash))
    throw new Error('PREPARE evidence requires a canonical Plan Document execution hash')
  if (evidence.targetRoot !== actualTargetRoot)
    throw new Error(`PREPARE evidence target does not match the actual isolated target: evidence=${evidence.targetRoot} actual=${actualTargetRoot}`)
  if (evidence.commands.some(command => !['bootstrap', 'prepare', 'apply', 'verify'].includes(command.phase) || command.argv.length === 0))
    throw new Error('PREPARE evidence contains an invalid lifecycle command')
  if (approvedPlanHash === undefined || approvedTargetRoot === undefined)
    throw new Error('APPLY requires explicit approval for the exact PREPARE plan hash and isolated target')
  if (approvedPlanHash !== evidence.planHash)
    throw new Error(`Approved PREPARE plan hash does not match: approved=${approvedPlanHash} prepared=${evidence.planHash}`)
  if (approvedTargetRoot !== evidence.targetRoot)
    throw new Error(`Approved isolated target does not match: approved=${approvedTargetRoot} prepared=${evidence.targetRoot}`)
  return { approved: true as const, planHash: approvedPlanHash, targetRoot: approvedTargetRoot }
}

export const decodePreparedPlanEvidence = Schema.decodeUnknownSync(PreparedPlanEvidenceSchema, {
  errors: 'all',
  onExcessProperty: 'error',
})
