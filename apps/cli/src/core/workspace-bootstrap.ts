import type { PackageManifestContribution } from '@/core/modifier/package-manifest-contributions'
import type { JsonBuilder, PostGenerateFileAction } from '@/core/services/planner'
import type { CodeQuality, Linting, ProjectConfig, WorkspaceRootConfig } from '@/schema/project-config'
import { contributionTrace, ContributionUnitKind, WorkspaceBootstrapOwner } from '@/core/ownership/model'
import {
  formatPackageManagerCommand,
  getPackageManagerField,
  packageManagerAddDevCommand,
  packageManagerExecCommand,
  packageManagerInstallCommand,
  packageManagerInvokeCommand,
} from '@/core/package-manager'
import { devDeps, scripts, when } from '@/utils/file-helper'

interface SelectOption<T> {
  readonly value: T
  readonly label: string
}

interface ConfirmQuestionContract {
  readonly message: string
  readonly initialValue: boolean
}

interface SelectQuestionContract<T> {
  readonly message: string
  readonly options: readonly SelectOption<T>[]
}

interface MultiSelectQuestionContract<T> extends SelectQuestionContract<T> {
  readonly required: boolean
}

interface WorkspaceBootstrapHookSpec {
  readonly path: string
  readonly content: string
  readonly executable: boolean
}

export interface WorkspaceBootstrapCommandSpec {
  readonly command: string
  readonly args: readonly string[]
}

type WorkspaceBootstrapQuestionPolicy = Pick<ProjectConfig, 'git' | 'linting'>
type WorkspaceBootstrapPackagePolicy = Pick<ProjectConfig, 'git' | 'linting' | 'codeQuality'>
type WorkspaceBootstrapCommandPolicy = Pick<ProjectConfig, 'git' | 'codeQuality'>
type InstallPolicyResolution = boolean | 'prompt'

export const workspaceRootPackageGlobs = ['apps/*', 'libs/*'] as const

const workspaceRootDevDependencies = {
  turbo: '^2.9.6',
} as const

const workspaceBootstrapLintDevDependencies = {
  '@antfu/eslint-config': '^8.2.0',
  'eslint': '^10.2.1',
} as const

const workspaceBootstrapLintScripts = {
  'lint': 'eslint',
  'lint:fix': 'eslint --fix',
} as const

const workspaceRootScripts = {
  build: 'turbo run build',
  dev: 'turbo run dev',
  test: 'turbo run test',
  lint: 'turbo run lint',
  typecheck: 'turbo run typecheck',
  clean: 'turbo run clean',
} as const

const defaultWorkspaceBootstrapCodeQuality = ['lint-staged', 'commitlint'] as const satisfies readonly CodeQuality[]
const lintStagedHook = `${formatPackageManagerCommand(packageManagerInvokeCommand('lint-staged'))}\n`
const commitLintHook = `${formatPackageManagerCommand(packageManagerExecCommand('commitlint', '--edit', '"$1"'))}\n`

export const workspaceBootstrapPackageJsonMutation = contributionTrace(
  WorkspaceBootstrapOwner,
  ContributionUnitKind.JsonTextMutation,
)

export const workspaceBootstrapPostGenerateFileAction = contributionTrace(
  WorkspaceBootstrapOwner,
  ContributionUnitKind.PostGenerateFile,
)

export const workspaceBootstrapQuestionContracts = {
  git: {
    message: 'initialize Git repository?',
    initialValue: true,
  } satisfies ConfirmQuestionContract,
  linting: {
    message: 'choose a linting tool:',
    options: [
      { value: 'antfu-eslint', label: 'Antfu ESLint' },
      { value: 'none', label: 'No Linting' },
    ],
  } satisfies SelectQuestionContract<Linting>,
  codeQuality: {
    message: 'choose code quality tools:',
    required: false,
    options: [
      { value: 'lint-staged', label: 'Lint Staged' },
      { value: 'commitlint', label: 'Commitlint' },
    ],
  } satisfies MultiSelectQuestionContract<CodeQuality>,
} as const

export function shouldAskWorkspaceBootstrapCodeQuality(config: WorkspaceBootstrapQuestionPolicy): boolean {
  return config.git && config.linting !== 'none'
}

export function getWorkspaceBootstrapPresetDefaults(git: boolean): {
  readonly linting: Linting
  readonly codeQuality: CodeQuality[]
} {
  return {
    linting: 'antfu-eslint',
    codeQuality: git ? [...defaultWorkspaceBootstrapCodeQuality] : [],
  }
}

export function resolveWorkspaceBootstrapInstallPolicy(options: {
  readonly cliInstallArg: boolean | undefined
  readonly isInteractive: boolean
}): InstallPolicyResolution {
  if (options.cliInstallArg !== undefined) {
    return options.cliInstallArg
  }

  return options.isInteractive ? 'prompt' : false
}

