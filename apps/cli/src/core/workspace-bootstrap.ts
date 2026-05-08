import type { PackageManifestContribution } from '@/core/modifier/package-manifest-contributions'
import type { JsonBuilder, PostGenerateFileAction } from '@/core/services/planner'
import type { GenerationPackageSpec } from '@/schema/generation-package-spec'
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
import { isCliProject, isFrontendProject, isLibraryProject, isNodeProject } from '@/utils/type-guard'

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
type WorkspaceBootstrapPackagePolicy = ProjectConfig
type WorkspaceBootstrapCommandPolicy = Pick<ProjectConfig, 'git' | 'codeQuality'>
type InstallPolicyResolution = boolean | 'prompt'

export const workspaceRootPackageGlobs = ['apps/*', 'libs/*'] as const

const workspaceRootDevDependencies = {
  turbo: '^2.9.9',
} as const

const workspaceBootstrapLintDevDependencies = {
  '@antfu/eslint-config': '^8.2.0',
  'eslint': '^10.3.0',
} as const

const workspaceBootstrapMaintenanceDevDependencies = {
  knip: '^6.12.0',
  taze: '^19.11.0',
} as const

const workspaceBootstrapLintScripts = {
  'lint': 'eslint',
  'lint:fix': 'eslint --fix',
} as const

const workspaceBootstrapMaintenanceScripts = {
  'deps:check': 'taze',
  'deps:check:all': 'taze --all',
  'deps:fresh': 'taze minor -w -i --maturity-period 7',
  'knip': 'knip',
} as const

const workspaceBootstrapHuskyScripts = {
  'husky:install': 'husky',
  'prepare': 'node -e "if (require(\'node:fs\').existsSync(\'.git\')) require(\'node:child_process\').execFileSync(\'husky\', { stdio: \'inherit\', shell: true })"',
} as const

function workspaceBootstrapHuskyPackage(draft: Record<string, unknown>) {
  devDeps({ husky: '^9.1.7' })(draft)
  scripts(workspaceBootstrapHuskyScripts)(draft)
}

const workspaceRootMaintenanceScripts = {
  'deps:check': 'taze -r',
  'deps:check:all': 'taze -r --all',
  'deps:fresh': 'taze minor -r -w -i --maturity-period 7',
  'knip': 'knip',
} as const

type WorkspacePackageScriptName = 'build' | 'dev' | 'preview' | 'smoke:bin' | 'start' | 'typecheck'
type WorkspaceRootScriptName = 'build' | 'dev' | 'typecheck'

const workspaceRootScriptCommands = {
  build: 'turbo run build',
  dev: 'turbo run dev',
  typecheck: 'turbo run typecheck',
} as const

const defaultWorkspaceBootstrapCodeQuality = ['lint-staged', 'commitlint'] as const satisfies readonly CodeQuality[]
const lintStagedHook = `${formatPackageManagerCommand(packageManagerInvokeCommand('lint-staged'))}\n`
const commitLintHook = `${formatPackageManagerCommand(packageManagerExecCommand('commitlint', '--edit', '"$1"'))}\n`

export const workspaceBootstrapPackageJsonMutation = contributionTrace(
  WorkspaceBootstrapOwner,
  ContributionUnitKind.JsonTextMutation,
)

const workspaceBootstrapPostGenerateFileAction = contributionTrace(
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
      targetScope: 'root',
      sections: {
        devDependencies: workspaceBootstrapLintDevDependencies,
        scripts: workspaceBootstrapLintScripts,
      },
    })
  }

  contributions.push({
    ownership: workspaceBootstrapPackageJsonMutation,
    targetScope: 'root',
    sections: {
      devDependencies: workspaceBootstrapMaintenanceDevDependencies,
      scripts: {
        ...workspaceBootstrapMaintenanceScripts,
        verify: getWorkspaceBootstrapVerifyScript(config),
      },
    },
  })

  contributions.push(...getWorkspaceBootstrapCodeQualityPackageContributions(config))

  return contributions
}

function getWorkspaceBootstrapVerifyScript(config: WorkspaceBootstrapPackagePolicy): string {
  const commands: string[] = []

  if (isFrontendProject(config)) {
    if (config.buildTool === 'vite') {
      commands.push('pnpm build')
    }
  }
  else if (isNodeProject(config) || isCliProject(config) || isLibraryProject(config)) {
    commands.push('pnpm build', 'pnpm typecheck')
  }

  if (config.linting === 'antfu-eslint') {
    commands.push('pnpm lint')
  }

  commands.push('pnpm knip')

  return commands.join(' && ')
}

