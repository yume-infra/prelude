import { describe, expect, test } from '@effect/vitest'
import { Schema } from 'effect'

import {
  malformedModulePlanFixtures,
  unsafeRelativePathFixtures,
  unsupportedRequiredFeatureCompatibilityFixture,
  validHarnessModuleDescriptorFixture,
  validModulePlanFixture,
} from '../src/conformance.js'
import {
  ArtifactPathSchema,
  checkProtocolCompatibility,
  decodeHarnessModuleDescriptor,
  decodeModulePlan,
  encodeHarnessModuleDescriptor,
  encodeModulePlan,
  HarnessModuleDescriptorSchema,
  IntegrationIdentitySchema,
  JsonPointerSchema,
  MODULE_PROTOCOL_V2,
  ModulePlanSchema,
  ObservationLocatorSchema,
  OutputLocatorSchema,
  PackageRootSchema,
  PRELUDE_V2_SUPPORTED_FEATURES,
  RelativePathSchema,
} from '../src/index.js'

describe('V2 contract wire codecs', () => {
  test('round trips plain descriptor and plan data through Effect Schema and JSON', () => {
    const descriptorWireValue: unknown = JSON.parse(JSON.stringify(
      encodeHarnessModuleDescriptor(validHarnessModuleDescriptorFixture),
    ))
    const planWireValue: unknown = JSON.parse(JSON.stringify(
      encodeModulePlan(validModulePlanFixture),
    ))

    const decodedDescriptor = decodeHarnessModuleDescriptor(descriptorWireValue)
    const decodedPlan = decodeModulePlan(planWireValue)

    expect(decodedDescriptor).toEqual(validHarnessModuleDescriptorFixture)
    expect(decodedPlan).toEqual(validModulePlanFixture)
    expect(Object.getPrototypeOf(decodedDescriptor)).toBe(Object.prototype)
    expect(Object.getPrototypeOf(decodedPlan)).toBe(Object.prototype)
  })

  test('carries all five V2 Output capabilities with explicit semantic locators', () => {
    expect(validModulePlanFixture.outputs.map(output => [output.kind, output.locator.root])).toEqual([
      ['ManagedTree', 'IntegrationWorkspace'],
      ['PinnedReferenceTree', 'IntegrationWorkspace'],
      ['ManagedBlock', 'ControlRoot'],
      ['JsonValue', 'PackageRoot'],
      ['JsonKeyedItem', 'PackageRoot'],
    ])
  })

  test('binds immutable pinned-reference provenance as Contract plain data', () => {
    const output = validModulePlanFixture.outputs[1]

    expect(output).toEqual({
      kind: 'PinnedReferenceTree',
      id: 'effect-source',
      archive: { path: 'assets/repos/effect.pta', format: 'prelude-canonical-tree-archive-v1' },
      locator: { root: 'IntegrationWorkspace', path: 'repos/effect' },
      provenance: {
        sourceUrl: 'https://github.com/Effect-TS/effect.git',
        revision: '0123456789abcdef0123456789abcdef01234567',
        treeDigest: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      },
      referenceOnly: true,
    })
  })

  test.each(malformedModulePlanFixtures)('rejects malformed Module plans: $label', ({ value }) => {
    expect(Schema.is(ModulePlanSchema)(value)).toBe(false)
    expect(() => decodeModulePlan(value)).toThrow()
  })

  test('rejects released V1 Output and singular Integration identity shapes', () => {
    expect(Schema.is(ModulePlanSchema)({
      outputs: [{
        kind: 'ManagedTree',
        id: 'legacy-tree',
        sourceRoot: 'assets/managed',
        targetRoot: 'managed',
      }],
      requirements: [],
      checks: [],
      issues: [],
    })).toBe(false)
  })

  test('rejects an installed-directory sourceRoot compatibility field on V2 pinned archives', () => {
    const pinned = validModulePlanFixture.outputs.find(output => output.kind === 'PinnedReferenceTree')!
    expect(() => decodeModulePlan({
      outputs: [{ ...pinned, sourceRoot: 'assets/repos/effect' }],
      requirements: [],
      checks: [],
      issues: [],
    })).toThrow()
  })

  test('rejects the retired nested provenance closure field', () => {
    const pinned = validModulePlanFixture.outputs.find(output => output.kind === 'PinnedReferenceTree')!
    expect(() => decodeModulePlan({
      outputs: [{ ...pinned, provenance: { ...pinned.provenance, closure: [] } }],
      requirements: [],
      checks: [],
      issues: [],
    })).toThrow()
  })

  test('rejects duplicate required features', () => {
    const descriptor = {
      harnessId: 'fixture.harness',
      protocolVersion: MODULE_PROTOCOL_V2,
      requiredFeatures: ['outputs.managed-tree', 'outputs.managed-tree'],
    }

    expect(Schema.is(HarnessModuleDescriptorSchema)(descriptor)).toBe(false)
  })

  test('rejects non-finite JSON values', () => {
    const plan = {
      outputs: [{
        kind: 'JsonValue',
        id: 'non-finite',
        locator: { root: 'PackageRoot', packageRoot: '.', path: 'config.json' },
        pointer: '/value',
        value: Number.NaN,
      }],
      requirements: [],
      checks: [],
      issues: [],
    }

    expect(Schema.is(ModulePlanSchema)(plan)).toBe(false)
  })
})

