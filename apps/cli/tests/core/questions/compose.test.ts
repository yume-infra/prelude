import { readFileSync } from 'node:fs'
import { Effect, Layer } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeProjectName } from '@/brand/project-name'
import { getSharedFrontendPresetDefaults } from '@/core/template-registry/frontend-app'
import { getWorkspaceBootstrapPresetDefaults } from '@/core/workspace-bootstrap'
import { CliContextLive } from '../../../src/core/cli-context'
import { collectQuestions } from '../../../src/core/questions/compose'
import { makeFsMockLayer } from '../../support/mock-layers'

describe('collectQuestions', () => {
  it('keeps closed union exhaustiveness out of the Effect defect channel', () => {
    const source = readFileSync(new URL('../../../src/core/questions/compose.ts', import.meta.url), 'utf8')

    expect(source).toContain('function assertNever(value: never): never')
    expect(source).not.toContain('Effect.dieMessage')
  })

  it('builds a preset project config from CliContext without invoking interactive prompts', async () => {
    const projectName = makeProjectName('non-interactive-react')
    const sharedFrontendDefaults = getSharedFrontendPresetDefaults('react-full')
    const workspaceBootstrapDefaults = getWorkspaceBootstrapPresetDefaults(false)

    const projectConfig = await Effect.runPromise(
      collectQuestions.pipe(
        Effect.provide(
          Layer.mergeAll(
            CliContextLive({
              args: {
                preset: 'react-full',
                name: projectName,
                git: false,
                install: true,
              },
              isInteractive: false,
            }),
            makeFsMockLayer({
              exists: () => Effect.succeed(false),
            }),
          ),
        ),
      ),
    )

    expect(projectConfig).toEqual({
      name: projectName,
      type: 'react',
      language: 'typescript',
      git: false,
      ...workspaceBootstrapDefaults,
      ...sharedFrontendDefaults,
      router: 'react-router',
      stateManagement: 'jotai',
    })
  })

  it('builds a standalone cli preset config without frontend defaults', async () => {
    const projectName = makeProjectName('non-interactive-cli')

    const projectConfig = await Effect.runPromise(
      collectQuestions.pipe(
        Effect.provide(
          Layer.mergeAll(
            CliContextLive({
              args: {
                preset: 'cli-minimal',
                name: projectName,
                git: false,
              },
              isInteractive: false,
            }),
            makeFsMockLayer({
              exists: () => Effect.succeed(false),
            }),
          ),
        ),
      ),
    )

    expect(projectConfig).toEqual({
      name: projectName,
      type: 'cli',
      language: 'typescript',
      git: false,
      linting: 'none',
      codeQuality: [],
    })
  })

  it('builds a workspace root preset config without frontend child package fields', async () => {
    const projectName = makeProjectName('non-interactive-workspace-root')

    const projectConfig = await Effect.runPromise(
      collectQuestions.pipe(
        Effect.provide(
          Layer.mergeAll(
            CliContextLive({
              args: {
                preset: 'workspace-root',
                name: projectName,
                git: false,
                install: false,
              },
              isInteractive: false,
            }),
            makeFsMockLayer({
              exists: () => Effect.succeed(false),
            }),
          ),
        ),
      ),
    )

    expect(projectConfig).toEqual({
      name: projectName,
      type: 'workspace-root',
      language: 'typescript',
      git: false,
      linting: 'antfu-eslint',
      codeQuality: [],
      packageManager: 'pnpm',
    })
    expect(projectConfig).not.toHaveProperty('buildTool')
    expect(projectConfig).not.toHaveProperty('router')
  })
})
