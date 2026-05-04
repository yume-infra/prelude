import type { BaseProjectConfig, CliProjectConfig, LibraryProjectConfig, NodeProjectConfig } from '@/schema/project-config'
import type { TemplateRegistry } from '@/schema/template-registry'
import { makeTemplatePath } from '@/brand/template-path'
import {
  CliScaffoldOwner,
  contributionTrace,
  ContributionUnitKind,
  LibraryPackageOwner,
  NodeScaffoldOwner,
} from '@/core/ownership/model'
import {
  workspaceBootstrapCodeQualityTemplates,
  workspaceBootstrapLintAndGitTemplates,
} from './workspace-bootstrap'

type NodeRuntimeProjectConfig = NodeProjectConfig | CliProjectConfig | LibraryProjectConfig

const nodeFragmentRender = contributionTrace(NodeScaffoldOwner, ContributionUnitKind.FragmentRender)
const cliFragmentRender = contributionTrace(CliScaffoldOwner, ContributionUnitKind.FragmentRender)
const libraryFragmentRender = contributionTrace(LibraryPackageOwner, ContributionUnitKind.FragmentRender)

function nodeRuntimeCoreTemplates<T extends NodeRuntimeProjectConfig>(
  ownership: typeof nodeFragmentRender,
): TemplateRegistry<T> {
  return {
    'tsconfig.json': {
      template: makeTemplatePath('fragments/common/node-runtime/tsconfig.json.hbs'),
      target: 'tsconfig.json',
      condition: () => true,
      ownership,
    },
    'tsdown.config.ts': {
      template: makeTemplatePath('fragments/common/node-runtime/tsdown.config.ts.hbs'),
      target: 'tsdown.config.ts',
      condition: () => true,
      ownership,
    },
  }
}

function assembleNodeRuntimeFamilyTemplates<T extends NodeRuntimeProjectConfig>(
  ownership: typeof nodeFragmentRender,
  familyLocalTemplates: TemplateRegistry<T>,
): TemplateRegistry<T> {
  return {
    ...(workspaceBootstrapLintAndGitTemplates as TemplateRegistry<BaseProjectConfig> as TemplateRegistry<T>),
    ...nodeRuntimeCoreTemplates<T>(ownership),
    ...familyLocalTemplates,
    ...(workspaceBootstrapCodeQualityTemplates as TemplateRegistry<BaseProjectConfig> as TemplateRegistry<T>),
  }
}

const nodeFamilyTemplates: TemplateRegistry<NodeProjectConfig> = {
  'src/index.ts': {
    template: makeTemplatePath('fragments/node/index.ts.hbs'),
    target: 'src/index.ts',
    condition: () => true,
    ownership: nodeFragmentRender,
  },
  'README.md': {
    template: makeTemplatePath('fragments/node/README.md.hbs'),
    target: 'README.md',
    condition: () => true,
    ownership: nodeFragmentRender,
  },
}

const cliFamilyTemplates: TemplateRegistry<CliProjectConfig> = {
  'src/index.ts': {
    template: makeTemplatePath('fragments/cli/index.ts.hbs'),
    target: 'src/index.ts',
    condition: () => true,
    ownership: cliFragmentRender,
  },
  'scripts/ensure-shebang.mjs': {
    template: makeTemplatePath('fragments/cli/ensure-shebang.mjs.hbs'),
    target: 'scripts/ensure-shebang.mjs',
    condition: () => true,
    ownership: cliFragmentRender,
  },
  'README.md': {
    template: makeTemplatePath('fragments/cli/README.md.hbs'),
    target: 'README.md',
    condition: () => true,
    ownership: cliFragmentRender,
  },
}

const libraryFamilyTemplates: TemplateRegistry<LibraryProjectConfig> = {
  'src/index.ts': {
    template: makeTemplatePath('fragments/library/index.ts.hbs'),
    target: 'src/index.ts',
    condition: () => true,
    ownership: libraryFragmentRender,
  },
  'README.md': {
    template: makeTemplatePath('fragments/library/README.md.hbs'),
    target: 'README.md',
    condition: () => true,
    ownership: libraryFragmentRender,
  },
}

export const NodeTemplates: TemplateRegistry<NodeProjectConfig> = assembleNodeRuntimeFamilyTemplates(
  nodeFragmentRender,
  nodeFamilyTemplates,
)

export const CliTemplates: TemplateRegistry<CliProjectConfig> = assembleNodeRuntimeFamilyTemplates(
  cliFragmentRender,
  cliFamilyTemplates,
)

export const LibraryTemplates: TemplateRegistry<LibraryProjectConfig> = assembleNodeRuntimeFamilyTemplates(
  libraryFragmentRender,
  libraryFamilyTemplates,
)
