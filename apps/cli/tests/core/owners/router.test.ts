import { describe, expect, it } from 'vitest'
import {
  getReactRouterPackageContributions,
  getVueRouterPackageContributions,
  routerPackageJsonMutation,
} from '../../../src/core/owners/router'
import { reactPresetProjectConfig, vuePresetProjectConfig } from '../../support/fixtures'

describe('router package contributions', () => {
  it('contributes React Router dependencies with router ownership', () => {
    expect(getReactRouterPackageContributions({
      ...reactPresetProjectConfig,
      router: 'react-router',
    })).toEqual([
      {
        ownership: routerPackageJsonMutation,
        sections: {
          dependencies: {
            'react-router': '^7.14.2',
            'react-router-dom': '^7.14.2',
          },
        },
      },
    ])
  })

  it('contributes TanStack Router dependency with router ownership', () => {
    expect(getReactRouterPackageContributions({
      ...reactPresetProjectConfig,
      router: 'tanstack-router',
    })).toEqual([
      {
        ownership: routerPackageJsonMutation,
        sections: {
          dependencies: {
            '@tanstack/react-router': '^1.168.23',
          },
        },
      },
    ])
  })

  it('omits React router dependencies when disabled', () => {
    expect(getReactRouterPackageContributions({
      ...reactPresetProjectConfig,
      router: 'none',
    })).toEqual([])
  })

  it('contributes Vue Router dependency with router ownership', () => {
    expect(getVueRouterPackageContributions({
      ...vuePresetProjectConfig,
      router: true,
    })).toEqual([
      {
        ownership: routerPackageJsonMutation,
        sections: {
          dependencies: {
            'vue-router': '^5.0.4',
          },
        },
      },
    ])
  })

  it('omits Vue Router dependency when disabled', () => {
    expect(getVueRouterPackageContributions({
      ...vuePresetProjectConfig,
      router: false,
    })).toEqual([])
  })
})
