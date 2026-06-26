type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue }

type RecoveredIntentArea
  = | 'react'
    | 'vue'
    | 'node-backend'
    | 'cli'
    | 'library'
    | 'workspace'
    | 'internal-workspace-dependencies'
    | 'engineering-baseline'
    | 'cli-behavior'
    | 'old-smoke-cases'
    | 'legacy-preset-shapes'

interface RecoveredWorkspaceDependency {
  readonly target: {
    readonly by: 'id' | 'name'
    readonly value: string
  }
  readonly alias?: string
}

interface RecoveredCreateSpecPackage {
  readonly id: string
  readonly name: string
  readonly path: string
  readonly capabilities: readonly string[]
  readonly options: Record<string, JsonValue>
  readonly internalDependencies: readonly RecoveredWorkspaceDependency[]
}

interface RecoveredSinglePackageCreateSpec {
  readonly topology: 'single-package'
  readonly package: RecoveredCreateSpecPackage
  readonly rootCapabilities: readonly string[]
  readonly providers: readonly string[]
  readonly overrides: Record<string, never>
}

interface RecoveredWorkspaceCreateSpec {
  readonly topology: 'workspace'
  readonly packages: readonly RecoveredCreateSpecPackage[]
  readonly rootCapabilities: readonly string[]
  readonly providers: readonly string[]
  readonly overrides: Record<string, never>
}

type RecoveredCreateSpec = RecoveredSinglePackageCreateSpec | RecoveredWorkspaceCreateSpec

export interface RecoveredCreateSpecFixture {
  readonly id: string
  readonly label: string
  readonly intentAreas: readonly RecoveredIntentArea[]
  readonly source: {
    readonly baseline: 'main'
    readonly paths: readonly string[]
    readonly legacyPresets?: readonly string[]
    readonly legacySmokeCases?: readonly string[]
  }
  readonly createSpec: RecoveredCreateSpec
  readonly expectations: readonly string[]
  readonly recoveryNotes: readonly string[]
}

interface LegacyChoiceInventory {
  readonly id: string
  readonly intentAreas: readonly RecoveredIntentArea[]
  readonly sourcePaths: readonly string[]
  readonly choices: Record<string, readonly string[]>
  readonly recoveryNotes: readonly string[]
}

const minimalRootCapabilities = [
  'package-manager:pnpm',
  'knip',
  'dependency-update:taze',
] as const

const fullEngineeringRootCapabilities = [
  ...minimalRootCapabilities,
  'linting:antfu-eslint',
  'git',
  'git-hooks:husky',
  'lint-staged',
  'commitlint',
] as const

const workspaceRootCapabilities = [
  'package-manager:pnpm',
  'workspace-root',
  'turbo',
  'knip',
  'dependency-update:taze',
] as const

const fullWorkspaceRootCapabilities = [
  ...workspaceRootCapabilities,
  'git',
  'git-hooks:husky',
  'lint-staged',
  'commitlint',
] as const

const noOverrides = {} as const satisfies Record<string, never>

function packageFixture(options: {
  readonly id: string
  readonly name: string
  readonly path: string
  readonly capabilities: readonly string[]
  readonly options?: Record<string, JsonValue>
  readonly internalDependencies?: readonly RecoveredWorkspaceDependency[]
}): RecoveredCreateSpecPackage {
  return {
    id: options.id,
    name: options.name,
    path: options.path,
    capabilities: options.capabilities,
    options: options.options ?? {},
    internalDependencies: options.internalDependencies ?? [],
  }
}

export const recoveredIntentInventory = {
  baseline: {
    intent: 'main',
    implementation: 'docs/current',
    statement: 'The main branch is the legacy intent baseline only. Current docs are the implementation and architecture baseline.',
  },
  coveredIntentAreas: [
    'react',
    'vue',
    'node-backend',
    'cli',
    'library',
    'workspace',
    'internal-workspace-dependencies',
    'engineering-baseline',
    'cli-behavior',
    'old-smoke-cases',
    'legacy-preset-shapes',
  ] as const satisfies readonly RecoveredIntentArea[],
  targetArchitectureRejections: [
    'ProjectConfig as creation truth',
    'Plan or PlanSpec as creation truth',
    'Handlebars or .hbs template rendering as the global generation layer',
    'Trellis workflow, .trellis tasks/specs, or project-local skill baseline',
    'preset registry, preset product model, or preset aliases as active create API',
    'capability-owned direct writes to shared files',
    'whole-project lifecycle update for generated scaffolds',
  ] as const,
  mainSourcePaths: [
    'apps/cli/src/schema/preset.ts',
    'apps/cli/src/schema/create-spec.ts',
    'apps/cli/src/schema/generation-package-spec.ts',
    'apps/cli/src/schema/project-config.ts',
    'apps/cli/src/schema/plan-spec.ts',
    'apps/cli/src/core/questions/compose.ts',
    'apps/cli/src/core/workspace-bootstrap.ts',
    'apps/cli/src/core/workspace-packages.ts',
    'apps/cli/templates/fragments/cli/effect-index.ts.hbs',
    'apps/cli/tests/generated-projects.smoke.ts',
    'apps/cli/tests/dry-run-cli.smoke.ts',
    'apps/cli/tests/support/generated-smoke-gate.ts',
    '.trellis/spec/create-yume/workspace-packages/index.md',
    '.agents/skills/generated-scaffold-audit/references/create-yume-generated-quality.md',
  ] as const,
} as const

