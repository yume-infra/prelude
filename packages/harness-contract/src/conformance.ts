import {
  checkProtocolCompatibility,
  decodeHarnessModuleDescriptor,
  decodeModulePlan,
  MODULE_PROTOCOL_V1,
  PRELUDE_V1_SUPPORTED_FEATURES,
  V1_FEATURE,
} from './index.js'

export const validHarnessModuleDescriptorFixture = decodeHarnessModuleDescriptor({
  harnessId: 'fixture.harness',
  protocolVersion: MODULE_PROTOCOL_V1,
  requiredFeatures: PRELUDE_V1_SUPPORTED_FEATURES,
})

export const validModulePlanFixture = decodeModulePlan({
  outputs: [
    {
      kind: 'ManagedTree',
      id: 'managed-docs',
      sourceRoot: 'assets/managed',
      targetRoot: 'managed/reference',
    },
    {
      kind: 'ManagedBlock',
      id: 'agent-routing',
      path: 'AGENTS.md',
      blockId: 'reference-routing',
      content: 'Read managed/reference/AGENTS.md.',
    },
    {
      kind: 'JsonValue',
      id: 'feature-enabled',
      path: 'config.json',
      pointer: '/features/enabled',
      value: true,
    },
    {
      kind: 'JsonKeyedItem',
      id: 'fixture-tool',
      path: 'config.json',
      collectionPointer: '/tools',
      keyField: 'id',
      keyValue: 'fixture-tool',
      item: {
        id: 'fixture-tool',
        enabled: true,
      },
    },
  ],
  requirements: [
    {
      id: 'fixture-runtime',
      packageRoot: '.',
      packageName: 'fixture-runtime',
      range: '^1.0.0',
      section: 'dependencies',
    },
  ],
  checks: [
    {
      id: 'verify',
      summary: 'Verify the target package',
      packageRoot: '.',
      argv: ['pnpm', 'verify'],
    },
  ],
  issues: [
    {
      id: 'required-configuration',
      summary: 'Required configuration is not present',
      detail: 'The target-owned configuration must reference the required package export.',
      evidence: 'tool.config.mjs does not reference the required export.',
      guidance: 'guidance/configuration.md',
    },
  ],
})

export const unsafeRelativePathFixtures = Object.freeze([
  { label: 'empty', value: '' },
  { label: 'absolute POSIX', value: '/managed/content' },
  { label: 'absolute Windows', value: 'C:/managed/content' },
  { label: 'parent traversal', value: '../managed/content' },
  { label: 'nested parent traversal', value: 'managed/../content' },
  { label: 'current segment', value: 'managed/./content' },
  { label: 'duplicate separator', value: 'managed//content' },
  { label: 'backslash separator', value: 'managed\\content' },
  { label: 'trailing separator', value: 'managed/content/' },
  { label: 'null byte', value: 'managed/\0content' },
])

export const malformedModulePlanFixtures: ReadonlyArray<{
  readonly label: string
  readonly value: unknown
}> = Object.freeze([
  {
    label: 'missing categories',
    value: { outputs: [] },
  },
  {
    label: 'unknown Output capability',
    value: {
      outputs: [{ kind: 'OwnedFile', id: 'retired-output', path: 'owned.txt' }],
      requirements: [],
      checks: [],
      issues: [],
    },
  },
  {
    label: 'duplicate declaration ids across categories',
    value: {
      outputs: [{
        kind: 'ManagedBlock',
        id: 'duplicate',
        path: 'shared.txt',
        blockId: 'fixture-block',
        content: 'fixture content',
      }],
      requirements: [{
        id: 'duplicate',
        packageRoot: '.',
        packageName: 'fixture-runtime',
        range: '^1.0.0',
        section: 'dependencies',
      }],
      checks: [],
      issues: [],
    },
  },
  {
    label: 'JsonKeyedItem key mismatch',
    value: {
      outputs: [{
        kind: 'JsonKeyedItem',
        id: 'plugin',
        path: 'config.json',
        collectionPointer: '/tools',
        keyField: 'id',
        keyValue: 'fixture-tool',
        item: { id: 'different-tool' },
      }],
      requirements: [],
      checks: [],
      issues: [],
    },
  },
  {
    label: 'non-JSON JsonValue',
    value: {
      outputs: [{
        kind: 'JsonValue',
        id: 'not-json',
        path: 'config.json',
        pointer: '/features/enabled',
        value: undefined,
      }],
      requirements: [],
      checks: [],
      issues: [],
    },
  },
  {
    label: 'package dependency JsonValue',
    value: {
      outputs: [{
        kind: 'JsonValue',
        id: 'package-write',
        path: 'package.json',
        pointer: '/dependencies/fixture-runtime',
        value: '^1.0.0',
      }],
      requirements: [],
      checks: [],
      issues: [],
    },
  },
  {
    label: 'empty Check argv',
    value: {
      outputs: [],
      requirements: [],
      checks: [{
        id: 'empty-command',
        summary: 'Invalid empty command',
        packageRoot: '.',
        argv: [],
      }],
      issues: [],
    },
  },
])

export const unsupportedRequiredFeatureDescriptorFixture = decodeHarnessModuleDescriptor({
  harnessId: 'fixture.future-harness',
  protocolVersion: MODULE_PROTOCOL_V1,
  requiredFeatures: [V1_FEATURE.managedTree, 'outputs.future-capability'],
})

export const unsupportedRequiredFeatureCompatibilityFixture = checkProtocolCompatibility(
  unsupportedRequiredFeatureDescriptorFixture,
  {
    supportedProtocolVersions: [MODULE_PROTOCOL_V1],
    supportedFeatures: [...PRELUDE_V1_SUPPORTED_FEATURES],
  },
)
