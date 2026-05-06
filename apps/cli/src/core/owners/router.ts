import type { PackageManifestContribution } from '@/core/modifier/package-manifest-contributions'
import type { ReactProjectConfig, ReactRouter, VueProjectConfig } from '@/schema/project-config'
import type { TemplateRegistryEntry } from '@/schema/template-registry'
import { makeTemplatePath } from '@/brand/template-path'
import { contributionTrace, ContributionUnitKind, defineOwner, OwnershipLayer } from '@/core/ownership/model'

const RouterOwner = defineOwner({
  id: 'router',
  layer: OwnershipLayer.Capability,
  label: 'Router Capability',
})

const routerFragmentRender = contributionTrace(RouterOwner, ContributionUnitKind.FragmentRender)
export const routerPackageJsonMutation = contributionTrace(RouterOwner, ContributionUnitKind.JsonTextMutation)

export const reactRouterOptions: Array<{ value: ReactRouter, label: string }> = [
  { value: 'react-router', label: 'React Router' },
  { value: 'tanstack-router', label: 'TanStack Router' },
  { value: 'none', label: 'No Router' },
]

function hasReactRouter(config: ReactProjectConfig): boolean {
  return config.router !== 'none'
}

function hasVueRouter(config: VueProjectConfig): boolean {
  return config.router === true
}

export const ReactRouterAboutTemplate: TemplateRegistryEntry<ReactProjectConfig> = {
  template: makeTemplatePath('fragments/react/About.tsx.hbs'),
  target: config => `src/pages/about.${config.language === 'typescript' ? 'tsx' : 'jsx'}`,
  condition: hasReactRouter,
  ownership: routerFragmentRender,
}

export const ReactRouterIndexTemplate: TemplateRegistryEntry<ReactProjectConfig> = {
  template: makeTemplatePath('fragments/react/router.ts.hbs'),
  target: config => `src/router/index.${config.language === 'typescript' ? 'tsx' : 'jsx'}`,
  condition: hasReactRouter,
  ownership: routerFragmentRender,
}

export const VueRouterIndexTemplate: TemplateRegistryEntry<VueProjectConfig> = {
  template: makeTemplatePath('fragments/vue/router.ts.hbs'),
  target: config => `src/router/index.${config.language === 'typescript' ? 'ts' : 'js'}`,
  condition: hasVueRouter,
  ownership: routerFragmentRender,
}

export const VueRouterAboutTemplate: TemplateRegistryEntry<VueProjectConfig> = {
  template: makeTemplatePath('fragments/vue/About.vue.hbs'),
  target: 'src/views/About.vue',
  condition: hasVueRouter,
  ownership: routerFragmentRender,
}

export function getReactRouterPackageContributions(config: ReactProjectConfig): PackageManifestContribution[] {
  if (config.router === 'react-router') {
    return [{
      ownership: routerPackageJsonMutation,
      targetScope: 'package',
      sections: {
        dependencies: { 'react-router': '^7.14.2', 'react-router-dom': '^7.14.2' },
      },
    }]
  }

  if (config.router === 'tanstack-router') {
    return [{
      ownership: routerPackageJsonMutation,
      targetScope: 'package',
      sections: {
        dependencies: { '@tanstack/react-router': '^1.168.23' },
      },
    }]
  }

  return []
}

export function getVueRouterPackageContributions(config: VueProjectConfig): PackageManifestContribution[] {
  return config.router
    ? [{
        ownership: routerPackageJsonMutation,
        targetScope: 'package',
        sections: {
          dependencies: { 'vue-router': '^5.0.4' },
        },
      }]
    : []
}
