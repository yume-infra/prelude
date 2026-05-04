import type { SharedFrontendAppConfig, WorkspaceRootConfig } from '@/schema/project-config'
import type { TemplateRegistry } from '@/schema/template-registry'
import { makeTemplatePath } from '@/brand/template-path'
import { contributionTrace, ContributionUnitKind, WorkspaceBootstrapOwner } from '@/core/ownership/model'

const workspaceFragmentRender = contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.FragmentRender)

export const workspaceBootstrapTemplates: TemplateRegistry<SharedFrontendAppConfig> = {
  'eslint.config.mjs': {
    template: makeTemplatePath('fragments/common/linter/eslint.config.mjs.hbs'),
    target: 'eslint.config.mjs',
    condition: config => config.linting === 'antfu-eslint',
    ownership: workspaceFragmentRender,
  },
  'vscode.settings.json': {
    template: makeTemplatePath('fragments/common/linter/vscode.settings.json.hbs'),
    target: '.vscode/settings.json',
    condition: config => config.linting === 'antfu-eslint',
    ownership: workspaceFragmentRender,
  },
  'zed.settings.json': {
    template: makeTemplatePath('fragments/common/linter/zed.settings.json.hbs'),
    target: '.zed/settings.json',
    condition: config => config.linting === 'antfu-eslint',
    ownership: workspaceFragmentRender,
  },

  '.gitignore': {
    template: makeTemplatePath('fragments/common/gitignore.hbs'),
    target: '.gitignore',
    condition: config => config.git === true,
    ownership: workspaceFragmentRender,
  },

  'commitlint.config.ts': {
    template: makeTemplatePath('fragments/common/code-quality/commitlint.config.ts.hbs'),
    target: config => `commitlint.config.${config.language === 'typescript' ? 'ts' : 'js'}`,
    condition: config => config.codeQuality.includes('commitlint'),
    ownership: workspaceFragmentRender,
  },

  '.lintstagedrc.json': {
    template: makeTemplatePath('fragments/common/code-quality/.lintstagedrc.json.hbs'),
    target: '.lintstagedrc.json',
    condition: config => config.codeQuality.includes('lint-staged'),
    ownership: workspaceFragmentRender,
  },
}

export const workspaceBootstrapRootTemplates: TemplateRegistry<WorkspaceRootConfig> = {
  'pnpm-workspace.yaml': {
    template: makeTemplatePath('fragments/common/workspace/pnpm-workspace.yaml.hbs'),
    target: 'pnpm-workspace.yaml',
    condition: () => true,
    ownership: workspaceFragmentRender,
  },

  'turbo.json': {
    template: makeTemplatePath('fragments/common/workspace/turbo.json.hbs'),
    target: 'turbo.json',
    condition: () => true,
    ownership: workspaceFragmentRender,
  },
}

function pickTemplateRegistryEntries<T>(
  registry: TemplateRegistry<T>,
  keys: readonly string[],
): TemplateRegistry<T> {
  return Object.fromEntries(
    keys.map(key => [key, registry[key]!]),
  ) as TemplateRegistry<T>
}

export const workspaceBootstrapLintAndGitTemplates = pickTemplateRegistryEntries(workspaceBootstrapTemplates, [
  'eslint.config.mjs',
  'vscode.settings.json',
  'zed.settings.json',
  '.gitignore',
])

export const workspaceBootstrapCodeQualityTemplates = pickTemplateRegistryEntries(workspaceBootstrapTemplates, [
  'commitlint.config.ts',
  '.lintstagedrc.json',
])