function emittedWorkspacePackageScripts(spec: GenerationPackageSpec): readonly WorkspacePackageScriptName[] {
  switch (spec.kind) {
    case 'frontend-app':
      return spec.frontend.buildTool === 'vite'
        ? ['build', 'dev', 'preview']
        : []
    case 'backend-app':
      return ['build', 'start', 'typecheck']
    case 'cli-tool':
      return ['build', 'smoke:bin', 'typecheck']
    case 'library-package':
      return ['build', 'typecheck']
    case 'worker-app':
      return []
    default: {
      const exhaustive: never = spec
      return exhaustive
    }
  }
}

export function getWorkspaceRootScripts(
  config: Pick<WorkspaceRootConfig, 'packages'>,
): Partial<Record<WorkspaceRootScriptName, string>> {
  const packageScripts = new Set(config.packages.flatMap(spec => emittedWorkspacePackageScripts(spec)))
  const rootScripts: Partial<Record<WorkspaceRootScriptName, string>> = {}

  for (const scriptName of Object.keys(workspaceRootScriptCommands) as WorkspaceRootScriptName[]) {
    if (packageScripts.has(scriptName)) {
      rootScripts[scriptName] = workspaceRootScriptCommands[scriptName]
    }
  }

  return rootScripts
}

function getWorkspaceRootVerifyScript(config: Pick<WorkspaceRootConfig, 'packages'>): string {
  const rootScripts = getWorkspaceRootScripts(config)
  const commands: string[] = []

  if (rootScripts.build) {
    commands.push('pnpm build')
  }

  if (rootScripts.typecheck) {
    commands.push('pnpm typecheck')
  }

  commands.push('pnpm knip')

  return commands.join(' && ')
}

function getWorkspaceBootstrapCodeQualityPackageContributions(
  config: Pick<WorkspaceBootstrapPackagePolicy, 'codeQuality'>,
): PackageManifestContribution[] {
  const contributions: PackageManifestContribution[] = []

  if (config.codeQuality.length > 0) {
    contributions.push({
      ownership: workspaceBootstrapPackageJsonMutation,
      targetScope: 'root',
      sections: {
        devDependencies: { husky: '^9.1.7' },
        scripts: workspaceBootstrapHuskyScripts,
      },
    })
  }

  if (config.codeQuality.includes('lint-staged')) {
    contributions.push({
      ownership: workspaceBootstrapPackageJsonMutation,
      targetScope: 'root',
      sections: {
        devDependencies: { 'lint-staged': '^17.0.2' },
      },
    })
  }

  if (config.codeQuality.includes('commitlint')) {
    contributions.push({
      ownership: workspaceBootstrapPackageJsonMutation,
      targetScope: 'root',
      sections: {
        devDependencies: {
          '@commitlint/cli': '^20.5.3',
          '@commitlint/config-conventional': '^20.5.3',
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
      targetScope: 'root',
      fields: {
        private: true,
        packageManager: getPackageManagerField(),
        description: 'A pnpm workspace root generated by create-yume',
      },
      sections: {
        scripts: {
          ...getWorkspaceRootScripts(config),
          ...workspaceRootMaintenanceScripts,
          verify: getWorkspaceRootVerifyScript(config),
        },
        devDependencies: {
          ...workspaceRootDevDependencies,
          ...workspaceBootstrapMaintenanceDevDependencies,
        },
        engines: {
          node: '>=22.22.1',
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
    .modify(when(config.linting === 'antfu-eslint', devDeps({ '@antfu/eslint-config': '^8.2.0', 'eslint': '^10.3.0' })), workspaceBootstrapPackageJsonMutation)
    .modify(when(config.linting === 'antfu-eslint', scripts({ 'lint': 'eslint', 'lint:fix': 'eslint --fix' })), workspaceBootstrapPackageJsonMutation)
    .modify(devDeps(workspaceBootstrapMaintenanceDevDependencies), workspaceBootstrapPackageJsonMutation)
    .modify(scripts({ ...workspaceBootstrapMaintenanceScripts, verify: getWorkspaceBootstrapVerifyScript(config) }), workspaceBootstrapPackageJsonMutation)
    .modify(when(config.codeQuality.length > 0, workspaceBootstrapHuskyPackage), workspaceBootstrapPackageJsonMutation)
    .modify(when(config.codeQuality.includes('lint-staged'), devDeps({ 'lint-staged': '^17.0.2' })), workspaceBootstrapPackageJsonMutation)
    .modify(when(config.codeQuality.includes('commitlint'), devDeps({ '@commitlint/cli': '^20.5.3', '@commitlint/config-conventional': '^20.5.3' })), workspaceBootstrapPackageJsonMutation)
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

    commands.push(packageManagerExecCommand('husky'))
  }

  return commands
}
