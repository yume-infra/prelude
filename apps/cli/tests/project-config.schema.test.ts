import { Effect, Exit } from 'effect'
import { describe, expect, it } from 'vitest'
import {
  decodeLibraryProjectConfig,
  decodeProjectConfig,
  decodeSharedFrontendAppConfig,
  decodeWorkspaceRootConfig,
} from '../src/schema/project-config'
import {
  cliProjectConfig,
  libraryProjectConfig,
  nodeProjectConfig,
  reactProjectConfig,
  vueProjectConfig,
  workspaceMixedProjectConfig,
  workspaceRootProjectConfig,
} from './support/fixtures'

describe('project config schema contract', () => {
  it('decodes a react fixture', async () => {
    const decoded = await Effect.runPromise(decodeProjectConfig(reactProjectConfig))

    expect(decoded).toEqual(reactProjectConfig)
  })

  it('decodes a vue fixture', async () => {
    const decoded = await Effect.runPromise(decodeProjectConfig(vueProjectConfig))

    expect(decoded).toEqual(vueProjectConfig)
  })

  it('decodes node and cli fixtures', async () => {
    await expect(Effect.runPromise(decodeProjectConfig(nodeProjectConfig))).resolves.toEqual(nodeProjectConfig)
    await expect(Effect.runPromise(decodeProjectConfig(cliProjectConfig))).resolves.toEqual(cliProjectConfig)
  })

  it('decodes library package fixtures', async () => {
    await expect(Effect.runPromise(decodeLibraryProjectConfig(libraryProjectConfig))).resolves.toEqual(libraryProjectConfig)
    await expect(Effect.runPromise(decodeProjectConfig(libraryProjectConfig))).resolves.toEqual(libraryProjectConfig)
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
        ...reactProjectConfig,
        type: 'solid',
      }),
    )

    expect(Exit.isFailure(exit)).toBe(true)
  })

  it('keeps standalone node and cli project configs TypeScript-only', async () => {
    const nodeExit = await Effect.runPromiseExit(
      decodeProjectConfig({
        ...nodeProjectConfig,
        language: 'javascript',
      }),
    )
    const cliExit = await Effect.runPromiseExit(
      decodeProjectConfig({
        ...cliProjectConfig,
        language: 'javascript',
      }),
    )

    expect(Exit.isFailure(nodeExit)).toBe(true)
    expect(Exit.isFailure(cliExit)).toBe(true)
  })

  it('keeps framework-specific router and state fields out of shared frontend config', async () => {
    const sharedConfig = await Effect.runPromise(decodeSharedFrontendAppConfig({
      name: reactProjectConfig.name,
      type: reactProjectConfig.type,
      language: reactProjectConfig.language,
      git: reactProjectConfig.git,
      linting: reactProjectConfig.linting,
      codeQuality: reactProjectConfig.codeQuality,
      buildTool: reactProjectConfig.buildTool,
      cssPreprocessor: reactProjectConfig.cssPreprocessor,
      cssFramework: reactProjectConfig.cssFramework,
    }))

    expect(sharedConfig).toEqual({
      name: reactProjectConfig.name,
      type: reactProjectConfig.type,
      language: reactProjectConfig.language,
      git: reactProjectConfig.git,
      linting: reactProjectConfig.linting,
      codeQuality: reactProjectConfig.codeQuality,
      buildTool: reactProjectConfig.buildTool,
      cssPreprocessor: reactProjectConfig.cssPreprocessor,
      cssFramework: reactProjectConfig.cssFramework,
    })

    const projected = await Effect.runPromise(
      decodeSharedFrontendAppConfig(reactProjectConfig),
    )

    expect(projected).toEqual(sharedConfig)
  })

  it('rejects cross-framework router and state semantics', async () => {
    const reactExit = await Effect.runPromiseExit(
      decodeProjectConfig({
        ...reactProjectConfig,
        router: true,
        stateManagement: true,
      }),
    )
    const vueExit = await Effect.runPromiseExit(
      decodeProjectConfig({
        ...vueProjectConfig,
        router: 'react-router',
        stateManagement: 'jotai',
      }),
    )

    expect(Exit.isFailure(reactExit)).toBe(true)
    expect(Exit.isFailure(vueExit)).toBe(true)
  })
})
