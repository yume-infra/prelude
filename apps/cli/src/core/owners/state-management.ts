import type { PackageManifestContribution } from '@/core/modifier/package-manifest-contributions'
import type { JsonBuilder } from '@/core/services/planner'
import type { ReactProjectConfig, ReactStateManagement, VueProjectConfig } from '@/schema/project-config'
import type { TemplateRegistryEntry } from '@/schema/template-registry'
import { makeTemplatePath } from '@/brand/template-path'
import { contributionTrace, ContributionUnitKind, defineOwner, OwnershipLayer } from '@/core/ownership/model'
import { deps } from '@/utils/file-helper'

export const StateManagementOwner = defineOwner({
  id: 'state-management',
  layer: OwnershipLayer.Capability,
  label: 'State Management Capability',
})

export const stateManagementFragmentRender = contributionTrace(StateManagementOwner, ContributionUnitKind.FragmentRender)
export const stateManagementPackageJsonMutation = contributionTrace(StateManagementOwner, ContributionUnitKind.JsonTextMutation)

export const reactStateManagementOptions: Array<{ value: ReactStateManagement, label: string }> = [
  { value: 'zustand', label: 'Zustand' },
  { value: 'jotai', label: 'Jotai' },
  { value: 'none', label: 'No State Management' },
]

export function hasReactStateManagement(config: ReactProjectConfig): boolean {
  return config.stateManagement !== 'none'
}

export function hasVueStateManagement(config: VueProjectConfig): boolean {
  return config.stateManagement === true
}

export const ReactCounterStoreTemplate: TemplateRegistryEntry<ReactProjectConfig> = {
  template: makeTemplatePath('fragments/react/Counter.ts.hbs'),
  target: config => `src/stores/counter.${config.language === 'typescript' ? 'ts' : 'js'}`,
  condition: hasReactStateManagement,
  ownership: stateManagementFragmentRender,
}

export const VueCounterStoreTemplate: TemplateRegistryEntry<VueProjectConfig> = {
  template: makeTemplatePath('fragments/vue/counter-store.ts.hbs'),
  target: config => `src/stores/counter.${config.language === 'typescript' ? 'ts' : 'js'}`,
  condition: hasVueStateManagement,
  ownership: stateManagementFragmentRender,
}

export function getReactStateManagementPackageContributions(config: ReactProjectConfig): PackageManifestContribution[] {
  if (config.stateManagement === 'zustand') {
    return [{
      ownership: stateManagementPackageJsonMutation,
      targetScope: 'package',
      sections: {
        dependencies: { zustand: '^5.0.12' },
      },
    }]
  }

  if (config.stateManagement === 'jotai') {
    return [{
      ownership: stateManagementPackageJsonMutation,
      targetScope: 'package',
      sections: {
        dependencies: { jotai: '^2.19.1' },
      },
    }]
  }

  return []
}

export function getVueStateManagementPackageContributions(config: VueProjectConfig): PackageManifestContribution[] {
  return hasVueStateManagement(config)
    ? [{
        ownership: stateManagementPackageJsonMutation,
        targetScope: 'package',
        sections: {
          dependencies: { pinia: '^3.0.4' },
        },
      }]
    : []
}

export function applyReactStateManagementPackageJson(entry: JsonBuilder, config: ReactProjectConfig): JsonBuilder {
  if (config.stateManagement === 'zustand') {
    return entry.modify(deps({ zustand: '^5.0.12' }), stateManagementPackageJsonMutation)
  }
  if (config.stateManagement === 'jotai') {
    return entry.modify(deps({ jotai: '^2.19.1' }), stateManagementPackageJsonMutation)
  }
  return entry
}

export function applyVueStateManagementPackageJson(entry: JsonBuilder, config: VueProjectConfig): JsonBuilder {
  return hasVueStateManagement(config)
    ? entry.modify(deps({ pinia: '^3.0.4' }), stateManagementPackageJsonMutation)
    : entry
}