export function getWorkspaceBootstrapPackageContributions(
  config: WorkspaceBootstrapPackagePolicy,
): PackageManifestContribution[] {
  const contributions: PackageManifestContribution[] = []

  if (config.linting === 'antfu-eslint') {
    contributions.push({
      ownership: workspaceBootstrapPackageJsonMutation,
      sections: {
        devDependencies: workspaceBootstrapLintDevDependencies,
        scripts: workspaceBootstrapLintScripts,
      },
    })
  }

  contributions.push(...getWorkspaceBootstrapCodeQualityPackageContributions(config))

  return contributions
}

function getWorkspaceBootstrapCodeQualityPackageContributions(
  config: Pick<WorkspaceBootstrapPackagePolicy, 'codeQuality'>,
): PackageManifestContribution[] {
  const contributions: PackageManifestContribution[] = []

  if (config.codeQuality.length > 0) {
    contributions.push({
      ownership: workspaceBootstrapPackageJsonMutation,
      sections: {
        devDependencies: { husky: '^9.1.7' },
      },
    })
  }

  if (config.codeQuality.includes('lint-staged')) {
    contributions.push({
      ownership: workspaceBootstrapPackageJsonMutation,
      sections: {
        devDependencies: { 'lint-staged': '^16.4.0' },
      },
    })
  }

  if (config.codeQuality.includes('commitlint')) {
    contributions.push({
      ownership: workspaceBootstrapPackageJsonMutation,
      sections: {
        devDependencies: {
          '@commitlint/cli': '^20.5.0',
          '@commitlint/config-conventional': '^20.5.0',
        },
      },
    })
  }

  return contributions
}

export function getWorkspaceRootPackageContributions(
  config: WorkspaceRootConfig,
): PackageManifestContribution[] {
  return [
    {
      ownership: workspaceBootstrapPackageJsonMutation,
      fields: {
        private: true,
        packageManager: getPackageManagerField(),
        description: 'A pnpm workspace root generated by create-yume',
      },
      sections: {
        scripts: workspaceRootScripts,
        devDependencies: workspaceRootDevDependencies,
        engines: {
          node: '>=18.12.0',
        },
      },
    },
    ...getWorkspaceBootstrapCodeQualityPackageContributions(config),
  ]
}

export function applyWorkspaceBootstrapPackageJson(
  entry: JsonBuilder,
  config: WorkspaceBootstrapPackagePolicy,
): JsonBuilder {
  return entry
    .modify(when(config.linting === 'antfu-eslint', devDeps({ '@antfu/eslint-config': '^8.2.0', 'eslint': '^10.2.1' })), workspaceBootstrapPackageJsonMutation)
    .modify(when(config.linting === 'antfu-eslint', scripts({ 'lint': 'eslint', 'lint:fix': 'eslint --fix' })), workspaceBootstrapPackageJsonMutation)
    .modify(when(config.codeQuality.length > 0, devDeps({ husky: '^9.1.7' })), workspaceBootstrapPackageJsonMutation)
    .modify(when(config.codeQuality.includes('lint-staged'), devDeps({ 'lint-staged': '^16.4.0' })), workspaceBootstrapPackageJsonMutation)
    .modify(when(config.codeQuality.includes('commitlint'), devDeps({ '@commitlint/cli': '^20.5.0', '@commitlint/config-conventional': '^20.5.0' })), workspaceBootstrapPackageJsonMutation)
}

export function getWorkspaceBootstrapHookSpecs(config: WorkspaceBootstrapCommandPolicy): WorkspaceBootstrapHookSpec[] {
  if (config.codeQuality.length === 0) {
    return []
  }

  const hooks: WorkspaceBootstrapHookSpec[] = []

  if (config.codeQuality.includes('lint-staged')) {
    hooks.push({
      path: '.husky/pre-commit',
      content: lintStagedHook,
      executable: false,
    })
  }

  if (config.codeQuality.includes('commitlint')) {
    hooks.push({
      path: '.husky/commit-msg',
      content: commitLintHook,
      executable: true,
    })
  }

  return hooks
}

export function getWorkspaceBootstrapPostGenerateFileActions(config: WorkspaceBootstrapCommandPolicy): PostGenerateFileAction[] {
  return getWorkspaceBootstrapHookSpecs(config).map(hook => ({
    kind: 'write-file',
    path: hook.path,
    content: hook.content,
    phase: 'after-post-generate-commands',
    ownership: workspaceBootstrapPostGenerateFileAction,
    executable: hook.executable,
  }))
}

export function getWorkspaceBootstrapCommandSpecs(
  config: WorkspaceBootstrapCommandPolicy,
  installDeps: boolean,
): WorkspaceBootstrapCommandSpec[] {
  const commands: WorkspaceBootstrapCommandSpec[] = []

  if (installDeps) {
    commands.push(packageManagerInstallCommand())
  }

  if (config.git) {
    commands.push({ command: 'git', args: ['init'] })
  }

  if (config.codeQuality.length > 0) {
    if (!installDeps) {
      commands.push(packageManagerAddDevCommand('husky'))
    }

    commands.push(packageManagerExecCommand('husky', 'init'))
  }

  return commands
}
