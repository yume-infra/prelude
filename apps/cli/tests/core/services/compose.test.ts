import type { StandardCommand } from '@effect/platform/Command'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Command } from '@effect/platform'
import { Effect, Layer, LogLevel, Option } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeProjectName } from '@/brand/project-name'
import { makeTargetDir } from '@/brand/target-dir'
import { AppConfig } from '@/config/app-config'
import { CliContextLive } from '@/core/cli-context'
import { CommandError, FileIOError, PlanTargetPathError } from '@/core/errors'
import { contributionTrace, ContributionUnitKind, WorkspaceBootstrapOwner } from '@/core/ownership/model'
import { executeAllCommandsInDir, finishProject, previewProject, withWorkingDirectory } from '../../../src/core/services/compose'
import { OrchestratorService } from '../../../src/core/services/orchestrator'
import { PlanService, toPlanSpec } from '../../../src/core/services/planner'
import { reactPresetProjectConfig } from '../../support/fixtures'
import { makeCommandMockLayer, makeFsMockLayer, makeTemplateEngineMockLayer } from '../../support/mock-layers'

function makePreviewProjectLayer({
  copiedPaths = [],
  directories = [],
  executedCommands = [],
  writtenPaths = [],
}: {
  readonly copiedPaths?: string[]
  readonly directories?: string[]
  readonly executedCommands?: string[]
  readonly writtenPaths?: string[]
} = {}) {
  const appConfigLayer = Layer.succeed(AppConfig, AppConfig.make({
    logLevel: LogLevel.Debug,
    defaultConcurrency: 1,
    tracingEndpoint: Option.none(),
    debug: false,
  }))

  const fsLayer = makeFsMockLayer({
    copyFile: (_src, dest) => Effect.sync(() => {
      copiedPaths.push(dest)
    }),
    makeDirectory: path => Effect.sync(() => {
      directories.push(path)
    }),
    writeFileString: path => Effect.sync(() => {
      writtenPaths.push(path)
    }),
  })

  const templateLayer = makeTemplateEngineMockLayer()
  const planLayer = PlanService.DefaultWithoutDependencies.pipe(
    Layer.provideMerge(Layer.mergeAll(appConfigLayer, fsLayer, templateLayer)),
  )
  const orchestratorLayer = OrchestratorService.DefaultWithoutDependencies.pipe(
    Layer.provideMerge(Layer.mergeAll(planLayer, templateLayer)),
  )
  const cliLayer = CliContextLive({
    args: {
      _: [],
      preset: 'react-full',
      name: reactPresetProjectConfig.name,
      install: true,
      git: true,
      rollback: true,
    },
    isInteractive: false,
  })
  const commandLayer = makeCommandMockLayer({
    execute: (command) => {
      executedCommands.push(`${command.command} ${command.args.join(' ')}`)
      return Effect.succeed('')
    },
  })

  return Layer.mergeAll(orchestratorLayer, cliLayer, commandLayer)
}

