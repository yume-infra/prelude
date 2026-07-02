import type { EffectHarnessProviderDiscovery } from '@/core/create'
import { effectHarnessProviderDiscoveryLayer } from '@/core/create'

export const effectHarnessDiscoveryFixture = {
  schemaVersion: 1,
  artifactRoot: '/tmp/effect-harness-artifact',
  providerProfilePath: '/tmp/effect-harness-artifact/provider/effect-harness.provider.json',
  providerProfileRelativePath: 'provider/effect-harness.provider.json',
  packageLocator: {
    packageName: '@sayoriqwq/effect-harness',
    packageVersion: '0.1.0',
    binName: 'effect-harness',
    binPath: 'dist/bin/effect-harness.js',
    discoveryCommand: 'npx --yes @sayoriqwq/effect-harness provider-discover',
    packageFiles: ['provider', 'harness', 'repos', 'repos/effect.subtree.json', 'repos/tsgo.subtree.json'],
  },
  provider: {
    id: 'effect-harness',
    contractVersion: '1',
    providerVersion: '0.1.0',
    defaultProfile: 'codex-effect-v4',
  },
  selectedProfile: 'codex-effect-v4',
  discovery: {
    mode: 'provider-discovery',
    consumer: 'prelude',
    profileSource: 'provider/effect-harness.provider.json',
    targetLifecycleOwner: 'prelude',
  },
  deliveryModes: {
    internalHarness: {
      mode: 'internal-harness',
      description: 'Provider repository content used only to maintain effect-harness itself.',
      examples: ['harness/**', 'src/harness/**', 'tests/**'],
    },
    providerArtifactReference: {
      mode: 'provider-artifact-reference',
      description: 'Reference content carried by the provider artifact for audit and agent source access.',
      examples: ['repos/effect/**', 'repos/tsgo/**', 'harness/effect-routes.md', 'harness/tsgo-routes.md'],
    },
    exportedHarness: {
      mode: 'exported-harness',
      description: 'Target-facing provider contribution that Prelude may materialize and maintain in a target repository.',
      examples: ['provider record', 'package.json contribution', 'tsconfig.json contribution'],
    },
  },
  targetManagedSurfaces: {
    targetReceives: [
      'provider record at .prelude/providers/effect-harness/provider.json',
      'package.json dependency and devDependency structured pointers',
      'tsconfig.json @effect/language-service plugin structured pointer',
      'editor policy structured pointer for target editor settings',
      'lint, test, and verification policy records',
      'provider-managed docs bundle at .prelude/providers/effect-harness/docs',
      'provider-managed snippets at .prelude/providers/effect-harness/snippets',
    ],
    targetDoesNotReceive: [
      'provider repo internal source pin repos/effect',
      'provider repo internal subtree contract repos/effect.subtree.json',
      'provider repo internal Effect LLMS route repos/effect/LLMS.md',
      'provider repo internal Effect route harness/effect-routes.md',
      'provider repo internal source pin repos/tsgo',
      'provider repo internal subtree contract repos/tsgo.subtree.json',
      'provider repo internal tsgo README route repos/tsgo/README.md',
      'provider repo internal tsgo route harness/tsgo-routes.md',
      'effect-harness runtime assets under .codex',
      'effect-harness AGENTS.md managed block',
      '.effect-harness.json standalone manifest',
      '.codex/effect-feedback feedback intake',
    ],
    documentationBundle: { mode: 'managed-files', targetBasePath: '.prelude/providers/effect-harness/docs', files: [] },
    snippets: { mode: 'managed-files', targetBasePath: '.prelude/providers/effect-harness/snippets', files: [] },
    contributions: {
      packageJson: { mode: 'structured-merge', targetPath: 'package.json' },
      tsconfig: { mode: 'structured-merge', targetPath: 'tsconfig.json' },
      editorPolicy: { mode: 'structured-merge', targetPaths: ['.vscode/settings.json', '.zed/settings.json'] },
      lintGuardrails: { mode: 'command-policy', stage: 'lint' },
      testPolicy: { mode: 'command-policy', stage: 'tests' },
      verificationPolicy: { mode: 'pipeline-policy', completionGate: 'pnpm verify' },
    },
  },
  artifactOnlyReferences: {
    mode: 'provider-artifact-reference',
    targetDelivery: 'identity-only',
    packageSurface: ['provider', 'harness', 'repos'],
    references: {
      'effect-source-tree': {
        sourceEntry: 'effect-official-source',
        path: 'repos/effect',
        targetDelivery: 'artifact-only',
      },
      'effect-source-contract': {
        sourceEntry: 'effect-official-source',
        path: 'repos/effect.subtree.json',
        targetDelivery: 'artifact-only',
      },
      'effect-anchor-doc': {
        sourceEntry: 'effect-official-source',
        path: 'repos/effect/LLMS.md',
        targetDelivery: 'artifact-only',
      },
      'effect-route-doc': {
        sourceEntry: 'effect-official-source',
        path: 'harness/effect-routes.md',
        targetDelivery: 'artifact-only',
      },
      'tsgo-source-tree': {
        sourceEntry: 'tsgo-official-source',
        path: 'repos/tsgo',
        targetDelivery: 'artifact-only',
      },
      'tsgo-source-contract': {
        sourceEntry: 'tsgo-official-source',
        path: 'repos/tsgo.subtree.json',
        targetDelivery: 'artifact-only',
      },
      'tsgo-anchor-doc': {
        sourceEntry: 'tsgo-official-source',
        path: 'repos/tsgo/README.md',
        targetDelivery: 'artifact-only',
      },
      'tsgo-route-doc': {
        sourceEntry: 'tsgo-official-source',
        path: 'harness/tsgo-routes.md',
        targetDelivery: 'artifact-only',
      },
    },
  },
  sourceIdentities: {
    defaultSourceEntry: 'effect-official-source',
    sourceEntries: ['effect-official-source', 'tsgo-official-source'],
    sourceBoundary: {
      providerRepoInternal: true,
      targetDelivery: 'identity-only',
      targetMustNotReceive: ['repos/effect', 'repos/tsgo'],
      allowedTargetSourceIdentity: ['artifact.sourceIdentities'],
    },
    providerSourceEntries: {},
    artifactReferences: {},
  },
  internalHarnessSurfaces: {
    mode: 'internal-harness',
    description: 'not target materialized',
    examples: ['harness/**', 'src/harness/**', 'tests/**'],
  },
} as const satisfies EffectHarnessProviderDiscovery

export const EffectHarnessDiscoveryTestLayer = effectHarnessProviderDiscoveryLayer(effectHarnessDiscoveryFixture)
