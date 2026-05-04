import { describe, expect, it } from 'vitest'
import {
  getReactStateManagementPackageContributions,
  getVueStateManagementPackageContributions,
  stateManagementPackageJsonMutation,
} from '../../../src/core/owners/state-management'
import { reactPresetProjectConfig, vuePresetProjectConfig } from '../../support/fixtures'

describe('state-management package contributions', () => {
  it('contributes Zustand dependency with state-management ownership', () => {
    expect(getReactStateManagementPackageContributions({
      ...reactPresetProjectConfig,
      stateManagement: 'zustand',
    })).toEqual([
      {
        ownership: stateManagementPackageJsonMutation,
        targetScope: 'package',
        sections: {
          dependencies: {
            zustand: '^5.0.12',
          },
        },
      },
    ])
  })

  it('contributes Jotai dependency with state-management ownership', () => {
    expect(getReactStateManagementPackageContributions({
      ...reactPresetProjectConfig,
      stateManagement: 'jotai',
    })).toEqual([
      {
        ownership: stateManagementPackageJsonMutation,
        targetScope: 'package',
        sections: {
          dependencies: {
            jotai: '^2.19.1',
          },
        },
      },
    ])
  })

  it('omits React state-management dependencies when disabled', () => {
    expect(getReactStateManagementPackageContributions({
      ...reactPresetProjectConfig,
      stateManagement: 'none',
    })).toEqual([])
  })

  it('contributes Pinia dependency with state-management ownership', () => {
    expect(getVueStateManagementPackageContributions({
      ...vuePresetProjectConfig,
      stateManagement: true,
    })).toEqual([
      {
        ownership: stateManagementPackageJsonMutation,
        targetScope: 'package',
        sections: {
          dependencies: {
            pinia: '^3.0.4',
          },
        },
      },
    ])
  })

  it('omits Vue state-management dependency when disabled', () => {
    expect(getVueStateManagementPackageContributions({
      ...vuePresetProjectConfig,
      stateManagement: false,
    })).toEqual([])
  })
})
