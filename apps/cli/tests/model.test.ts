import type { PlanDocument } from '../src/model.js'

import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'

import { decodeJson } from '../src/json.js'
import { decodePlanDocument, executionHash, stableJson } from '../src/model.js'

const artifact = { packageName: '@synthetic/alpha', packageVersion: '1.0.0', module: '@synthetic/alpha/prelude', resolutionId: 'lock-a' }
const owner = { integrationId: 'alpha', declarationId: 'tree' }
const declaration = { kind: 'ManagedTree' as const, id: 'tree', sourceRoot: 'assets', locator: { root: 'IntegrationWorkspace' as const, path: 'managed/alpha' } }

function plan(overrides: Partial<Omit<PlanDocument, 'executionHash'>> = {}): Omit<PlanDocument, 'executionHash'> {
  return {
    schemaVersion: 2,
    executionHashVersion: 2,
    controlRoot: '.',
    integrations: [{ integrationId: 'alpha', packageRoots: ['.'], integrationWorkspace: '.prelude/i-alpha', module: '@synthetic/alpha/prelude', descriptor: { harnessId: 'alpha', protocolVersion: 2, requiredFeatures: [] }, artifact, plan: { outputs: [declaration], requirements: [], issues: [], checks: [] } }],
    outputs: [{ owner, declaration, resolvedPath: '.prelude/i-alpha/managed/alpha', status: 'change', currentHash: 'current', desiredHash: 'desired', evidence: ['display one'] }],
    requirements: [],
    issues: [{ owner: { integrationId: 'alpha', declarationId: 'issue' }, declaration: { id: 'issue', summary: 'display summary', detail: 'display detail' } }],
    checks: [],
    conflicts: [],
    blocked: true,
    converged: false,
    ...overrides,
  }
}

describe('V2 public plan encoding', () => {
  it.effect('round trips only the strict V2 Plan schema', () => Effect.sync(() => {
    const base = plan()
    const document = { ...base, executionHash: executionHash(base) }
    expect(decodePlanDocument(decodeJson(stableJson(document)))).toEqual(document)
    expect(() => decodePlanDocument({ ...document, schemaVersion: 1 })).toThrow()
    expect(() => decodePlanDocument({ ...document, legacyReceipt: 'unsupported' })).toThrow()
  }))

  it.effect('is independent of object insertion order', () => Effect.sync(() => {
    expect(stableJson({ z: 1, a: { y: 2, b: 3 } })).toBe(stableJson({ a: { b: 3, y: 2 }, z: 1 }))
  }))

  it.effect('excludes display evidence and redundant raw Module plans from approval', () => Effect.sync(() => {
    const original = plan()
    const displayChanged = plan({
      integrations: [{ ...original.integrations[0]!, plan: { outputs: [], requirements: [], issues: [], checks: [] } }],
      outputs: [{ ...original.outputs[0]!, evidence: ['different display'] }],
    })
    expect(executionHash(displayChanged)).toBe(executionHash(original))
  }))

  it.effect('binds every declaration, locator, observation digest, and selected lock identity', () => Effect.sync(() => {
    const original = plan()
    expect(executionHash(plan({ outputs: [{ ...original.outputs[0]!, currentHash: 'other' }] }))).not.toBe(executionHash(original))
    expect(executionHash(plan({ outputs: [{ ...original.outputs[0]!, desiredHash: 'other' }] }))).not.toBe(executionHash(original))
    expect(executionHash(plan({ outputs: [{ ...original.outputs[0]!, declaration: { ...declaration, locator: { root: 'ControlRoot', path: 'managed/alpha' } } }] }))).not.toBe(executionHash(original))
    expect(executionHash(plan({ integrations: [{ ...original.integrations[0]!, artifact: { ...artifact, resolutionId: 'lock-b' } }] }))).not.toBe(executionHash(original))
    expect(executionHash(plan({ integrations: [{ ...original.integrations[0]!, packageRoots: ['.', 'packages/api'] }] }))).not.toBe(executionHash(original))
    expect(executionHash(plan({ integrations: [{ ...original.integrations[0]!, integrationWorkspace: '.prelude/i-renamed' }] }))).not.toBe(executionHash(original))
    expect(executionHash(plan({ issues: [{ ...original.issues[0]!, declaration: { id: 'issue', summary: 'changed declaration' } }] }))).not.toBe(executionHash(original))
  }))

  it.effect('binds Approved Package Selection bytes and target command Checks', () => Effect.sync(() => {
    const requirement = {
      owner: { integrationId: 'alpha', declarationId: 'runtime' },
      declaration: { id: 'runtime', packageRoot: '.', packageName: 'fixture-runtime', range: '^1.0.0', section: 'dependencies' as const },
      selectionSatisfied: true,
      installationSatisfied: false,
      satisfied: false,
      manifestHash: 'a'.repeat(64),
      lockfileHash: 'b'.repeat(64),
      directDeclaration: '^1.0.0',
      lockResolution: '1.2.0',
      evidence: ['display only'],
    }
    const check = { owner: { integrationId: 'alpha', declarationId: 'verify' }, declaration: { id: 'verify', summary: 'Verify package', packageRoot: '.', argv: ['pnpm', 'verify'] as [string, ...string[]] } }
    const selected = plan({ requirements: [requirement], checks: [check] })
    expect(executionHash(plan({ requirements: [{ ...requirement, manifestHash: 'c'.repeat(64) }], checks: [check] }))).not.toBe(executionHash(selected))
    expect(executionHash(plan({ requirements: [{ ...requirement, lockfileHash: 'd'.repeat(64) }], checks: [check] }))).not.toBe(executionHash(selected))
    expect(executionHash(plan({ requirements: [requirement], checks: [{ ...check, declaration: { ...check.declaration, argv: ['pnpm', 'test'] } }] }))).not.toBe(executionHash(selected))
  }))
})
