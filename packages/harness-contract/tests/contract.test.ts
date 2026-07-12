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
  JsonPointerSchema,
  MODULE_PROTOCOL_V1,
  ModulePlanSchema,
  PackageRootSchema,
  PRELUDE_V1_SUPPORTED_FEATURES,
  RelativePathSchema,
  TargetPathSchema,
} from '../src/index.js'

describe('contract wire codecs', () => {
  test('round trips plain descriptor and plan data through Effect Schema and JSON', () => {
    const encodedDescriptor = encodeHarnessModuleDescriptor(validHarnessModuleDescriptorFixture)
    const encodedPlan = encodeModulePlan(validModulePlanFixture)

    const descriptorJson = JSON.stringify(encodedDescriptor)
    const planJson = JSON.stringify(encodedPlan)
    const descriptorWireValue: unknown = JSON.parse(descriptorJson)
    const planWireValue: unknown = JSON.parse(planJson)

    const decodedDescriptor = decodeHarnessModuleDescriptor(descriptorWireValue)
    const decodedPlan = decodeModulePlan(planWireValue)

    expect(decodedDescriptor).toEqual(validHarnessModuleDescriptorFixture)
    expect(decodedPlan).toEqual(validModulePlanFixture)
    expect(Object.getPrototypeOf(decodedDescriptor)).toBe(Object.prototype)
    expect(Object.getPrototypeOf(decodedPlan)).toBe(Object.prototype)
  })

  test('contains exactly the four V1 Output capabilities in its valid fixture', () => {
    expect(validModulePlanFixture.outputs.map(output => output.kind)).toEqual([
      'ManagedTree',
      'ManagedBlock',
      'JsonValue',
      'JsonKeyedItem',
    ])
  })

  test.each(malformedModulePlanFixtures)('rejects malformed Module plans: $label', ({ value }) => {
    expect(Schema.is(ModulePlanSchema)(value)).toBe(false)
    expect(() => decodeModulePlan(value)).toThrow()
  })

  test('rejects duplicate required features', () => {
    const descriptor = {
      harnessId: 'fixture.harness',
      protocolVersion: MODULE_PROTOCOL_V1,
      requiredFeatures: ['outputs.managed-tree', 'outputs.managed-tree'],
    }

    expect(Schema.is(HarnessModuleDescriptorSchema)(descriptor)).toBe(false)
  })

  test('rejects non-finite JSON values', () => {
    const plan = {
      outputs: [{
        kind: 'JsonValue',
        id: 'non-finite',
        path: 'config.json',
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

describe('safe locators', () => {
  test.each(unsafeRelativePathFixtures)('rejects unsafe relative paths: $label', ({ value }) => {
    expect(Schema.is(RelativePathSchema)(value)).toBe(false)
    expect(Schema.is(TargetPathSchema)(value)).toBe(false)
  })

  test('allows the package and Artifact roots but not a bounded Target locator at "."', () => {
    expect(Schema.is(PackageRootSchema)('.')).toBe(true)
    expect(Schema.is(ArtifactPathSchema)('.')).toBe(true)
    expect(Schema.is(TargetPathSchema)('.')).toBe(false)
  })

  test.each(['not/a~2pointer', '#/fragment', 'missing-leading-slash'])('rejects noncanonical JSON pointer %s', (pointer) => {
    expect(Schema.is(JsonPointerSchema)(pointer)).toBe(false)
  })
})

describe('protocol negotiation', () => {
  test('decodes unknown required features and reports them as unsupported', () => {
    expect(unsupportedRequiredFeatureCompatibilityFixture).toEqual({
      compatible: false,
      reason: 'unsupportedRequiredFeatures',
      unsupportedFeatures: ['outputs.future-capability'],
    })
  })

  test('reports an unsupported protocol version separately', () => {
    const descriptor = decodeHarnessModuleDescriptor({
      harnessId: 'fixture.future-harness',
      protocolVersion: 2,
      requiredFeatures: [],
    })

    expect(checkProtocolCompatibility(descriptor, {
      supportedProtocolVersions: [MODULE_PROTOCOL_V1],
      supportedFeatures: [...PRELUDE_V1_SUPPORTED_FEATURES],
    })).toEqual({
      compatible: false,
      reason: 'unsupportedProtocolVersion',
      protocolVersion: 2,
    })
  })

  test('accepts the complete V1 protocol and feature set', () => {
    expect(checkProtocolCompatibility(validHarnessModuleDescriptorFixture, {
      supportedProtocolVersions: [MODULE_PROTOCOL_V1],
      supportedFeatures: [...PRELUDE_V1_SUPPORTED_FEATURES],
    })).toEqual({ compatible: true })
  })
})
