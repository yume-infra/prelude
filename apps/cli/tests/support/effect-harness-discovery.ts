import type { EffectHarnessProviderDiscovery } from '@/core/create'
import { effectHarnessProviderDiscoveryLayer } from '@/core/create'

export const effectHarnessDiscoveryFixture = {
  schemaVersion: 1,
  artifactRoot: '/tmp/effect-harness-artifact',
  providerProfilePath: '/tmp/effect-harness-artifact/provider/effect-harness.provider.json',
  providerProfileRelativePath: 'provider/effect-harness.provider.json',
  packageLocator: {
    packageName: '@sayoriqwq/effect-harness',
    packageVersion: '0.0.3',
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
    documentationBundle: {
      mode: 'managed-files',
      targetBasePath: '.prelude/providers/effect-harness/docs',
      files: [
        {
          id: 'effect-code',
          sourcePath: 'provider/docs/effect-code.md',
          targetPath: 'effect-code.md',
          contentType: 'text/markdown',
          managed: true,
          content: '# Effect Code\n\nTarget-facing Effect coding policy.\n',
        },
        {
          id: 'diagnostics',
          sourcePath: 'provider/docs/diagnostics.md',
          targetPath: 'diagnostics.md',
          contentType: 'text/markdown',
          managed: true,
          content: '# Diagnostics\n\ntsgo diagnostics policy.\n',
        },
        {
          id: 'editor-policy',
          sourcePath: 'provider/docs/editor-policy.md',
          targetPath: 'editor-policy.md',
          contentType: 'text/markdown',
          managed: true,
          content: '# Editor Policy\n\nTarget editor boundaries.\n',
        },
        {
          id: 'managed-surfaces',
          sourcePath: 'provider/docs/managed-surfaces.md',
          targetPath: 'managed-surfaces.md',
          contentType: 'text/markdown',
          managed: true,
          content: '# Managed Surfaces\n\nProvider target-managed surfaces.\n',
        },
        {
          id: 'discovery',
          sourcePath: 'provider/docs/discovery.md',
          targetPath: 'discovery.md',
          contentType: 'text/markdown',
          managed: true,
          content: '# Provider Discovery\n\nprovider-discover exposes target-managed surfaces.\n',
        },
        {
          id: 'package-config',
          sourcePath: 'provider/docs/package-config.md',
          targetPath: 'package-config.md',
          contentType: 'text/markdown',
          managed: true,
          content: '# Package Config\n\npackage.json and tsconfig contributions.\n',
        },
        {
          id: 'quality-policy',
          sourcePath: 'provider/docs/quality-policy.md',
          targetPath: 'quality-policy.md',
          contentType: 'text/markdown',
          managed: true,
          content: '# Quality Policy\n\nlint, test, and verification policy.\n',
        },
        {
          id: 'source-identity',
          sourcePath: 'provider/docs/source-identity.md',
          targetPath: 'source-identity.md',
          contentType: 'text/markdown',
          managed: true,
          content: '# Source Identity\n\nartifact-only references stay outside targets.\n',
        },
      ],
    },
    snippets: {
      mode: 'managed-files',
      targetBasePath: '.prelude/providers/effect-harness/snippets',
      files: [
        {
          id: 'agents-effect-harness',
          sourcePath: 'provider/snippets/agents.md',
          targetPath: 'agents.md',
          contentType: 'text/markdown',
          managed: true,
          targetUsage: 'manual-copy-or-include-only',
          content: '# Effect Harness Agents Snippet\n\nManual include snippet for target agents.\n',
        },
      ],
    },
    contributions: {
      packageJson: {
        mode: 'structured-merge',
        targetPath: 'package.json',
        selfConformanceSpecifier: 'catalog:',
        dependencyGroups: {
          runtime: {
            field: 'dependencies',
            packages: {
              'effect': '4.0.0-beta.92',
              '@effect/platform-node': '4.0.0-beta.92',
            },
          },
          testing: {
            field: 'devDependencies',
            packages: {
              '@effect/vitest': '4.0.0-beta.92',
              'vitest': '^4.1.8',
            },
          },
          diagnostics: {
            field: 'devDependencies',
            packages: {
              '@effect/tsgo': '0.15.0',
              '@effect/language-service': '0.86.2',
            },
          },
          nativeBackend: {
            field: 'devDependencies',
            packages: {
              '@typescript/native-preview': '7.0.0-dev.20260630.1',
            },
          },
          linting: {
            field: 'devDependencies',
            packages: {
              '@antfu/eslint-config': '^9.0.0',
              'eslint': '^10.3.0',
            },
          },
        },
        scripts: {
          prepare: {
            semantic: 'prepare Effect TypeScript-Go backend',
            defaultCommand: 'effect-tsgo patch',
          },
          typecheck: {
            semantic: 'primary Effect diagnostics',
            defaultCommand: 'tsgo --noEmit',
          },
          test: {
            semantic: 'run Effect tests',
            defaultCommand: 'vitest run',
          },
          lint: {
            semantic: 'run ESLint guardrails',
            defaultCommand: 'eslint',
          },
        },
      },
      tsconfig: {
        mode: 'structured-merge',
        targetPath: 'tsconfig.json',
        tsgo: {
          diagnosticCommand: 'tsgo --noEmit',
          nativeBackend: {
            package: '@typescript/native-preview',
            version: '7.0.0-dev.20260630.1',
            setupCommand: 'effect-tsgo patch',
          },
          diagnosticGate: {
            includeSuggestionsInTsc: true,
            ignoreEffectSuggestionsInTscExitCode: false,
            ignoreEffectWarningsInTscExitCode: false,
            ignoreEffectErrorsInTscExitCode: false,
          },
          ruleMapSource: {
            metadata: 'repos/tsgo/_packages/tsgo/src/metadata.json',
            policy: 'harness/tsgo.md',
            supportedEffect: 'v4',
            ruleCount: 76,
          },
        },
        compilerOptions: {
          plugins: [
            {
              name: '@effect/language-service',
              diagnostics: true,
              includeSuggestionsInTsc: true,
              ignoreEffectSuggestionsInTscExitCode: false,
              ignoreEffectWarningsInTscExitCode: false,
              ignoreEffectErrorsInTscExitCode: false,
              diagnosticSeverity: {
                floatingEffect: 'error',
                missingEffectError: 'error',
              },
              barrelImportPackages: ['effect'],
            },
          ],
        },
      },
      editorPolicy: {
        mode: 'structured-merge',
        targetPaths: ['.vscode/settings.json', '.zed/settings.json'],
        sourceIdentity: {
          providerInternalPatterns: ['repos/**'],
          targetReceivesSourceTrees: false,
        },
        policies: {
          autoImportExclude: {
            level: 'hard-boundary',
            patterns: ['repos/**'],
            vscode: {
              'typescript.preferences.autoImportFileExcludePatterns': ['repos/**'],
              'javascript.preferences.autoImportFileExcludePatterns': ['repos/**'],
            },
          },
          watchExclude: {
            level: 'recommended',
            patterns: ['repos/**'],
            vscode: {
              'files.watcherExclude': { 'repos/**': true },
            },
          },
          searchExclude: {
            level: 'recommended',
            patterns: ['repos/**'],
            vscode: {
              'search.exclude': { 'repos/**': true },
            },
          },
          filesExclude: {
            level: 'preference',
            patterns: ['repos/effect/**'],
            vscode: {
              'files.exclude': { 'repos/effect/**': true },
            },
          },
        },
      },
      lintGuardrails: {
        mode: 'command-policy',
        stage: 'lint',
        command: 'pnpm lint --max-warnings 0',
        configFiles: ['eslint.config.mjs'],
        layers: {
          owns: ['repository import boundary', 'Effect test entry'],
          doesNotOwn: ['Effect semantic diagnostics'],
        },
        rules: {
          restrictedImports: ['node:test', '@effect/cli', '@effect/cli/*', 'repos/effect/**', 'repos/tsgo/**'],
          restrictedVitestImports: ['describe', 'it', 'test'],
          allowedVitestImports: ['vi', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'],
          restrictedSyntax: ['Context.Tag', 'Effect.ignore', 'plain it() in tests'],
          allowedTestEntrypoints: ['it.effect', 'it.live', 'layer'],
        },
      },
      testPolicy: {
        mode: 'command-policy',
        stage: 'tests',
        command: 'pnpm test',
        packageScript: 'vitest run',
        framework: '@effect/vitest',
        expectedEntries: ['tests/**/*.test.ts'],
        effectEntrypoints: ['it.effect', 'it.live', 'layer'],
        disallowedImports: ['node:test'],
        disallowedVitestImports: ['describe', 'it', 'test'],
      },
      verificationPolicy: {
        mode: 'pipeline-policy',
        completionGate: 'pnpm verify',
        packageScript: 'node bin/effect-harness.ts verify --harness .',
        lifecycleOwner: 'prelude',
        localCommands: {
          diagnostics: ['pnpm typecheck'],
          tests: ['pnpm test'],
          lint: ['pnpm lint --max-warnings 0'],
          completion: ['pnpm verify'],
        },
        stages: [
          {
            tag: 'tsgo-diagnostics',
            summary: 'Run tsgo --noEmit and enforce zero Effect diagnostics.',
          },
          {
            tag: 'tests',
            summary: 'Run the Effect test suite.',
          },
          {
            tag: 'lint',
            summary: 'Run ESLint with zero warnings.',
          },
        ],
      },
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
