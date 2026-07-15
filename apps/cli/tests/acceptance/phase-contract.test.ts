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
    assert.throws(() => authorizePreparedPlan(evidence, undefined, '/tmp/target'), /explicit approval/i)
  }))

  it.effect('rejects mismatched hash or isolated target before APPLY', () => Effect.sync(() => {
    const evidence = makePreparedPlanEvidence({ plan: { executionHash: 'c'.repeat(64) }, targetRoot: '/tmp/target', commands: [] })
    assert.throws(() => authorizePreparedPlan(evidence, 'd'.repeat(64), '/tmp/target'), /hash/i)
    assert.throws(() => authorizePreparedPlan(evidence, evidence.planHash, '/tmp/other-target'), /target/i)
  }))
})
