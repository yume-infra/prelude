export const OwnershipLayer = {
  PreservedCore: 'preserved-core',
  ScaffoldFamily: 'scaffold-family',
  WorkspaceBootstrap: 'workspace-bootstrap',
  Capability: 'capability',
} as const

type OwnershipLayerId = typeof OwnershipLayer[keyof typeof OwnershipLayer]

export const ContributionUnitKind = {
  FragmentRender: 'fragment-render',
  PartialNamespace: 'partial-namespace',
  JsonTextMutation: 'json-text-mutation',
  StaticAssetCopy: 'static-asset-copy',
  PostGenerateCommand: 'post-generate-command',
  PostGenerateFile: 'post-generate-file',
} as const

export type ContributionUnitKindId = typeof ContributionUnitKind[keyof typeof ContributionUnitKind]

export interface OwnerDefinition {
  readonly id: string
  readonly layer: OwnershipLayerId
  readonly label: string
}

export interface ContributionTrace {
  readonly owner: string
  readonly unit: ContributionUnitKindId
}

export function defineOwner(owner: OwnerDefinition): OwnerDefinition {
  return owner
}

export function contributionTrace(owner: OwnerDefinition, unit: ContributionUnitKindId): ContributionTrace {
  return {
    owner: owner.id,
    unit,
  }
}

export const ReactScaffoldOwner = defineOwner({
  id: 'react-scaffold',
  layer: OwnershipLayer.ScaffoldFamily,
  label: 'React Scaffold Family',
})

export const VueScaffoldOwner = defineOwner({
  id: 'vue-scaffold',
  layer: OwnershipLayer.ScaffoldFamily,
  label: 'Vue Scaffold Family',
})

export const FrontendScaffoldOwner = defineOwner({
  id: 'frontend-scaffold',
  layer: OwnershipLayer.ScaffoldFamily,
  label: 'Shared Frontend Scaffold Family',
})

export const NodeScaffoldOwner = defineOwner({
  id: 'node-scaffold',
  layer: OwnershipLayer.ScaffoldFamily,
  label: 'Node Scaffold Family',
})

export const CliScaffoldOwner = defineOwner({
  id: 'cli-scaffold',
  layer: OwnershipLayer.ScaffoldFamily,
  label: 'CLI Scaffold Family',
})

export const FrontendPackageOwner = defineOwner({
  id: 'frontend-package',
  layer: OwnershipLayer.ScaffoldFamily,
  label: 'Frontend Package',
})

export const NodePackageOwner = defineOwner({
  id: 'node-package',
  layer: OwnershipLayer.ScaffoldFamily,
  label: 'Node Package',
})

export const CliPackageOwner = defineOwner({
  id: 'cli-package',
  layer: OwnershipLayer.ScaffoldFamily,
  label: 'CLI Package',
})

export const LibraryPackageOwner = defineOwner({
  id: 'library-package',
  layer: OwnershipLayer.ScaffoldFamily,
  label: 'Library Package',
})

export const WorkspaceBootstrapOwner = defineOwner({
  id: 'workspace-bootstrap',
  layer: OwnershipLayer.WorkspaceBootstrap,
  label: 'Workspace Bootstrap',
})
