import type { PlanDocument } from '../src/model.js'

import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'

import { executionHash, stableJson } from '../src/model.js'

const artifact = { packageName: '@synthetic/alpha', packageVersion: '1.0.0', module: '@synthetic/alpha/prelude', resolutionId: 'lock-a' }
const owner = { integrationId: 'alpha', declarationId: 'tree' }
const declaration = { kind: 'ManagedTree' as const, id: 'tree', sourceRoot: 'assets', targetRoot: 'managed/alpha' }

function plan(overrides: Partial<Omit<PlanDocument, 'executionHash'>> = {}): Omit<PlanDocument, 'executionHash'> {
  return {
    schemaVersion: 1,
    executionHashVersion: 1,
    integrations: [{ integrationId: 'alpha', packageRoot: '.', module: '@synthetic/alpha/prelude', descriptor: { harnessId: 'alpha', protocolVersion: 1, requiredFeatures: [] }, artifact, plan: { outputs: [declaration], requirements: [], issues: [], checks: [] } }],
    outputs: [{ owner, declaration, status: 'change', currentHash: 'current', desiredHash: 'desired', evidence: ['display one'] }],
    requirements: [],
    issues: [{ owner: { integrationId: 'alpha', declarationId: 'issue' }, declaration: { id: 'issue', summary: 'display summary', detail: 'display detail' } }],
    checks: [],
    conflicts: [],
    blocked: true,
    ...overrides,
  }
}

describe('public plan encoding', () => {
  it.effect('is independent of object insertion order', () => Effect.sync(() => {
    expect(stableJson({ z: 1, a: { y: 2, b: 3 } })).toBe(stableJson({ a: { b: 3, y: 2 }, z: 1 }))
  }))

  it.effect('excludes display evidence and raw Module plans from approval', () => Effect.sync(() => {
    const original = plan()
    const displayChanged = plan({
      integrations: [{ ...original.integrations[0]!, plan: { outputs: [], requirements: [], issues: [], checks: [] } }],
      outputs: [{ ...original.outputs[0]!, evidence: ['different display'] }],
      issues: [{ ...original.issues[0]!, declaration: { id: 'issue', summary: 'rewritten', detail: 'rewritten detail' } }],
    })
    expect(executionHash(displayChanged)).toBe(executionHash(original))
  }))

  it.effect('binds declarations, observations, desired bytes, and selected lock identity', () => Effect.sync(() => {
    const original = plan()
    expect(executionHash(plan({ outputs: [{ ...original.outputs[0]!, currentHash: 'other' }] }))).not.toBe(executionHash(original))
    expect(executionHash(plan({ outputs: [{ ...original.outputs[0]!, desiredHash: 'other' }] }))).not.toBe(executionHash(original))
    expect(executionHash(plan({ outputs: [{ ...original.outputs[0]!, declaration: { ...declaration, targetRoot: 'other' } }] }))).not.toBe(executionHash(original))
    expect(executionHash(plan({ integrations: [{ ...original.integrations[0]!, artifact: { ...artifact, resolutionId: 'lock-b' } }] }))).not.toBe(executionHash(original))
  }))
})
