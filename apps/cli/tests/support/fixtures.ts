import type {
  CliProjectConfig,
  LibraryProjectConfig,
  NodeProjectConfig,
  ProjectConfig,
  ReactProjectConfig,
  VueProjectConfig,
  WorkspaceRootConfig,
} from '../../src/schema/project-config'
import { makePackageName } from '../../src/brand/package-name'
import { makeProjectName } from '../../src/brand/project-name'
import { makePackageId } from '../../src/schema/create-spec'

export const reactPresetProjectConfig = {
  name: makeProjectName('react-fixture'),
  type: 'react',
  language: 'typescript',
  git: true,
  linting: 'antfu-eslint',
  codeQuality: ['lint-staged', 'commitlint'],
  buildTool: 'vite',
  router: 'react-router',
  stateManagement: 'jotai',
  cssPreprocessor: 'less',
  cssFramework: 'tailwind',
} satisfies ReactProjectConfig

export const reactMinimalPresetProjectConfig = {
  name: makeProjectName('react-minimal-fixture'),
  type: 'react',
  language: 'typescript',
  git: false,
  linting: 'none',
  codeQuality: [],
  buildTool: 'vite',
  router: 'none',
  stateManagement: 'none',
  cssPreprocessor: 'less',
  cssFramework: 'none',
} satisfies ReactProjectConfig

export const vuePresetProjectConfig = {
  name: makeProjectName('vue-fixture'),
  type: 'vue',
  language: 'typescript',
  git: true,
  linting: 'antfu-eslint',
  codeQuality: ['lint-staged', 'commitlint'],
  buildTool: 'vite',
  router: true,
  stateManagement: true,
  cssPreprocessor: 'less',
  cssFramework: 'tailwind',
} satisfies VueProjectConfig

export const vueMinimalPresetProjectConfig = {
  name: makeProjectName('vue-minimal-fixture'),
  type: 'vue',
  language: 'typescript',
  git: false,
  linting: 'none',
  codeQuality: [],
  buildTool: 'vite',
  router: false,
  stateManagement: false,
  cssPreprocessor: 'less',
  cssFramework: 'none',
} satisfies VueProjectConfig

export const reactCustomProjectConfig = {
  name: makeProjectName('react-custom-fixture'),
  type: 'react',
  language: 'typescript',
  git: true,
  linting: 'antfu-eslint',
  codeQuality: ['lint-staged', 'commitlint'],
  buildTool: 'vite',
  router: 'tanstack-router',
  stateManagement: 'jotai',
  cssPreprocessor: 'sass',
  cssFramework: 'tailwind',
} satisfies ReactProjectConfig

export const vueCustomProjectConfig = {
  name: makeProjectName('vue-custom-fixture'),
  type: 'vue',
  language: 'typescript',
  git: true,
  linting: 'antfu-eslint',
  codeQuality: ['lint-staged', 'commitlint'],
  buildTool: 'vite',
  router: true,
  stateManagement: true,
  cssPreprocessor: 'sass',
  cssFramework: 'none',
} satisfies VueProjectConfig

export const workspaceRootProjectConfig = {
  name: makeProjectName('workspace-root-fixture'),
  type: 'workspace-root',
  language: 'typescript',
  git: true,
  linting: 'antfu-eslint',
  codeQuality: ['lint-staged', 'commitlint'],
  packageManager: 'pnpm',
  packages: [],
} satisfies WorkspaceRootConfig

export const workspaceRootMinimalProjectConfig = {
  name: makeProjectName('workspace-root-minimal-fixture'),
  type: 'workspace-root',
  language: 'typescript',
  git: false,
  linting: 'none',
  codeQuality: [],
  packageManager: 'pnpm',
  packages: [],
} satisfies WorkspaceRootConfig

export const nodeMinimalPresetProjectConfig = {
  name: makeProjectName('node-minimal-fixture'),
  type: 'node',
  language: 'typescript',
  git: false,
  linting: 'none',
  codeQuality: [],
} satisfies NodeProjectConfig

export const cliMinimalPresetProjectConfig = {
  name: makeProjectName('cli-minimal-fixture'),
  type: 'cli',
  language: 'typescript',
  git: false,
  linting: 'none',
  codeQuality: [],
  toolkit: 'none',
} satisfies CliProjectConfig

export const cliEffectPresetProjectConfig = {
  name: makeProjectName('cli-effect-fixture'),
  type: 'cli',
  language: 'typescript',
  git: false,
  linting: 'none',
  codeQuality: [],
  toolkit: 'effect',
} satisfies CliProjectConfig

export const libraryMinimalProjectConfig = {
  name: makeProjectName('library-minimal-fixture'),
  type: 'library',
  language: 'typescript',
  git: false,
  linting: 'none',
  codeQuality: [],
  runtime: 'neutral',
} satisfies LibraryProjectConfig

export const workspaceMixedProjectConfig = {
  name: makeProjectName('workspace-mixed-fixture'),
  type: 'workspace-root',
  language: 'typescript',
  git: false,
  linting: 'none',
  codeQuality: [],
  packageManager: 'pnpm',
  packages: [
    {
      id: makePackageId('web'),
      name: makePackageName('@demo/web'),
      kind: 'frontend-app',
      runtime: 'browser',
      internalDependencies: [
        {
          target: {
            by: 'id',
            id: makePackageId('shared'),
          },
        },
      ],
      frontend: {
        framework: 'react',
        buildTool: 'vite',
        cssPreprocessor: 'less',
        cssFramework: 'none',
      },
    },
    {
      id: makePackageId('tool'),
      name: makePackageName('@demo/tool'),
      kind: 'cli-tool',
      runtime: 'node',
      internalDependencies: [
        {
          target: {
            by: 'name',
            name: makePackageName('@demo/shared'),
          },
          alias: makePackageName('@demo/shared-runtime'),
        },
      ],
      cli: {
        toolkit: 'effect',
      },
    },
    {
      id: makePackageId('shared'),
      name: makePackageName('@demo/shared'),
      kind: 'library-package',
      runtime: 'neutral',
      internalDependencies: [],
      library: {
        toolkit: 'none',
      },
    },
  ],
} satisfies WorkspaceRootConfig

export const projectConfigs: readonly ProjectConfig[] = [
  reactPresetProjectConfig,
  reactMinimalPresetProjectConfig,
  vuePresetProjectConfig,
  vueMinimalPresetProjectConfig,
  reactCustomProjectConfig,
  vueCustomProjectConfig,
  workspaceRootProjectConfig,
  workspaceRootMinimalProjectConfig,
  nodeMinimalPresetProjectConfig,
  cliMinimalPresetProjectConfig,
  cliEffectPresetProjectConfig,
  libraryMinimalProjectConfig,
  workspaceMixedProjectConfig,
]
