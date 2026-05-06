import { describe, expect, it } from 'vitest'
import { makeTemplatePath } from '@/brand/template-path'
import {
  assembleFrontendFamilyTemplates,
  getSharedFrontendPresetDefaults,
  sharedFrontendQuestionContracts,
  sharedFrontendTemplates,
} from '../../../src/core/template-registry/frontend-app'
import { workspaceBootstrapTemplates } from '../../../src/core/template-registry/workspace-bootstrap'
import { reactPresetProjectConfig } from '../../support/fixtures'

describe('frontend scaffold-family contract', () => {
  it('keeps scaffold-family preset defaults in one shared contract', () => {
    expect(getSharedFrontendPresetDefaults('react-minimal')).toEqual({
      buildTool: 'vite',
      cssPreprocessor: 'less',
      cssFramework: 'none',
    })

    expect(getSharedFrontendPresetDefaults('react-full')).toEqual({
      buildTool: 'vite',
      cssPreprocessor: 'less',
      cssFramework: 'tailwind',
    })

    expect(getSharedFrontendPresetDefaults('vue-minimal')).toEqual({
      buildTool: 'vite',
      cssPreprocessor: 'less',
      cssFramework: 'none',
    })

    expect(getSharedFrontendPresetDefaults('vue-full')).toEqual({
      buildTool: 'vite',
      cssPreprocessor: 'less',
      cssFramework: 'tailwind',
    })
  })

  it('loads workspace bootstrap templates from their own registry module', async () => {
    const frontendRegistryModule = await import('../../../src/core/template-registry/frontend-app')

    expect(frontendRegistryModule).not.toHaveProperty('workspaceBootstrapTemplates')
    expect(Object.keys(workspaceBootstrapTemplates)).toEqual(expect.arrayContaining([
      'eslint.config.mjs',
      'vscode.settings.json',
      '.gitignore',
      'commitlint.config.ts',
      '.lintstagedrc.json',
      'knip.jsonc',
    ]))
    expect(Object.values(workspaceBootstrapTemplates).every(template => template.scope === 'root')).toBe(true)
  })

  it('separates shared frontend templates from workspace bootstrap templates', () => {
    expect(Object.keys(sharedFrontendTemplates)).toContain('vite.config.ts')
    expect(Object.keys(sharedFrontendTemplates)).toContain('style.css')
    expect(Object.keys(sharedFrontendTemplates)).not.toContain('eslint.config.mjs')
    expect(Object.keys(sharedFrontendTemplates)).not.toContain('.gitignore')

    expect(Object.keys(workspaceBootstrapTemplates)).toContain('eslint.config.mjs')
    expect(Object.keys(workspaceBootstrapTemplates)).toContain('.gitignore')
    expect(Object.keys(workspaceBootstrapTemplates)).toContain('knip.jsonc')
    expect(Object.keys(workspaceBootstrapTemplates)).not.toContain('vite.config.ts')
  })

  it('consumes build-tool policy inside the scaffold-family template contract', () => {
    const viteConfig = sharedFrontendTemplates['vite.config.ts']!
    const viteEnv = sharedFrontendTemplates['vite-env.d.ts']!
    const tsconfigNode = sharedFrontendTemplates['tsconfig.node.json']!

    expect(viteConfig.condition(reactPresetProjectConfig)).toBe(true)
    expect(viteEnv.condition(reactPresetProjectConfig)).toBe(true)
    expect(tsconfigNode.condition(reactPresetProjectConfig)).toBe(true)

    const noBuildToolConfig = {
      ...reactPresetProjectConfig,
      buildTool: 'none' as const,
    }

    expect(viteConfig.condition(noBuildToolConfig)).toBe(false)
    expect(viteEnv.condition(noBuildToolConfig)).toBe(false)
    expect(tsconfigNode.condition(noBuildToolConfig)).toBe(false)
  })

  it('assembles family-local templates without reintroducing question ownership', () => {
    const templates = assembleFrontendFamilyTemplates({
      local: {
        template: makeTemplatePath('fragments/react/App.tsx.hbs'),
        target: 'src/local.tsx',
        condition: () => true,
        ownership: {
          owner: 'react-scaffold',
          unit: 'fragment-render',
        },
      },
    })

    expect(Object.keys(templates)).toEqual(expect.arrayContaining([
      'vite.config.ts',
      'eslint.config.mjs',
      'knip.jsonc',
      'local',
    ]))
    expect(sharedFrontendQuestionContracts.buildTool.options.map(option => option.value)).toEqual(['vite', 'none'])
  })
})
