import { Effect, Exit } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  decodeLibraryProjectConfig,
  decodeProjectConfig,
  decodeSharedFrontendAppConfig,
  decodeWorkspaceRootConfig,
} from '../src/schema/project-config'
import {
  cliMinimalPresetProjectConfig,
  libraryMinimalProjectConfig,
  nodeMinimalPresetProjectConfig,
  reactPresetProjectConfig,
  vuePresetProjectConfig,
  workspaceMixedProjectConfig,
  workspaceRootProjectConfig,
} from './support/fixtures'

describe('project config schema contract', () => {
  it('decodes a react fixture', async () => {
    const decoded = await Effect.runPromise(decodeProjectConfig(reactPresetProjectConfig))

    expect(decoded).toEqual(reactPresetProjectConfig)
  })

  it('decodes a vue fixture', async () => {
    const decoded = await Effect.runPromise(decodeProjectConfig(vuePresetProjectConfig))

    expect(decoded).toEqual(vuePresetProjectConfig)
  })

  it('decodes node and cli fixtures', async () => {
    await expect(Effect.runPromise(decodeProjectConfig(nodeMinimalPresetProjectConfig))).resolves.toEqual(nodeMinimalPresetProjectConfig)
    await expect(Effect.runPromise(decodeProjectConfig(cliMinimalPresetProjectConfig))).resolves.toEqual(cliMinimalPresetProjectConfig)
  })

  it('decodes library package fixtures', async () => {
    await expect(Effect.runPromise(decodeLibraryProjectConfig(libraryMinimalProjectConfig))).resolves.toEqual(libraryMinimalProjectConfig)
    await expect(Effect.runPromise(decodeProjectConfig(libraryMinimalProjectConfig))).resolves.toEqual(libraryMinimalProjectConfig)
  })

  it('decodes a workspace root fixture without child packages', async () => {
    const decoded = await Effect.runPromise(decodeWorkspaceRootConfig({
      name: workspaceRootProjectConfig.name,
      type: 'workspace-root',
      language: 'typescript',
      git: true,
      linting: 'antfu-eslint',
      codeQuality: ['lint-staged', 'commitlint'],
    }))

    expect(decoded).toEqual(workspaceRootProjectConfig)
    await expect(Effect.runPromise(decodeProjectConfig(decoded))).resolves.toEqual(workspaceRootProjectConfig)
  })

  it('decodes workspace package lists from structured config', async () => {
    const decoded = await Effect.runPromise(decodeWorkspaceRootConfig(workspaceMixedProjectConfig))

    expect(decoded.packages.map(packageSpec => packageSpec.id)).toEqual(['web', 'tool', 'shared'])
    await expect(Effect.runPromise(decodeProjectConfig(decoded))).resolves.toEqual(workspaceMixedProjectConfig)
  })

  it('rejects unsupported project types', async () => {
    const exit = await Effect.runPromiseExit(
      decodeProjectConfig({
        ...reactPresetProjectConfig,
        type: 'solid',
      }),
    )

    expect(Exit.isFailure(exit)).toBe(true)
  })

  it('keeps standalone node and cli project configs TypeScript-only', async () => {
    const nodeExit = await Effect.runPromiseExit(
      decodeProjectConfig({
        ...nodeMinimalPresetProjectConfig,
        language: 'javascript',
      }),
    )
    const cliExit = await Effect.runPromiseExit(
      decodeProjectConfig({
        ...cliMinimalPresetProjectConfig,
        language: 'javascript',
      }),
    )

    expect(Exit.isFailure(nodeExit)).toBe(true)
    expect(Exit.isFailure(cliExit)).toBe(true)
  })

  it('keeps framework-specific router and state fields out of shared frontend config', async () => {
    const sharedConfig = await Effect.runPromise(decodeSharedFrontendAppConfig({
      name: reactPresetProjectConfig.name,
      type: reactPresetProjectConfig.type,
      language: reactPresetProjectConfig.language,
      git: reactPresetProjectConfig.git,
      linting: reactPresetProjectConfig.linting,
      codeQuality: reactPresetProjectConfig.codeQuality,
      buildTool: reactPresetProjectConfig.buildTool,
      cssPreprocessor: reactPresetProjectConfig.cssPreprocessor,
      cssFramework: reactPresetProjectConfig.cssFramework,
    }))

    expect(sharedConfig).toEqual({
      name: reactPresetProjectConfig.name,
      type: reactPresetProjectConfig.type,
      language: reactPresetProjectConfig.language,
      git: reactPresetProjectConfig.git,
      linting: reactPresetProjectConfig.linting,
      codeQuality: reactPresetProjectConfig.codeQuality,
      buildTool: reactPresetProjectConfig.buildTool,
      cssPreprocessor: reactPresetProjectConfig.cssPreprocessor,
      cssFramework: reactPresetProjectConfig.cssFramework,
    })

    const projected = await Effect.runPromise(
      decodeSharedFrontendAppConfig(reactPresetProjectConfig),
    )

    expect(projected).toEqual(sharedConfig)
  })

  it('rejects cross-framework router and state semantics', async () => {
    const reactExit = await Effect.runPromiseExit(
      decodeProjectConfig({
        ...reactPresetProjectConfig,
        router: true,
        stateManagement: true,
      }),
    )
    const vueExit = await Effect.runPromiseExit(
      decodeProjectConfig({
        ...vuePresetProjectConfig,
        router: 'react-router',
        stateManagement: 'jotai',
      }),
    )

    expect(Exit.isFailure(reactExit)).toBe(true)
    expect(Exit.isFailure(vueExit)).toBe(true)
  })
})
