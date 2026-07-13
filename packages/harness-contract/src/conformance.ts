import {
  checkProtocolCompatibility,
  decodeHarnessModuleDescriptor,
  decodeModulePlan,
  MODULE_PROTOCOL_V2,
  PRELUDE_V2_SUPPORTED_FEATURES,
  V2_FEATURE,
} from './index.js'

export const validHarnessModuleDescriptorFixture = decodeHarnessModuleDescriptor({
  harnessId: 'fixture.harness',
  protocolVersion: MODULE_PROTOCOL_V2,
  requiredFeatures: PRELUDE_V2_SUPPORTED_FEATURES,
})

export const validModulePlanFixture = decodeModulePlan({
  outputs: [
    {
      kind: 'ManagedTree',
      id: 'managed-docs',
      sourceRoot: 'assets/managed',
      locator: { root: 'IntegrationWorkspace', path: 'managed' },
    },
    {
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
    },
    {
      kind: 'ManagedBlock',
      id: 'agent-routing',
      locator: { root: 'ControlRoot', path: 'AGENTS.md' },
      blockId: 'reference-routing',
      content: 'Read .prelude/i-fixture/managed/AGENTS.md.',
    },
    {
      kind: 'JsonValue',
      id: 'feature-enabled',
      locator: { root: 'PackageRoot', packageRoot: '.', path: 'config.json' },
      pointer: '/features/enabled',
      value: true,
    },
    {
      kind: 'JsonKeyedItem',
      id: 'fixture-tool',
      locator: { root: 'PackageRoot', packageRoot: 'packages/api', path: 'config.json' },
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
    {
      id: 'fixture-api-runtime',
      packageRoot: 'packages/api',
      packageName: 'fixture-runtime',
      range: '^1.0.0',
      section: 'dependencies',
    },
  ],
  checks: [
    {
      id: 'verify-root',
      summary: 'Verify the root package',
      packageRoot: '.',
      argv: ['pnpm', 'verify'],
    },
    {
      id: 'verify-api',
      summary: 'Verify the API package',
      packageRoot: 'packages/api',
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

const emptyPlan = { requirements: [], checks: [], issues: [] }

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
    value: { ...emptyPlan, outputs: [{ kind: 'OwnedFile', id: 'retired-output', locator: { root: 'ControlRoot', path: 'owned.txt' } }] },
  },
  {
    label: 'duplicate declaration ids across categories',
    value: {
      outputs: [{
        kind: 'ManagedBlock',
        id: 'duplicate',
        locator: { root: 'ControlRoot', path: 'shared.txt' },
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
      ...emptyPlan,
      outputs: [{
        kind: 'JsonKeyedItem',
        id: 'plugin',
        locator: { root: 'PackageRoot', packageRoot: '.', path: 'config.json' },
        collectionPointer: '/tools',
        keyField: 'id',
        keyValue: 'fixture-tool',
        item: { id: 'different-tool' },
      }],
    },
  },
  {
    label: 'non-JSON JsonValue',
    value: {
      ...emptyPlan,
      outputs: [{
        kind: 'JsonValue',
        id: 'not-json',
        locator: { root: 'PackageRoot', packageRoot: '.', path: 'config.json' },
        pointer: '/features/enabled',
        value: undefined,
      }],
    },
  },
  {
    label: 'package dependency JsonValue',
    value: {
      ...emptyPlan,
      outputs: [{
        kind: 'JsonValue',
        id: 'package-write',
        locator: { root: 'PackageRoot', packageRoot: '.', path: 'package.json' },
        pointer: '/dependencies/fixture-runtime',
        value: '^1.0.0',
      }],
    },
  },
  {
    label: 'empty Check argv',
    value: {
      outputs: [],
      requirements: [],
      checks: [{ id: 'empty-command', summary: 'Invalid empty command', packageRoot: '.', argv: [] }],
      issues: [],
    },
  },
  {
    label: 'pinned reference outside Integration Workspace',
    value: {
      ...emptyPlan,
      outputs: [{
        kind: 'PinnedReferenceTree',
        id: 'invalid-pin',
        archive: { path: 'assets/repos/effect.pta', format: 'prelude-canonical-tree-archive-v1' },
        locator: { root: 'ControlRoot', path: 'repos/effect' },
        provenance: { sourceUrl: 'https://example.invalid/effect.git', revision: 'abc', treeDigest: 'a'.repeat(64) },
        referenceOnly: true,
      }],
    },
  },
  {
    label: 'pinned reference without immutable declaration',
    value: {
      ...emptyPlan,
      outputs: [{
        kind: 'PinnedReferenceTree',
        id: 'invalid-pin',
        archive: { path: 'assets/repos/effect.pta', format: 'prelude-canonical-tree-archive-v1' },
        locator: { root: 'IntegrationWorkspace', path: 'repos/effect' },
        provenance: { sourceUrl: 'https://example.invalid/effect.git', revision: 'abc', treeDigest: 'not-sha256' },
        referenceOnly: false,
      }],
    },
  },
])

export const unsupportedRequiredFeatureDescriptorFixture = decodeHarnessModuleDescriptor({
  harnessId: 'fixture.future-harness',
  protocolVersion: MODULE_PROTOCOL_V2,
  requiredFeatures: [V2_FEATURE.managedTree, 'outputs.future-capability'],
})

export const unsupportedRequiredFeatureCompatibilityFixture = checkProtocolCompatibility(
  unsupportedRequiredFeatureDescriptorFixture,
  {
    supportedProtocolVersions: [MODULE_PROTOCOL_V2],
    supportedFeatures: [...PRELUDE_V2_SUPPORTED_FEATURES],
  },
)
