import { readFileSync } from 'node:fs'
import { Effect, Either, Layer } from 'effect'
import { describe, expect, it } from 'vitest'
import { makePackageName } from '@/brand/package-name'
import { makeProjectName } from '@/brand/project-name'
import { getSharedFrontendPresetDefaults } from '@/core/template-registry/frontend-app'
import { getWorkspaceBootstrapPresetDefaults } from '@/core/workspace-bootstrap'
import { makePackageId } from '@/schema/create-spec'
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
                preset: 'standalone-cli-minimal',
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
      toolkit: 'none',
    })
  })

  it('builds a standalone effect cli preset config without frontend defaults', async () => {
    const projectName = makeProjectName('non-interactive-effect-cli')

    const projectConfig = await Effect.runPromise(
      collectQuestions.pipe(
        Effect.provide(
          Layer.mergeAll(
            CliContextLive({
              args: {
                preset: 'standalone-cli-effect',
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
      toolkit: 'effect',
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
      packages: [],
    })
    expect(projectConfig).not.toHaveProperty('buildTool')
    expect(projectConfig).not.toHaveProperty('router')
  })

  it('builds a CLI-focused workspace preset with an Effect CLI app and core library link', async () => {
    const projectName = makeProjectName('non-interactive-cli-workspace')

    const projectConfig = await Effect.runPromise(
      collectQuestions.pipe(
        Effect.provide(
          Layer.mergeAll(
            CliContextLive({
              args: {
                preset: 'workspace-cli-library',
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
      type: 'workspace-root',
      language: 'typescript',
      git: false,
      linting: 'antfu-eslint',
      codeQuality: [],
      packageManager: 'pnpm',
      packages: [
        {
          id: makePackageId('cli'),
          name: makePackageName('@non-interactive-cli-workspace/cli'),
          kind: 'cli-tool',
          runtime: 'node',
          internalDependencies: [
            {
              target: {
                by: 'id',
                id: makePackageId('core'),
              },
            },
          ],
          cli: {
            toolkit: 'effect',
          },
        },
        {
          id: makePackageId('core'),
          name: makePackageName('@non-interactive-cli-workspace/core'),
          kind: 'library-package',
          runtime: 'neutral',
          internalDependencies: [],
          library: {
            toolkit: 'none',
          },
        },
      ],
    })
  })

  it.each([
    ['workspace-fullstack-react', 'react'],
    ['workspace-fullstack-vue', 'vue'],
  ] as const)('builds a %s preset with web api and shared packages', async (preset, framework) => {
    const projectName = makeProjectName(`non-interactive-${framework}-workspace`)

    const projectConfig = await Effect.runPromise(
      collectQuestions.pipe(
        Effect.provide(
          Layer.mergeAll(
            CliContextLive({
              args: {
                preset,
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

    expect(projectConfig).toMatchObject({
      name: projectName,
      type: 'workspace-root',
      language: 'typescript',
      git: false,
      linting: 'antfu-eslint',
      codeQuality: [],
      packageManager: 'pnpm',
      packages: [
        {
          id: makePackageId('web'),
          name: makePackageName(`@non-interactive-${framework}-workspace/web`),
          kind: 'frontend-app',
          frontend: {
            framework,
          },
        },
        {
          id: makePackageId('api'),
          name: makePackageName(`@non-interactive-${framework}-workspace/api`),
          kind: 'backend-app',
        },
        {
          id: makePackageId('shared'),
          name: makePackageName(`@non-interactive-${framework}-workspace/shared`),
          kind: 'library-package',
          runtime: 'neutral',
        },
      ],
    })
    if (projectConfig.type !== 'workspace-root') {
      throw new Error('expected workspace-root config')
    }
    expect(projectConfig.packages[0]?.internalDependencies).toEqual([
      {
        target: {
          by: 'id',
          id: makePackageId('shared'),
        },
      },
    ])
    expect(projectConfig.packages[1]?.internalDependencies).toEqual([
      {
        target: {
          by: 'id',
          id: makePackageId('shared'),
        },
      },
    ])
  })

  it.each([
    ['standalone-library-minimal', 'neutral'],
    ['standalone-library-node', 'node'],
  ] as const)('builds %s as a standalone library preset', async (preset, runtime) => {
    const projectName = makeProjectName(`non-interactive-${runtime}-library`)

    const projectConfig = await Effect.runPromise(
      collectQuestions.pipe(
        Effect.provide(
          Layer.mergeAll(
            CliContextLive({
              args: {
                preset,
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
      type: 'library',
      language: 'typescript',
      git: false,
      linting: 'none',
      codeQuality: [],
      runtime,
    })
  })

  it.each([
    ['standalone-backend-full', 'node'],
    ['standalone-cli-full', 'cli'],
  ] as const)('builds %s with full code quality defaults', async (preset, type) => {
    const projectName = makeProjectName(`non-interactive-${type}-full`)

    const projectConfig = await Effect.runPromise(
      collectQuestions.pipe(
        Effect.provide(
          Layer.mergeAll(
            CliContextLive({
              args: {
                preset,
                name: projectName,
                git: true,
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

    expect(projectConfig).toMatchObject({
      name: projectName,
      type,
      language: 'typescript',
      git: true,
      linting: 'antfu-eslint',
      codeQuality: ['lint-staged', 'commitlint'],
    })
    if (type === 'cli') {
      expect(projectConfig).toMatchObject({
        toolkit: 'effect',
      })
    }
  })

  it('builds a workspace config from inline create spec input', async () => {
    const projectName = makeProjectName('spec-workspace')

    const projectConfig = await Effect.runPromise(
      collectQuestions.pipe(
        Effect.provide(
          Layer.mergeAll(
            CliContextLive({
              args: {
                spec: JSON.stringify({
                  shape: 'workspace',
                  packages: [],
                }),
                name: projectName,
                noInput: true,
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
      linting: 'none',
      codeQuality: [],
      packageManager: 'pnpm',
      packages: [],
    })
  })

  it('fails non-interactive incomplete input instead of invoking prompts', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        collectQuestions.pipe(
          Effect.provide(
            Layer.mergeAll(
              CliContextLive({
                args: {
                  noInput: true,
                },
                isInteractive: false,
              }),
              makeFsMockLayer({
                exists: () => Effect.succeed(false),
              }),
            ),
          ),
        ),
      ),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('SchemaContractError')
      expect(result.left.message).toContain('non-interactive mode requires --preset and --name')
    }
  })
})