export const legacyGuidedVariantInventory = [
  {
    id: 'react-guided-variant-space',
    intentAreas: ['react', 'cli-behavior'],
    sourcePaths: [
      'apps/cli/src/schema/project-config.ts',
      'apps/cli/src/core/template-registry/frontend-app.ts',
      'apps/cli/src/core/owners/router.ts',
      'apps/cli/src/core/owners/state-management.ts',
    ],
    choices: {
      buildTool: ['vite', 'none'],
      cssPreprocessor: ['css', 'less', 'sass'],
      cssFramework: ['tailwind', 'none'],
      router: ['react-router', 'tanstack-router', 'none'],
      stateManagement: ['zustand', 'jotai', 'none'],
    },
    recoveryNotes: [
      'React minimal/full fixtures are canonical preset shapes; guided variants preserve the broader old choice space.',
      'Choices that own dependencies or generated source slots should become capabilities or capability options in later slices.',
    ],
  },
  {
    id: 'vue-guided-variant-space',
    intentAreas: ['vue', 'cli-behavior'],
    sourcePaths: [
      'apps/cli/src/schema/project-config.ts',
      'apps/cli/src/core/questions/common/preset.ts',
      'apps/cli/src/core/template-registry/frontend-app.ts',
      'apps/cli/src/core/template-registry/vue.ts',
      'apps/cli/src/core/owners/router.ts',
      'apps/cli/src/core/owners/state-management.ts',
    ],
    choices: {
      buildTool: ['vite', 'none'],
      cssPreprocessor: ['css', 'less', 'sass'],
      cssFramework: ['tailwind', 'none'],
      router: ['vue-router', 'none'],
      stateManagement: ['pinia', 'none'],
    },
    recoveryNotes: [
      'Vue full baseline combines Vue Router, Pinia, Tailwind, linting, and code-quality intent.',
    ],
  },
  {
    id: 'node-backend-guided-variant-space',
    intentAreas: ['node-backend'],
    sourcePaths: [
      'apps/cli/src/schema/generation-package-spec.ts',
      'apps/cli/src/core/owners/scaffold-family.ts',
    ],
    choices: {
      language: ['typescript'],
      moduleFormat: ['esm'],
      backendFramework: ['none'],
      buildOutput: ['tsdown-dist-package'],
    },
    recoveryNotes: [
      'main only supported backend framework none.',
    ],
  },
  {
    id: 'cli-guided-variant-space',
    intentAreas: ['cli'],
    sourcePaths: [
      'apps/cli/src/schema/generation-package-spec.ts',
      'apps/cli/src/core/owners/scaffold-family.ts',
      'apps/cli/templates/fragments/cli/effect-index.ts.hbs',
    ],
    choices: {
      toolkit: ['none', 'effect'],
      packageContract: ['bin', 'shebang', 'smoke:bin', 'tsdown-dist-package'],
    },
    recoveryNotes: [
      'Recover generated Effect CLI toolkit intent only. main has no old effect-harness or AI harness provider intent.',
    ],
  },
  {
    id: 'library-guided-variant-space',
    intentAreas: ['library'],
    sourcePaths: [
      'apps/cli/src/schema/generation-package-spec.ts',
      'apps/cli/src/core/owners/scaffold-family.ts',
    ],
    choices: {
      runtime: ['neutral', 'node'],
      packageContract: ['exports', 'main', 'types', 'files', 'prepack', 'tsdown-dist-package'],
    },
    recoveryNotes: [
      'Library runtime is a package capability input, not a separate project type.',
    ],
  },
  {
    id: 'workspace-guided-variant-space',
    intentAreas: ['workspace', 'internal-workspace-dependencies', 'cli-behavior'],
    sourcePaths: [
      'apps/cli/src/core/questions/compose.ts',
      'apps/cli/src/core/workspace-packages.ts',
      '.trellis/spec/create-yume/workspace-packages/index.md',
    ],
    choices: {
      starter: ['empty', 'cli-library', 'fullstack-react', 'fullstack-vue'],
      packageKind: ['frontend-app', 'backend-app', 'cli-tool', 'library-package'],
      packageLocation: ['apps/<id>', 'libs/<id>'],
      internalDependencyTarget: ['by-id', 'by-name', 'optional-alias'],
      internalDependencyRange: ['workspace:*'],
    },
    recoveryNotes: [
      'Structured workspace --spec package graphs survive as canonical CreateSpec package graph fixtures.',
      'worker-app remains out of scope because main schema accepted it but generation rejected it.',
    ],
  },
] as const satisfies readonly LegacyChoiceInventory[]

export const legacyCliIntentInventory = [
  {
    id: 'guided-create',
    status: 'recover',
    sourcePaths: ['apps/cli/src/core/questions/compose.ts'],
    notes: ['Guided creation should build and emit a canonical CreateSpec before resolving.'],
  },
  {
    id: 'direct-spec',
    status: 'recover',
    sourcePaths: ['apps/cli/src/core/create-spec-input.ts', 'apps/cli/tests/schema/create-spec.test.ts'],
    notes: ['Direct structured spec input is old intent and current target architecture, but the old shape adapter is forbidden.'],
  },
  {
    id: 'no-input',
    status: 'recover',
    sourcePaths: ['apps/cli/src/index.ts', 'apps/cli/src/core/cli-command.ts'],
    notes: ['Noninteractive mode must not prompt and requires complete explicit input.'],
  },
  {
    id: 'print-spec',
    status: 'recover',
    sourcePaths: ['apps/cli/src/index.ts'],
    notes: ['Printing canonical CreateSpec remains the safe inspection path for current create.'],
  },
  {
    id: 'preset-aliases',
    status: 'inventory-only',
    sourcePaths: ['apps/cli/src/schema/preset.ts', 'apps/cli/src/core/questions/compose.ts'],
    notes: ['Legacy aliases are mapped for recovery coverage only. They must not return as active preset API.'],
  },
  {
    id: 'dry-run',
    status: 'record-only',
    sourcePaths: ['apps/cli/tests/dry-run-cli.smoke.ts', 'apps/cli/src/core/services/preview.ts'],
    notes: ['main dry-run preview intent is recorded, but current dev rejects --dry-run and this catalog does not wire it into create.'],
  },
  {
    id: 'yes-flag-rejection',
    status: 'recover-rejection',
    sourcePaths: ['apps/cli/src/core/cli-command.ts'],
    notes: ['--yes/-y stays rejected; explicit preset or spec input is required.'],
  },
] as const

