export type AcceptanceCommand = {
  readonly phase: 'bootstrap' | 'prepare' | 'apply' | 'verify'
  readonly argv: ReadonlyArray<string>
}

export type PreparedPlanEvidence = {
  readonly schemaVersion: 1
  readonly phase: 'PREPARE'
  readonly plan: Record<string, unknown>
  readonly planHash: string
  readonly observedStateBinding: { readonly executionHash: string }
  readonly commands: ReadonlyArray<AcceptanceCommand>
  readonly targetRoot: string
}

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
  evidence: PreparedPlanEvidence,
  approvedPlanHash: string | undefined,
  approvedTargetRoot: string | undefined,
) {
  if (approvedPlanHash === undefined || approvedTargetRoot === undefined)
    throw new Error('APPLY requires explicit approval for the exact PREPARE plan hash and isolated target')
  if (approvedPlanHash !== evidence.planHash)
    throw new Error(`Approved PREPARE plan hash does not match: approved=${approvedPlanHash} prepared=${evidence.planHash}`)
  if (approvedTargetRoot !== evidence.targetRoot)
    throw new Error(`Approved isolated target does not match: approved=${approvedTargetRoot} prepared=${evidence.targetRoot}`)
  return { approved: true as const, planHash: approvedPlanHash, targetRoot: approvedTargetRoot }
}
