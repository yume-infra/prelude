import type {
  ProjectConfig,
  ReactProjectConfig,
  VueProjectConfig,
  WorkspaceRootConfig,
} from '../../src/schema/project-config'
import { makeProjectName } from '../../src/brand/project-name'

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
} satisfies WorkspaceRootConfig

export const workspaceRootMinimalProjectConfig = {
  name: makeProjectName('workspace-root-minimal-fixture'),
  type: 'workspace-root',
  language: 'typescript',
  git: false,
  linting: 'none',
  codeQuality: [],
  packageManager: 'pnpm',
} satisfies WorkspaceRootConfig

export const reactProjectConfig = reactPresetProjectConfig
export const vueProjectConfig = vuePresetProjectConfig

export const projectConfigs: readonly ProjectConfig[] = [
  reactPresetProjectConfig,
  reactMinimalPresetProjectConfig,
  vuePresetProjectConfig,
  vueMinimalPresetProjectConfig,
  reactCustomProjectConfig,
  vueCustomProjectConfig,
  workspaceRootProjectConfig,
  workspaceRootMinimalProjectConfig,
]