export const legacyEffectIntentInventory = {
  sourcePaths: [
    'apps/cli/src/core/owners/scaffold-family.ts',
    'apps/cli/templates/fragments/cli/effect-index.ts.hbs',
  ],
  recovered: ['generated Effect CLI toolkit intent'],
  notRecovered: ['effect-harness provider intent', 'AI harness provider intent'],
  note: 'main predates the current effect-harness provider architecture; use current docs and provider contracts for that implementation baseline.',
} as const

export const legacyWorkspaceGraphInvariants = {
  sourcePaths: [
    'apps/cli/src/schema/generation-package-spec.ts',
    'apps/cli/tests/schema/create-spec.test.ts',
    'apps/cli/tests/generated-projects.smoke.ts',
    '.trellis/spec/create-yume/workspace-packages/index.md',
  ],
  invariants: [
    'packages have stable id, name, kind, runtime, and path/location',
    'frontend-app, backend-app, and cli-tool packages live under apps/<id>',
    'library-package packages live under libs/<id>',
    'internal dependencies are declared explicitly by id or by package name',
    'internal dependency alias controls the dependency key when present',
    'internal dependencies materialize as workspace:*',
    'root and package scopes are separate',
    'workspace root scripts are derived from child package scripts that are actually emitted',
  ],
} as const

export const legacyGeneratedPackageContractInventory = [
  {
    id: 'node-and-library-dist-package-contract',
    intentAreas: ['node-backend', 'library', 'old-smoke-cases'],
    sourcePaths: ['apps/cli/src/core/owners/scaffold-family.ts', 'apps/cli/tests/support/generated-smoke-gate.ts'],
    requirements: ['package.json.name matches requested name', 'type module', 'main dist/index.js', 'types dist/index.d.ts', 'exports import/types', 'files dist', 'tsdown build', 'prepack pnpm build'],
  },
  {
    id: 'cli-bin-contract',
    intentAreas: ['cli', 'old-smoke-cases'],
    sourcePaths: ['apps/cli/src/core/owners/scaffold-family.ts', 'apps/cli/tests/support/generated-smoke-gate.ts'],
    requirements: ['bin metadata points at dist/index.js', 'dist/index.js is executable', 'node shebang is preserved', 'smoke:bin runs build and --help'],
  },
  {
    id: 'effect-cli-runtime-dependencies',
    intentAreas: ['cli', 'old-smoke-cases'],
    sourcePaths: ['apps/cli/src/core/owners/scaffold-family.ts', 'apps/cli/templates/fragments/cli/effect-index.ts.hbs', 'apps/cli/tests/support/generated-smoke-gate.ts'],
    requirements: ['effect/unstable/cli runtime module', '@effect/platform-node runtime dependency', 'effect runtime dependency'],
  },
  {
    id: 'workspace-child-package-contract',
    intentAreas: ['workspace', 'internal-workspace-dependencies', 'old-smoke-cases'],
    sourcePaths: ['apps/cli/tests/generated-projects.smoke.ts', '.trellis/spec/create-yume/workspace-packages/index.md'],
    requirements: ['root package.json is private', 'pnpm-workspace.yaml includes apps/* and libs/*', 'child package build scripts exist', 'child build artifacts are present after build', 'CLI child bin is executable'],
  },
] as const

export const legacyGeneratedSmokePolicy = {
  sourcePaths: [
    'apps/cli/tests/generated-projects.smoke.ts',
    'apps/cli/tests/support/generated-smoke-gate.ts',
    '.agents/skills/generated-scaffold-audit/references/create-yume-generated-quality.md',
  ],
  minimalPolicy: 'React and Vue minimal presets are build-only; missing lint assets are not failures.',
  fullPolicy: 'React full, Vue full, backend full, CLI full, and workspace full/generated lint-enabled cases run lint/verify at zero warnings.',
  generatedSmokeCoverage: [
    'noninteractive generation',
    'install',
    'build',
    'lint and verify for full cases',
    'Node/backend invocation',
    'CLI bin invocation',
    'workspace child package assertions',
  ],
} as const

