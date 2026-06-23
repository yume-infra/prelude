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
        targetScope: 'package',
        sections: {
          dependencies: {
            'react-router-dom': '^7.15.0',
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
        targetScope: 'package',
        sections: {
          dependencies: {
            '@tanstack/react-router': '^1.169.2',
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
        targetScope: 'package',
        sections: {
          dependencies: {
            'vue-router': '^5.0.6',
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