describe('command working directory helpers', () => {
  it('keeps finishProject project annotations distinct from command execution annotations', () => {
    const source = readFileSync(new URL('../../../src/core/services/compose.ts', import.meta.url), 'utf8')

    expect(source).toContain('Effect.withSpan(\'finish.project\')')
    expect(source).toContain('withProjectAnnotations(config, \'finish.project\'')
    expect(source).toContain('commandOwner: command.ownership.owner')
    expect(source).toContain('commandUnit: command.ownership.unit')
    expect(source).toContain('commandPhase: command.phase')
    expect(source).not.toContain('withProjectAnnotations(config, \'command.execute\'')
  })

  it('applies the target directory through Command.workingDirectory', () => {
    const command = Command.make('pnpm', 'install') as StandardCommand
    const targetDir = makeTargetDir('/tmp/create-yume-working-dir')

    const located = withWorkingDirectory(command, targetDir)

    expect(Option.isSome(located.cwd)).toBe(true)
    if (Option.isSome(located.cwd)) {
      expect(located.cwd.value).toBe(targetDir)
    }
  })

  it('executes every command with the provided working directory', async () => {
    const commands = [
      {
        command: Command.make('pnpm', 'install') as StandardCommand,
        phase: 'after-plan-apply' as const,
        ownership: contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.PostGenerateCommand),
      },
      {
        command: Command.make('git', 'status') as StandardCommand,
        phase: 'after-plan-apply' as const,
        ownership: contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.PostGenerateCommand),
      },
    ]
    const targetDir = makeTargetDir('/tmp/create-yume-execute-dir')
    const executed: Array<{ command: string, cwd?: string }> = []

    await Effect.runPromise(
      executeAllCommandsInDir(commands, targetDir).pipe(
        Effect.provide(
          Layer.mergeAll(
            makeFsMockLayer(),
            makeCommandMockLayer({
              execute: (command) => {
                executed.push({
                  command: `${command.command} ${command.args.join(' ')}`,
                  ...(Option.isSome(command.cwd) ? { cwd: command.cwd.value } : {}),
                })
                return Effect.succeed('')
              },
            }),
          ),
        ),
      ),
    )

    expect(executed).toEqual([
      { command: 'pnpm install', cwd: targetDir },
      { command: 'git status', cwd: targetDir },
    ])
  })

  it('serializes post-generate commands and file actions from the actual plan model', () => {
    const commandOwnership = contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.PostGenerateCommand)
    const fileOwnership = contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.PostGenerateFile)

    const tracedPlanSpec = toPlanSpec({
      tasks: [],
      postGenerateCommands: [
        {
          command: Command.make('pnpm', 'install') as StandardCommand,
          phase: 'after-plan-apply',
          ownership: commandOwnership,
        },
      ],
      postGenerateFileActions: [
        {
          kind: 'write-file',
          path: '.husky/pre-commit',
          content: 'pnpm lint-staged\n',
          phase: 'after-post-generate-commands',
          ownership: fileOwnership,
          executable: true,
        },
      ],
    })

    expect(tracedPlanSpec).toEqual({
      tasks: [],
      postGenerateCommands: [
        {
          command: 'pnpm',
          args: ['install'],
          phase: 'after-plan-apply',
          ownership: commandOwnership,
        },
      ],
      postGenerateFileActions: [
        {
          kind: 'write-file',
          path: '.husky/pre-commit',
          content: 'pnpm lint-staged\n',
          phase: 'after-post-generate-commands',
          ownership: fileOwnership,
          executable: true,
        },
      ],
    })
  })

  it('builds dry-run preview without applying plans or executing commands', async () => {
    const copiedPaths: string[] = []
    const directories: string[] = []
    const executedCommands: string[] = []
    const writtenPaths: string[] = []

    const preview = await Effect.runPromise(
      previewProject(reactPresetProjectConfig).pipe(
        Effect.provide(makePreviewProjectLayer({
          copiedPaths,
          directories,
          executedCommands,
          writtenPaths,
        })),
      ),
    )

    expect(preview).toContain('Dry run preview')
    expect(preview).toContain('No files or directories will be written, and no commands will be executed.')
    expect(preview).toContain('- json package.json')
    expect(preview).toContain('owner: router, unit: json-text-mutation')
    expect(preview).toContain('after-plan-apply: pnpm install')
    expect(preview).toContain('after-post-generate-commands: write-file .husky/pre-commit (executable: false) (owner: workspace-bootstrap, unit: post-generate-file)')
    expect(preview).toContain('after-post-generate-commands: write-file .husky/commit-msg (executable: true) (owner: workspace-bootstrap, unit: post-generate-file)')
    expect(preview).not.toContain('node -e')
    expect(executedCommands).toEqual([])
    expect(copiedPaths).toEqual([])
    expect(directories).toEqual([])
    expect(writtenPaths).toEqual([])
  })

  it('executes post-generate commands from the emitted plan', async () => {
    const targetDir = makeTargetDir('./phase2-plan-commands')
    const executed: Array<{ command: string, cwd?: string }> = []

    await Effect.runPromise(
      finishProject(
        {
          type: 'react',
          name: makeProjectName('phase2-plan-commands'),
          language: 'typescript',
          git: true,
          linting: 'antfu-eslint',
          codeQuality: ['lint-staged'],
          buildTool: 'vite',
          router: 'react-router',
          stateManagement: 'zustand',
          cssPreprocessor: 'css',
          cssFramework: 'none',
        },
        {
          tasks: [],
          postGenerateCommands: [
            {
              command: Command.make('pnpm', 'install') as StandardCommand,
              phase: 'after-plan-apply',
              ownership: contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.PostGenerateCommand),
            },
          ],
        },
      ).pipe(
        Effect.provide(
          Layer.mergeAll(
            makeFsMockLayer(),
            makeCommandMockLayer({
              execute: (command) => {
                executed.push({
                  command: `${command.command} ${command.args.join(' ')}`,
                  ...(Option.isSome(command.cwd) ? { cwd: command.cwd.value } : {}),
                })
                return Effect.succeed('')
              },
            }),
          ),
        ),
      ),
    )

    expect(executed).toEqual([
      { command: 'pnpm install', cwd: targetDir },
    ])
  })

  it('rolls back the generated project when a post-generate command fails', async () => {
    const targetDir = makeTargetDir('./post-command-failure')
    const removes: string[] = []
    const cause = new Error('forced command failure')

    const exit = await Effect.runPromiseExit(
      finishProject(
        {
          type: 'react',
          name: makeProjectName('post-command-failure'),
          language: 'typescript',
          git: true,
          linting: 'antfu-eslint',
          codeQuality: ['lint-staged'],
          buildTool: 'vite',
          router: 'react-router',
          stateManagement: 'zustand',
          cssPreprocessor: 'css',
          cssFramework: 'none',
        },
        {
          tasks: [],
          postGenerateCommands: [
            {
              command: Command.make('git', 'init') as StandardCommand,
              phase: 'after-plan-apply',
              ownership: contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.PostGenerateCommand),
            },
          ],
        },
      ).pipe(
        Effect.provide(
          Layer.mergeAll(
            makeFsMockLayer({
              remove: path =>
                Effect.sync(() => {
                  removes.push(path)
                }),
            }),
            makeCommandMockLayer({
              execute: command =>
                Effect.fail(new CommandError({
                  command: command.command,
                  args: [...command.args],
                  ...(Option.isSome(command.cwd) ? { cwd: command.cwd.value } : {}),
                  cause,
                  stdout: 'post stdout line 1\npost stdout line 2',
                  stderr: 'post stderr line 1\npost stderr line 2',
                  output: 'post combined line 1\npost combined line 2',
                })),
            }),
          ),
        ),
      ),
    )

    expect(exit._tag).toBe('Failure')
    expect(removes).toEqual([targetDir])
    if (exit._tag === 'Failure') {
      const failure = exit.cause._tag === 'Fail' ? exit.cause.error : undefined
      expect(failure).toBeInstanceOf(CommandError)
      expect(failure).toMatchObject({
        command: 'git',
        args: ['init'],
        cwd: targetDir,
        cause,
        stdout: 'post stdout line 1\npost stdout line 2',
        stderr: 'post stderr line 1\npost stderr line 2',
        output: 'post combined line 1\npost combined line 2',
      })
    }
  })

  it('executes post-generate file actions after post-generate commands', async () => {
    const targetDir = makeTargetDir('./post-file-actions')
    const hookPath = path.resolve(targetDir, '.husky/pre-commit')
    const events: string[] = []

    await Effect.runPromise(
      finishProject(
        {
          type: 'react',
          name: makeProjectName('post-file-actions'),
          language: 'typescript',
          git: true,
          linting: 'antfu-eslint',
          codeQuality: ['lint-staged'],
          buildTool: 'vite',
          router: 'react-router',
          stateManagement: 'zustand',
          cssPreprocessor: 'css',
          cssFramework: 'none',
        },
        {
          tasks: [],
          postGenerateCommands: [
            {
              command: Command.make('pnpm', 'install') as StandardCommand,
              phase: 'after-plan-apply',
              ownership: contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.PostGenerateCommand),
            },
          ],
          postGenerateFileActions: [
            {
              kind: 'write-file',
              path: '.husky/pre-commit',
              content: 'pnpm lint-staged\n',
              phase: 'after-post-generate-commands',
              ownership: contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.PostGenerateFile),
              executable: true,
            },
          ],
        },
      ).pipe(
        Effect.provide(
          Layer.mergeAll(
            makeFsMockLayer({
              ensureDir: dir => Effect.sync(() => {
                events.push(`mkdir:${dir}`)
              }),
              writeFileString: (file, content) => Effect.sync(() => {
                events.push(`write:${file}:${content}`)
              }),
              chmod: (file, mode) => Effect.sync(() => {
                events.push(`chmod:${file}:${mode.toString(8)}`)
              }),
            }),
            makeCommandMockLayer({
              execute: command => Effect.sync(() => {
                events.push(`command:${command.command} ${command.args.join(' ')}`)
                return ''
              }),
            }),
          ),
        ),
      ),
    )

    expect(events).toEqual([
      'command:pnpm install',
      `mkdir:${path.dirname(hookPath)}`,
      `write:${hookPath}:pnpm lint-staged\n`,
      `chmod:${hookPath}:755`,
    ])
  })

  it('rejects post-generate file actions that escape the target directory', async () => {
    const targetDir = makeTargetDir('./post-file-escape')
    const removes: string[] = []

    const exit = await Effect.runPromiseExit(
      finishProject(
        {
          type: 'react',
          name: makeProjectName('post-file-escape'),
          language: 'typescript',
          git: true,
          linting: 'antfu-eslint',
          codeQuality: ['lint-staged'],
          buildTool: 'vite',
          router: 'react-router',
          stateManagement: 'zustand',
          cssPreprocessor: 'css',
          cssFramework: 'none',
        },
        {
          tasks: [],
          postGenerateFileActions: [
            {
              kind: 'write-file',
              path: '../outside',
              content: 'nope\n',
              phase: 'after-post-generate-commands',
            },
          ],
        },
      ).pipe(
        Effect.provide(makeFsMockLayer({
          remove: file => Effect.sync(() => {
            removes.push(file)
          }),
        })),
      ),
    )

    expect(exit._tag).toBe('Failure')
    expect(removes).toEqual([targetDir])
    if (exit._tag === 'Failure') {
      const failure = exit.cause._tag === 'Fail' ? exit.cause.error : undefined
      expect(failure).toBeInstanceOf(PlanTargetPathError)
    }
  })

  it('rolls back the generated project when a post-generate file action fails', async () => {
    const targetDir = makeTargetDir('./post-file-failure')
    const removes: string[] = []

    const exit = await Effect.runPromiseExit(
      finishProject(
        {
          type: 'react',
          name: makeProjectName('post-file-failure'),
          language: 'typescript',
          git: true,
          linting: 'antfu-eslint',
          codeQuality: ['lint-staged'],
          buildTool: 'vite',
          router: 'react-router',
          stateManagement: 'zustand',
          cssPreprocessor: 'css',
          cssFramework: 'none',
        },
        {
          tasks: [],
          postGenerateFileActions: [
            {
              kind: 'write-file',
              path: '.husky/pre-commit',
              content: 'pnpm lint-staged\n',
              phase: 'after-post-generate-commands',
            },
          ],
        },
      ).pipe(
        Effect.provide(makeFsMockLayer({
          writeFileString: file => Effect.fail(new FileIOError({
            op: 'write',
            path: file,
            message: 'forced file failure',
          })),
          remove: file => Effect.sync(() => {
            removes.push(file)
          }),
        })),
      ),
    )

    expect(exit._tag).toBe('Failure')
    expect(removes).toEqual([targetDir])
    if (exit._tag === 'Failure') {
      const actualFailure = exit.cause._tag === 'Fail' ? exit.cause.error : undefined
      expect(actualFailure).toBeInstanceOf(FileIOError)
      expect(actualFailure).toMatchObject({
        op: 'write',
        message: 'forced file failure',
      })
    }
  })
})