export const recoveredCreateSpecFixtures = [
  {
    id: 'legacy-react-minimal',
    label: 'Standalone React minimal',
    intentAreas: ['react', 'engineering-baseline', 'legacy-preset-shapes', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/template-registry/frontend-app.ts',
        'apps/cli/tests/generated-projects.smoke.ts',
      ],
      legacyPresets: ['standalone-react-minimal', 'react-minimal'],
      legacySmokeCases: ['generated-projects:react minimal preset'],
    },
    createSpec: {
      topology: 'single-package',
      package: packageFixture({
        id: 'app',
        name: 'react-minimal-fixture',
        path: '.',
        capabilities: ['react-app', 'typescript', 'vite', 'css:less'],
        options: {
          framework: 'react',
          router: 'none',
          state: 'none',
          cssFramework: 'none',
        },
      }),
      rootCapabilities: minimalRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Vite React TypeScript app with Less styling.',
      'Build succeeds without requiring generated lint assets.',
      'Knip and dependency maintenance remain engineering-baseline intent, not long-term scaffold ownership.',
    ],
    recoveryNotes: [
      'Recover as a complete CreateSpec fixture, not a preset entry point.',
      'Old minimal/full naming is legacy vocabulary only.',
    ],
  },
  {
    id: 'legacy-react-full',
    label: 'Standalone React full',
    intentAreas: ['react', 'engineering-baseline', 'legacy-preset-shapes', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/owners/router.ts',
        'apps/cli/src/core/owners/state-management.ts',
        'apps/cli/tests/generated-projects.smoke.ts',
      ],
      legacyPresets: ['standalone-react-full', 'react-full'],
      legacySmokeCases: ['generated-projects:react full preset'],
    },
    createSpec: {
      topology: 'single-package',
      package: packageFixture({
        id: 'app',
        name: 'react-full-fixture',
        path: '.',
        capabilities: ['react-app', 'typescript', 'vite', 'css:less', 'css:tailwind', 'router:react-router', 'state:jotai'],
        options: {
          framework: 'react',
          router: 'react-router',
          state: 'jotai',
          cssFramework: 'tailwind',
        },
      }),
      rootCapabilities: fullEngineeringRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Full React app includes Tailwind, React Router, Jotai, Git, ESLint, lint-staged, and commitlint intent.',
      'Generated full app should run build and verify, with lint executed at zero warnings.',
    ],
    recoveryNotes: [
      'Router, state, styling, and linting must become scoped capabilities or options with typed contributions.',
    ],
  },
  {
    id: 'legacy-vue-minimal',
    label: 'Standalone Vue minimal',
    intentAreas: ['vue', 'engineering-baseline', 'legacy-preset-shapes', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/template-registry/vue.ts',
        'apps/cli/tests/generated-projects.smoke.ts',
      ],
      legacyPresets: ['standalone-vue-minimal', 'vue-minimal'],
      legacySmokeCases: ['generated-projects:vue minimal preset'],
    },
    createSpec: {
      topology: 'single-package',
      package: packageFixture({
        id: 'app',
        name: 'vue-minimal-fixture',
        path: '.',
        capabilities: ['vue-app', 'typescript', 'vite', 'css:less'],
        options: {
          framework: 'vue',
          router: false,
          state: false,
          cssFramework: 'none',
        },
      }),
      rootCapabilities: minimalRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Vite Vue TypeScript app with Less styling.',
      'Build succeeds without requiring generated lint assets.',
    ],
    recoveryNotes: [
      'Recover Vue as a package capability family, not a top-level project type.',
    ],
  },
  {
    id: 'legacy-vue-full',
    label: 'Standalone Vue full',
    intentAreas: ['vue', 'engineering-baseline', 'legacy-preset-shapes', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/owners/router.ts',
        'apps/cli/src/core/owners/state-management.ts',
        'apps/cli/tests/generated-projects.smoke.ts',
      ],
      legacyPresets: ['standalone-vue-full', 'vue-full'],
      legacySmokeCases: ['generated-projects:vue full preset'],
    },
    createSpec: {
      topology: 'single-package',
      package: packageFixture({
        id: 'app',
        name: 'vue-full-fixture',
        path: '.',
        capabilities: ['vue-app', 'typescript', 'vite', 'css:less', 'css:tailwind', 'router:vue-router', 'state:pinia'],
        options: {
          framework: 'vue',
          router: true,
          state: true,
          cssFramework: 'tailwind',
        },
      }),
      rootCapabilities: fullEngineeringRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Full Vue app includes Tailwind, Vue Router, Pinia, Git, ESLint, lint-staged, and commitlint intent.',
      'Generated full app should run build and verify, with lint executed at zero warnings.',
    ],
    recoveryNotes: [
      'Router and state choices own dependencies and generated source slots, so later slices should model them explicitly.',
    ],
  },
  {
    id: 'legacy-backend-minimal',
    label: 'Standalone Node backend minimal',
    intentAreas: ['node-backend', 'legacy-preset-shapes', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/template-registry/node-runtime.ts',
        'apps/cli/src/core/owners/scaffold-family.ts',
        'apps/cli/tests/generated-projects.smoke.ts',
      ],
      legacyPresets: ['standalone-backend-minimal', 'node-minimal'],
      legacySmokeCases: ['generated-projects:node minimal preset'],
    },
    createSpec: {
      topology: 'single-package',
      package: packageFixture({
        id: 'app',
        name: 'node-minimal-fixture',
        path: '.',
        capabilities: ['node-backend', 'typescript', 'dist-package', 'publishable-package'],
        options: {
          runtime: 'node',
          backendFramework: 'none',
        },
      }),
      rootCapabilities: minimalRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Node backend emits ESM dist package metadata: main, types, exports, files, build, typecheck, start, and prepack.',
      'Smoke invokes dist/index.js and expects the generated greeting.',
    ],
    recoveryNotes: [
      'Recover backend as a package runtime capability.',
    ],
  },
  {
    id: 'legacy-backend-full',
    label: 'Standalone Node backend full',
    intentAreas: ['node-backend', 'engineering-baseline', 'legacy-preset-shapes', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/workspace-bootstrap.ts',
        'apps/cli/tests/generated-projects.smoke.ts',
      ],
      legacyPresets: ['standalone-backend-full'],
      legacySmokeCases: ['generated-projects:standalone backend full preset'],
    },
    createSpec: {
      topology: 'single-package',
      package: packageFixture({
        id: 'app',
        name: 'backend-full-fixture',
        path: '.',
        capabilities: ['node-backend', 'typescript', 'dist-package', 'publishable-package'],
        options: {
          runtime: 'node',
          backendFramework: 'none',
        },
      }),
      rootCapabilities: fullEngineeringRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Full backend keeps the Node dist-package contract and adds Git, ESLint, lint-staged, commitlint, Knip, and Taze intent.',
      'Generated full backend should run build, lint, and verify.',
    ],
    recoveryNotes: [
      'Full/minimal must be represented by capability selection, not a preset product model.',
    ],
  },
  {
    id: 'legacy-cli-minimal',
    label: 'Standalone CLI minimal',
    intentAreas: ['cli', 'legacy-preset-shapes', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/template-registry/node-runtime.ts',
        'apps/cli/src/core/owners/scaffold-family.ts',
        'apps/cli/tests/generated-projects.smoke.ts',
      ],
      legacyPresets: ['standalone-cli-minimal', 'cli-minimal'],
      legacySmokeCases: ['generated-projects:cli minimal preset'],
    },
    createSpec: {
      topology: 'single-package',
      package: packageFixture({
        id: 'cli',
        name: 'cli-minimal-fixture',
        path: '.',
        capabilities: ['cli-tool', 'typescript', 'node-bin', 'dist-package', 'publishable-package'],
        options: {
          runtime: 'node',
          toolkit: 'none',
        },
      }),
      rootCapabilities: minimalRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'CLI package emits executable dist/index.js with a preserved node shebang.',
      'Package manifest includes bin, main, exports, prepack, and smoke:bin.',
    ],
    recoveryNotes: [
      'Shebang preservation is CLI capability intent, not a post-generate PlanSpec action in the target model.',
    ],
  },
  {
    id: 'legacy-cli-effect',
    label: 'Standalone CLI with Effect toolkit',
    intentAreas: ['cli', 'legacy-preset-shapes', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/template-registry/node-runtime.ts',
        'apps/cli/src/core/owners/scaffold-family.ts',
        'apps/cli/tests/generated-projects.smoke.ts',
      ],
      legacyPresets: ['standalone-cli-effect', 'cli-effect'],
      legacySmokeCases: ['generated-projects:cli effect preset'],
    },
    createSpec: {
      topology: 'single-package',
      package: packageFixture({
        id: 'cli',
        name: 'cli-effect-fixture',
        path: '.',
        capabilities: ['cli-tool', 'effect-cli', 'typescript', 'node-bin', 'dist-package', 'publishable-package'],
        options: {
          runtime: 'node',
          toolkit: 'effect',
        },
      }),
      rootCapabilities: minimalRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Effect CLI package keeps CLI bin behavior and adds effect/unstable/cli runtime intent.',
      'Smoke invokes the generated bin with --help.',
    ],
    recoveryNotes: [
      'Old Effect v3 package pins are intent evidence only. Current Effect/provider decisions must come from docs and effect-harness contracts.',
    ],
  },
  {
    id: 'legacy-cli-full',
    label: 'Standalone CLI full',
    intentAreas: ['cli', 'engineering-baseline', 'legacy-preset-shapes', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/workspace-bootstrap.ts',
        'apps/cli/tests/generated-projects.smoke.ts',
      ],
      legacyPresets: ['standalone-cli-full'],
      legacySmokeCases: ['generated-projects:standalone cli full preset'],
    },
    createSpec: {
      topology: 'single-package',
      package: packageFixture({
        id: 'cli',
        name: 'cli-full-fixture',
        path: '.',
        capabilities: ['cli-tool', 'effect-cli', 'typescript', 'node-bin', 'dist-package', 'publishable-package'],
        options: {
          runtime: 'node',
          toolkit: 'effect',
        },
      }),
      rootCapabilities: fullEngineeringRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Full CLI combines Effect CLI toolkit, publishable bin package behavior, Git, ESLint, lint-staged, commitlint, Knip, and Taze.',
      'Generated full CLI should run build, lint, verify, and bin invocation checks.',
    ],
    recoveryNotes: [
      'Recover as capability composition, not as a standalone preset branch.',
    ],
  },
  {
    id: 'legacy-library-minimal',
    label: 'Standalone library minimal',
    intentAreas: ['library', 'legacy-preset-shapes', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/template-registry/node-runtime.ts',
        'apps/cli/src/core/owners/scaffold-family.ts',
        'apps/cli/tests/generated-projects.smoke.ts',
      ],
      legacyPresets: ['standalone-library-minimal'],
      legacySmokeCases: ['generated-projects:standalone library minimal preset'],
    },
    createSpec: {
      topology: 'single-package',
      package: packageFixture({
        id: 'lib',
        name: 'library-minimal-fixture',
        path: '.',
        capabilities: ['library', 'typescript', 'runtime:neutral', 'dist-package', 'publishable-package'],
        options: {
          runtime: 'neutral',
          toolkit: 'none',
        },
      }),
      rootCapabilities: minimalRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Neutral runtime library emits ESM dist package metadata with build, typecheck, and prepack.',
    ],
    recoveryNotes: [
      'Neutral library is a package capability with runtime option.',
    ],
  },
  {
    id: 'legacy-library-node',
    label: 'Standalone library Node runtime',
    intentAreas: ['library', 'legacy-preset-shapes', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/template-registry/node-runtime.ts',
        'apps/cli/src/core/owners/scaffold-family.ts',
        'apps/cli/tests/generated-projects.smoke.ts',
      ],
      legacyPresets: ['standalone-library-node'],
      legacySmokeCases: ['generated-projects:standalone library node preset'],
    },
    createSpec: {
      topology: 'single-package',
      package: packageFixture({
        id: 'lib',
        name: 'library-node-fixture',
        path: '.',
        capabilities: ['library', 'typescript', 'runtime:node', 'dist-package', 'publishable-package'],
        options: {
          runtime: 'node',
          toolkit: 'none',
        },
      }),
      rootCapabilities: minimalRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Node runtime library keeps dist package metadata and includes Node type support.',
    ],
    recoveryNotes: [
      'Recover runtime as library capability input, not a separate preset product type.',
    ],
  },
  {
    id: 'legacy-workspace-root',
    label: 'Workspace root only',
    intentAreas: ['workspace', 'engineering-baseline', 'legacy-preset-shapes'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/workspace-bootstrap.ts',
        'apps/cli/tests/core/workspace-root-materialization.test.ts',
      ],
      legacyPresets: ['workspace-root-minimal', 'workspace-root'],
    },
    createSpec: {
      topology: 'workspace',
      packages: [],
      rootCapabilities: fullWorkspaceRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Workspace root emits package.json, pnpm-workspace.yaml with apps/* and libs/*, turbo.json, and knip config intent.',
      'Root scripts derive build/dev/typecheck from child package scripts when packages exist.',
    ],
    recoveryNotes: [
      'Old workspace-root-minimal name meant no child packages; root engineering baseline still exists as selected capabilities.',
    ],
  },
  {
    id: 'legacy-workspace-cli-library',
    label: 'Workspace CLI and core library',
    intentAreas: ['workspace', 'cli', 'library', 'internal-workspace-dependencies', 'engineering-baseline', 'legacy-preset-shapes'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/workspace-packages.ts',
        'apps/cli/tests/dry-run-cli.smoke.ts',
      ],
      legacyPresets: ['workspace-cli-library'],
    },
    createSpec: {
      topology: 'workspace',
      packages: [
        packageFixture({
          id: 'cli',
          name: '@workspace-cli-library-fixture/cli',
          path: 'apps/cli',
          capabilities: ['cli-tool', 'effect-cli', 'typescript', 'node-bin', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'node',
            toolkit: 'effect',
          },
          internalDependencies: [
            {
              target: { by: 'id', value: 'core' },
            },
          ],
        }),
        packageFixture({
          id: 'core',
          name: '@workspace-cli-library-fixture/core',
          path: 'libs/core',
          capabilities: ['library', 'typescript', 'runtime:neutral', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'neutral',
            toolkit: 'none',
          },
        }),
      ],
      rootCapabilities: fullWorkspaceRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Workspace CLI package depends on core through workspace:* resolved by package id.',
      'CLI package lives under apps/cli; library package lives under libs/core.',
    ],
    recoveryNotes: [
      'Internal dependency graph belongs in CreateSpec package metadata and resolver semantics.',
    ],
  },
  {
    id: 'legacy-workspace-fullstack-react',
    label: 'Workspace fullstack React',
    intentAreas: ['workspace', 'react', 'node-backend', 'library', 'internal-workspace-dependencies', 'engineering-baseline', 'legacy-preset-shapes'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/workspace-packages.ts',
        'apps/cli/tests/dry-run-cli.smoke.ts',
      ],
      legacyPresets: ['workspace-fullstack-react'],
    },
    createSpec: {
      topology: 'workspace',
      packages: [
        packageFixture({
          id: 'web',
          name: '@workspace-fullstack-react-fixture/web',
          path: 'apps/web',
          capabilities: ['react-app', 'typescript', 'vite', 'css:less', 'css:tailwind'],
          options: {
            framework: 'react',
            cssFramework: 'tailwind',
          },
          internalDependencies: [
            {
              target: { by: 'id', value: 'shared' },
            },
          ],
        }),
        packageFixture({
          id: 'api',
          name: '@workspace-fullstack-react-fixture/api',
          path: 'apps/api',
          capabilities: ['node-backend', 'typescript', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'node',
            backendFramework: 'none',
          },
          internalDependencies: [
            {
              target: { by: 'id', value: 'shared' },
            },
          ],
        }),
        packageFixture({
          id: 'shared',
          name: '@workspace-fullstack-react-fixture/shared',
          path: 'libs/shared',
          capabilities: ['library', 'typescript', 'runtime:neutral', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'neutral',
            toolkit: 'none',
          },
        }),
      ],
      rootCapabilities: fullWorkspaceRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Fullstack React workspace includes web, api, and shared packages with internal workspace:* links to shared.',
      'Root turbo scripts cover child build/dev/typecheck surfaces.',
    ],
    recoveryNotes: [
      'Recover package graph semantics, not workspace preset branches.',
    ],
  },
  {
    id: 'legacy-workspace-fullstack-vue',
    label: 'Workspace fullstack Vue',
    intentAreas: ['workspace', 'vue', 'node-backend', 'library', 'internal-workspace-dependencies', 'engineering-baseline', 'legacy-preset-shapes'],
    source: {
      baseline: 'main',
      paths: [
        'apps/cli/src/core/questions/compose.ts',
        'apps/cli/src/core/workspace-packages.ts',
        'apps/cli/tests/dry-run-cli.smoke.ts',
      ],
      legacyPresets: ['workspace-fullstack-vue'],
    },
    createSpec: {
      topology: 'workspace',
      packages: [
        packageFixture({
          id: 'web',
          name: '@workspace-fullstack-vue-fixture/web',
          path: 'apps/web',
          capabilities: ['vue-app', 'typescript', 'vite', 'css:less', 'css:tailwind'],
          options: {
            framework: 'vue',
            cssFramework: 'tailwind',
          },
          internalDependencies: [
            {
              target: { by: 'id', value: 'shared' },
            },
          ],
        }),
        packageFixture({
          id: 'api',
          name: '@workspace-fullstack-vue-fixture/api',
          path: 'apps/api',
          capabilities: ['node-backend', 'typescript', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'node',
            backendFramework: 'none',
          },
          internalDependencies: [
            {
              target: { by: 'id', value: 'shared' },
            },
          ],
        }),
        packageFixture({
          id: 'shared',
          name: '@workspace-fullstack-vue-fixture/shared',
          path: 'libs/shared',
          capabilities: ['library', 'typescript', 'runtime:neutral', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'neutral',
            toolkit: 'none',
          },
        }),
      ],
      rootCapabilities: fullWorkspaceRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Fullstack Vue workspace includes web, api, and shared packages with internal workspace:* links to shared.',
      'Root turbo scripts cover child build/dev/typecheck surfaces.',
    ],
    recoveryNotes: [
      'Recover package graph semantics, not workspace preset branches.',
    ],
  },
  {
    id: 'legacy-smoke-workspace-react-api-shared',
    label: 'Generated smoke workspace: React, API, shared library',
    intentAreas: ['workspace', 'react', 'node-backend', 'library', 'internal-workspace-dependencies', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: ['apps/cli/tests/generated-projects.smoke.ts'],
      legacySmokeCases: ['generated-projects:workspace react backend and shared library'],
    },
    createSpec: {
      topology: 'workspace',
      packages: [
        packageFixture({
          id: 'web',
          name: '@smoke/web',
          path: 'apps/web',
          capabilities: ['react-app', 'typescript', 'vite', 'css:less'],
          options: {
            framework: 'react',
            cssFramework: 'none',
          },
          internalDependencies: [
            {
              target: { by: 'id', value: 'shared' },
            },
          ],
        }),
        packageFixture({
          id: 'api',
          name: '@smoke/api',
          path: 'apps/api',
          capabilities: ['node-backend', 'typescript', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'node',
            backendFramework: 'none',
          },
          internalDependencies: [
            {
              target: { by: 'name', value: '@smoke/shared' },
            },
          ],
        }),
        packageFixture({
          id: 'shared',
          name: '@smoke/shared',
          path: 'libs/shared',
          capabilities: ['library', 'typescript', 'runtime:neutral', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'neutral',
            toolkit: 'none',
          },
        }),
      ],
      rootCapabilities: workspaceRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Workspace dependency links resolve by id and by package name.',
      'Package manifests include exactly the declared workspace:* dependencies.',
    ],
    recoveryNotes: [
      'This is a smoke fixture, not a reusable preset shape.',
    ],
  },
  {
    id: 'legacy-smoke-workspace-multiple-cli',
    label: 'Generated smoke workspace: multiple CLI tools',
    intentAreas: ['workspace', 'cli', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: ['apps/cli/tests/generated-projects.smoke.ts'],
      legacySmokeCases: ['generated-projects:workspace with multiple CLI tools'],
    },
    createSpec: {
      topology: 'workspace',
      packages: [
        packageFixture({
          id: 'admin',
          name: '@smoke/admin',
          path: 'apps/admin',
          capabilities: ['cli-tool', 'typescript', 'node-bin', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'node',
            toolkit: 'none',
          },
        }),
        packageFixture({
          id: 'ops',
          name: '@smoke/ops',
          path: 'apps/ops',
          capabilities: ['cli-tool', 'typescript', 'node-bin', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'node',
            toolkit: 'none',
          },
        }),
      ],
      rootCapabilities: workspaceRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Each CLI package emits bin metadata and an executable dist/index.js shebang.',
      'Workspace root build covers multiple app packages.',
    ],
    recoveryNotes: [
      'Multiple packages of the same family must compose through package-scoped capabilities.',
    ],
  },
  {
    id: 'legacy-smoke-workspace-web-tool-shared',
    label: 'Generated smoke workspace: Vue frontend, CLI, shared library',
    intentAreas: ['workspace', 'vue', 'cli', 'library', 'internal-workspace-dependencies', 'old-smoke-cases'],
    source: {
      baseline: 'main',
      paths: ['apps/cli/tests/generated-projects.smoke.ts'],
      legacySmokeCases: ['generated-projects:workspace frontend CLI and shared library with explicit links'],
    },
    createSpec: {
      topology: 'workspace',
      packages: [
        packageFixture({
          id: 'dashboard',
          name: '@smoke/dashboard',
          path: 'apps/dashboard',
          capabilities: ['vue-app', 'typescript', 'vite', 'css:less'],
          options: {
            framework: 'vue',
            cssFramework: 'none',
          },
          internalDependencies: [
            {
              target: { by: 'id', value: 'shared' },
            },
          ],
        }),
        packageFixture({
          id: 'tool',
          name: '@smoke/tool',
          path: 'apps/tool',
          capabilities: ['cli-tool', 'typescript', 'node-bin', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'node',
            toolkit: 'none',
          },
          internalDependencies: [
            {
              target: { by: 'name', value: '@smoke/shared' },
            },
          ],
        }),
        packageFixture({
          id: 'shared',
          name: '@smoke/shared',
          path: 'libs/shared',
          capabilities: ['library', 'typescript', 'runtime:neutral', 'dist-package', 'publishable-package'],
          options: {
            runtime: 'neutral',
            toolkit: 'none',
          },
        }),
      ],
      rootCapabilities: workspaceRootCapabilities,
      providers: [],
      overrides: noOverrides,
    },
    expectations: [
      'Workspace dependency links resolve by id and by package name across frontend and CLI packages.',
      'CLI package bin behavior and library package build artifacts are both verified.',
    ],
    recoveryNotes: [
      'Explicit links are graph semantics; they must not be inferred from package path names.',
    ],
  },
] as const satisfies readonly RecoveredCreateSpecFixture[]

export type RecoveredCreateSpecFixtureId = typeof recoveredCreateSpecFixtures[number]['id']

interface MappedLegacyPreset {
  readonly legacyPreset: string
  readonly status: 'mapped'
  readonly fixtureId: RecoveredCreateSpecFixtureId
  readonly aliasOf?: string
  readonly sourcePath: string
}

interface OutOfScopeLegacyPreset {
  readonly legacyPreset: string
  readonly status: 'out-of-scope'
  readonly reason: string
  readonly sourcePath: string
}

type LegacyPresetMapping = MappedLegacyPreset | OutOfScopeLegacyPreset

export const legacyPresetMappings = [
  { legacyPreset: 'standalone-react-minimal', status: 'mapped', fixtureId: 'legacy-react-minimal', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'react-minimal', status: 'mapped', fixtureId: 'legacy-react-minimal', aliasOf: 'standalone-react-minimal', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'standalone-react-full', status: 'mapped', fixtureId: 'legacy-react-full', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'react-full', status: 'mapped', fixtureId: 'legacy-react-full', aliasOf: 'standalone-react-full', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'standalone-vue-minimal', status: 'mapped', fixtureId: 'legacy-vue-minimal', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'vue-minimal', status: 'mapped', fixtureId: 'legacy-vue-minimal', aliasOf: 'standalone-vue-minimal', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'standalone-vue-full', status: 'mapped', fixtureId: 'legacy-vue-full', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'vue-full', status: 'mapped', fixtureId: 'legacy-vue-full', aliasOf: 'standalone-vue-full', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'workspace-root-minimal', status: 'mapped', fixtureId: 'legacy-workspace-root', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'workspace-root', status: 'mapped', fixtureId: 'legacy-workspace-root', aliasOf: 'workspace-root-minimal', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'workspace-cli-library', status: 'mapped', fixtureId: 'legacy-workspace-cli-library', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'workspace-fullstack-react', status: 'mapped', fixtureId: 'legacy-workspace-fullstack-react', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'workspace-fullstack-vue', status: 'mapped', fixtureId: 'legacy-workspace-fullstack-vue', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'standalone-library-minimal', status: 'mapped', fixtureId: 'legacy-library-minimal', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'standalone-library-node', status: 'mapped', fixtureId: 'legacy-library-node', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'standalone-backend-minimal', status: 'mapped', fixtureId: 'legacy-backend-minimal', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'node-minimal', status: 'mapped', fixtureId: 'legacy-backend-minimal', aliasOf: 'standalone-backend-minimal', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'standalone-backend-full', status: 'mapped', fixtureId: 'legacy-backend-full', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'standalone-cli-minimal', status: 'mapped', fixtureId: 'legacy-cli-minimal', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'cli-minimal', status: 'mapped', fixtureId: 'legacy-cli-minimal', aliasOf: 'standalone-cli-minimal', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'standalone-cli-effect', status: 'mapped', fixtureId: 'legacy-cli-effect', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'cli-effect', status: 'mapped', fixtureId: 'legacy-cli-effect', aliasOf: 'standalone-cli-effect', sourcePath: 'apps/cli/src/schema/preset.ts' },
  { legacyPreset: 'standalone-cli-full', status: 'mapped', fixtureId: 'legacy-cli-full', sourcePath: 'apps/cli/src/schema/preset.ts' },
] as const satisfies readonly LegacyPresetMapping[]

interface MappedLegacySmokeCase {
  readonly legacySmokeCase: string
  readonly status: 'mapped'
  readonly fixtureId: RecoveredCreateSpecFixtureId
  readonly sourcePath: string
}

interface OutOfScopeLegacySmokeCase {
  readonly legacySmokeCase: string
  readonly status: 'out-of-scope'
  readonly reason: string
  readonly sourcePath: string
}

type LegacySmokeCaseMapping = MappedLegacySmokeCase | OutOfScopeLegacySmokeCase

const dryRunOutOfScopeReason = 'Old dry-run smoke asserted PlanSpec and Handlebars-era preview output. The recoverable intent is no-write inspection, but Plan/PlanSpec and template-render preview are forbidden target architecture.'

export const legacySmokeCaseMappings = [
  { legacySmokeCase: 'generated-projects:react minimal preset', status: 'mapped', fixtureId: 'legacy-react-minimal', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:react full preset', status: 'mapped', fixtureId: 'legacy-react-full', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:vue minimal preset', status: 'mapped', fixtureId: 'legacy-vue-minimal', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:vue full preset', status: 'mapped', fixtureId: 'legacy-vue-full', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:node minimal preset', status: 'mapped', fixtureId: 'legacy-backend-minimal', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:standalone backend full preset', status: 'mapped', fixtureId: 'legacy-backend-full', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:cli minimal preset', status: 'mapped', fixtureId: 'legacy-cli-minimal', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:cli effect preset', status: 'mapped', fixtureId: 'legacy-cli-effect', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:standalone cli full preset', status: 'mapped', fixtureId: 'legacy-cli-full', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:standalone library minimal preset', status: 'mapped', fixtureId: 'legacy-library-minimal', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:standalone library node preset', status: 'mapped', fixtureId: 'legacy-library-node', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:workspace react backend and shared library', status: 'mapped', fixtureId: 'legacy-smoke-workspace-react-api-shared', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:workspace with multiple CLI tools', status: 'mapped', fixtureId: 'legacy-smoke-workspace-multiple-cli', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'generated-projects:workspace frontend CLI and shared library with explicit links', status: 'mapped', fixtureId: 'legacy-smoke-workspace-web-tool-shared', sourcePath: 'apps/cli/tests/generated-projects.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:react full preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:vue full preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:workspace root preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:workspace cli library preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:workspace fullstack react preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:workspace fullstack vue preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:node minimal preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:backend full preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:library minimal preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:library node preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:cli minimal preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:cli effect preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:cli full preset', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
  { legacySmokeCase: 'dry-run-cli:workspace spec with child packages', status: 'out-of-scope', reason: dryRunOutOfScopeReason, sourcePath: 'apps/cli/tests/dry-run-cli.smoke.ts' },
] as const satisfies readonly LegacySmokeCaseMapping[]

export const legacyOutOfScopeIntents = [
  {
    id: 'legacy-worker-app-schema-placeholder',
    sourcePath: 'apps/cli/src/schema/generation-package-spec.ts',
    reason: 'main decoded worker-app schema placeholders but createSpecToProjectConfig and workspace generation rejected them as unavailable.',
  },
  {
    id: 'legacy-project-config-adapter',
    sourcePath: 'apps/cli/src/schema/create-spec.ts',
    reason: 'ProjectConfig was an adapter target on main. Current target architecture makes canonical CreateSpec the creation input.',
  },
  {
    id: 'legacy-plan-spec-preview',
    sourcePath: 'apps/cli/src/schema/plan-spec.ts',
    reason: 'PlanSpec described old render/copy/json/text tasks and is not target WritePlan architecture.',
  },
] as const

export function enumerateRecoveredCreateSpecFixtureIds(): readonly RecoveredCreateSpecFixtureId[] {
  return recoveredCreateSpecFixtures.map(fixture => fixture.id)
}

export function findRecoveredCreateSpecFixture(id: RecoveredCreateSpecFixtureId): RecoveredCreateSpecFixture {
  const fixture = recoveredCreateSpecFixtures.find(candidate => candidate.id === id)
  if (!fixture) {
    throw new Error(`Recovered CreateSpec fixture not found: ${id}`)
  }

  return fixture
}
