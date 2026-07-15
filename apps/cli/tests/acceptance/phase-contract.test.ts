import { strict as assert } from 'node:assert'

import { describe, it } from '@effect/vitest'
import { Effect } from 'effect'

import { authorizePreparedPlan, makePreparedPlanEvidence } from './phase.ts'

describe('packed acceptance PREPARE/APPLY contract', () => {
  it.effect('preserves the exact plan, observed-state binding, commands, hash, and isolated target', () => Effect.sync(() => {
    const plan = { executionHash: 'a'.repeat(64), converged: false }
    const evidence = makePreparedPlanEvidence({
      plan,
      targetRoot: '/tmp/isolated-target',
      commands: [
        { phase: 'bootstrap', argv: ['pnpm', 'install', '--ignore-scripts'] },
        { phase: 'prepare', argv: ['prelude', 'plan', '--json'] },
      ],
    })

    assert.equal(evidence.phase, 'PREPARE')
    assert.deepEqual(evidence.plan, plan)
    assert.equal(evidence.planHash, plan.executionHash)
    assert.deepEqual(evidence.observedStateBinding, { executionHash: plan.executionHash })
    assert.equal(evidence.targetRoot, '/tmp/isolated-target')
  }))

  it.effect('rejects missing approval before APPLY', () => Effect.sync(() => {
    const evidence = makePreparedPlanEvidence({ plan: { executionHash: 'b'.repeat(64) }, targetRoot: '/tmp/target', commands: [] })
    assert.throws(() => authorizePreparedPlan(evidence, undefined, '/tmp/target', '/tmp/target'), /explicit approval/i)
  }))

  it.effect('rejects mismatched hash or isolated target before APPLY', () => Effect.sync(() => {
    const evidence = makePreparedPlanEvidence({ plan: { executionHash: 'c'.repeat(64) }, targetRoot: '/tmp/target', commands: [] })
    assert.throws(() => authorizePreparedPlan(evidence, 'd'.repeat(64), '/tmp/target', '/tmp/target'), /hash/i)
    assert.throws(() => authorizePreparedPlan(evidence, evidence.planHash, '/tmp/other-target', '/tmp/target'), /target/i)
  }))

  it.effect('rejects tampered evidence and evidence for a different actual target', () => Effect.sync(() => {
    const evidence = makePreparedPlanEvidence({ plan: { executionHash: 'e'.repeat(64) }, targetRoot: '/tmp/target', commands: [{ phase: 'apply', argv: ['prelude', 'apply'] }] })
    assert.throws(() => authorizePreparedPlan({ ...evidence, targetRoot: '/tmp/tampered' }, evidence.planHash, '/tmp/tampered', '/tmp/target'), /actual isolated target/i)
    assert.throws(() => authorizePreparedPlan({ ...evidence, observedStateBinding: { executionHash: 'f'.repeat(64) } }, evidence.planHash, '/tmp/target', '/tmp/target'), /must agree/i)
  }))
})