describe('V2 tagged locators', () => {
  test('requires an explicit nonempty, unique, bounded package-root selection', () => {
    expect(Schema.is(IntegrationIdentitySchema)({ integrationId: 'fixture', packageRoots: ['.', 'packages/api'] })).toBe(true)
    expect(Schema.is(IntegrationIdentitySchema)({ integrationId: 'fixture', packageRoots: [] })).toBe(false)
    expect(Schema.is(IntegrationIdentitySchema)({ integrationId: 'fixture', packageRoots: ['.', '.'] })).toBe(false)
    expect(Schema.is(IntegrationIdentitySchema)({ integrationId: 'fixture', packageRoots: Array.from({ length: 65 }, (_, index) => `packages/p${index}`) })).toBe(false)
  })

  test.each([
    { root: 'ControlRoot', path: 'AGENTS.md' },
    { root: 'IntegrationWorkspace', path: 'managed/AGENTS.md' },
    { root: 'PackageRoot', packageRoot: 'packages/api', path: 'tsconfig.json' },
  ])('accepts an explicit Output locator %#', (locator) => {
    expect(Schema.is(OutputLocatorSchema)(locator)).toBe(true)
  })

  test('allows root observation but not root-wide Output ownership', () => {
    expect(Schema.is(ObservationLocatorSchema)({ root: 'ControlRoot', path: '.' })).toBe(true)
    expect(Schema.is(OutputLocatorSchema)({ root: 'ControlRoot', path: '.' })).toBe(false)
  })

  test('allows feedback observation but never feedback Output ownership', () => {
    const locator = { root: 'IntegrationWorkspace', path: 'feedback/evidence.json' }
    expect(Schema.is(ObservationLocatorSchema)(locator)).toBe(true)
    expect(Schema.is(OutputLocatorSchema)(locator)).toBe(false)
  })

  test.each(unsafeRelativePathFixtures)('rejects unsafe relative paths: $label', ({ value }) => {
    expect(Schema.is(RelativePathSchema)(value)).toBe(false)
  })

  test('allows package and Artifact roots', () => {
    expect(Schema.is(PackageRootSchema)('.')).toBe(true)
    expect(Schema.is(ArtifactPathSchema)('.')).toBe(true)
  })

  test.each(['not/a~2pointer', '#/fragment', 'missing-leading-slash'])('rejects noncanonical JSON pointer %s', (pointer) => {
    expect(Schema.is(JsonPointerSchema)(pointer)).toBe(false)
  })
})

describe('V2 protocol negotiation', () => {
  test('decodes unknown required features and reports them as unsupported', () => {
    expect(unsupportedRequiredFeatureCompatibilityFixture).toEqual({
      compatible: false,
      reason: 'unsupportedRequiredFeatures',
      unsupportedFeatures: ['outputs.future-capability'],
    })
  })

  test('reports released V1 as unsupported', () => {
    const descriptor = decodeHarnessModuleDescriptor({
      harnessId: 'fixture.legacy-harness',
      protocolVersion: 1,
      requiredFeatures: [],
    })

    expect(checkProtocolCompatibility(descriptor, {
      supportedProtocolVersions: [MODULE_PROTOCOL_V2],
      supportedFeatures: [...PRELUDE_V2_SUPPORTED_FEATURES],
    })).toEqual({
      compatible: false,
      reason: 'unsupportedProtocolVersion',
      protocolVersion: 1,
    })
  })

  test('accepts the complete V2 protocol and feature set', () => {
    expect(checkProtocolCompatibility(validHarnessModuleDescriptorFixture, {
      supportedProtocolVersions: [MODULE_PROTOCOL_V2],
      supportedFeatures: [...PRELUDE_V2_SUPPORTED_FEATURES],
    })).toEqual({ compatible: true })
  })
})
