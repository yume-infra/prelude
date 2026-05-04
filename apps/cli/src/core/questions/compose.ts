import type { CodeQuality } from '@/schema/project-config'
import { Effect, ParseResult } from 'effect'
import { decodeProjectName, formatProjectNameError } from '@/brand/project-name'
import { makeProjectTargetDir } from '@/brand/target-dir'
import { SchemaContractError } from '@/core/errors'
import { PnpmPackageManager } from '@/core/package-manager'
import {
  getSharedFrontendPresetDefaults,
} from '@/core/template-registry/frontend-app'
import {
  getWorkspaceBootstrapPresetDefaults,
  shouldAskWorkspaceBootstrapCodeQuality,
} from '@/core/workspace-bootstrap'
import { decodeProjectConfig, formatProjectConfigError } from '@/schema/project-config'
import { FsService } from '~/fs'
import { ask } from '../adapters/prompts'
import { CliContext } from '../cli-context'
import { askProjectName } from '../questions/common/project-name'
import { askRemoveExisting } from '../questions/common/remove-existing'
import { askCodeQuality } from './common/code-quality'
import { askGit } from './common/git'
import { askLanguage } from './common/language'
import { askLinting } from './common/linting'
import { askPreset } from './common/preset'
import { askCreateMode } from './create-mode'
import { askBuildTool } from './frontend/build-tool'
import { askCSSFramework } from './frontend/css-framework'
import { askCSSPreprocessor } from './frontend/css-preprocessor'
import { askProjectType } from './project-type'
import { askReactRouter } from './react/router'
import { askReactStateManagement } from './react/state-management'
import { askVueRouter } from './vue/router'
import { askVueStateManagement } from './vue/state-management'

function decodePromptedProjectName(input: string) {
  return decodeProjectName(input).pipe(
    Effect.mapError(error => new SchemaContractError({
      schema: 'ProjectName',
      message: formatProjectNameError(error),
      issueCount: ParseResult.ArrayFormatter.formatErrorSync(error).length,
    })),
  )
}

const askProjectNameSafe = Effect.gen(function* () {
  const fs = yield* FsService
  const cli = yield* CliContext
  const preferredName = cli.args.name

  while (true) {
    const name = preferredName ?? (yield* decodePromptedProjectName(yield* ask(askProjectName)))
    const targetDir = makeProjectTargetDir(name)

    const exists = yield* fs.exists(targetDir)
    if (!exists) {
      return name
    }

    if (preferredName && !cli.isInteractive) {
      return yield* new SchemaContractError({
        schema: 'CliArgs',
        message: `Target directory "${targetDir}" already exists. Remove it first or choose another --name.`,
      })
    }

    const confirmRemove = yield* ask(() => askRemoveExisting(name))
    if (confirmRemove) {
      yield* fs.remove(targetDir, { recursive: true, force: true })
      return name
    }

    if (preferredName) {
      return yield* new SchemaContractError({
        schema: 'CliArgs',
        message: `Target directory "${targetDir}" already exists and was not removed.`,
      })
    }

    yield* Effect.logWarning('目录已存在且未选择删除，请重新输入项目名。')
  }
})

const askBaseCommon = Effect.gen(function* () {
  const cli = yield* CliContext
  const name = yield* askProjectNameSafe
  const language = yield* ask(askLanguage)
  const git = cli.args.git ?? (yield* ask(askGit))
  const linting = yield* ask(askLinting)
  let codeQuality: CodeQuality[] = []
  if (shouldAskWorkspaceBootstrapCodeQuality({ git, linting })) {
    codeQuality = yield* ask(askCodeQuality)
  }
  return { name, language, git, linting, codeQuality }
})

const askNodeRuntimeBaseCommon = Effect.gen(function* () {
  const cli = yield* CliContext
  const name = yield* askProjectNameSafe
  const git = cli.args.git ?? (yield* ask(askGit))
  const linting = yield* ask(askLinting)
  let codeQuality: CodeQuality[] = []
  if (shouldAskWorkspaceBootstrapCodeQuality({ git, linting })) {
    codeQuality = yield* ask(askCodeQuality)
  }
  return { name, language: 'typescript' as const, git, linting, codeQuality }
})

const askFrontendCommon = Effect.gen(function* () {
  const buildTool = yield* ask(askBuildTool)
  const cssPreprocessor = yield* ask(askCSSPreprocessor)
  const cssFramework = yield* ask(askCSSFramework)
  return { buildTool, cssPreprocessor, cssFramework }
})

function decodeCollectedProjectConfig(input: unknown) {
  return decodeProjectConfig(input).pipe(
    Effect.mapError(error => new SchemaContractError({
      schema: 'ProjectConfig',
      message: formatProjectConfigError(error),
      issueCount: ParseResult.ArrayFormatter.formatErrorSync(error).length,
    })),
  )
}

function assertNever(value: never): never {
  throw new Error(`Unreachable case: ${String(value)}`)
}

export const createProject = Effect.gen(function* () {
  const projectType = yield* ask(askProjectType)

  if (projectType === 'vue') {
    const base = yield* askBaseCommon
    const frontend = yield* askFrontendCommon
    const router = yield* ask(askVueRouter)
    const stateManagement = yield* ask(askVueStateManagement)
    return {
      ...base,
      ...frontend,
      type: 'vue',
      router,
      stateManagement,
    }
  }

  if (projectType === 'react') {
    const base = yield* askBaseCommon
    const frontend = yield* askFrontendCommon
    const router = yield* ask(askReactRouter)
    const stateManagement = yield* ask(askReactStateManagement)
    return {
      ...base,
      ...frontend,
      type: 'react',
      router,
      stateManagement,
    }
  }

  if (projectType === 'workspace-root') {
    const base = yield* askBaseCommon
    return {
      ...base,
      type: 'workspace-root',
      packageManager: PnpmPackageManager.name,
    }
  }

  if (projectType === 'node') {
    const base = yield* askNodeRuntimeBaseCommon
    return {
      ...base,
      type: 'node',
    }
  }

  if (projectType === 'cli') {
    const base = yield* askNodeRuntimeBaseCommon
    return {
      ...base,
      type: 'cli',
    }
  }

  return assertNever(projectType)
})

const createPreset = Effect.gen(function* () {
  const cli = yield* CliContext
  const preset = cli.args.preset ?? (yield* ask(askPreset))
  const name = yield* askProjectNameSafe
  const git = cli.args.git ?? true
  const workspaceBootstrap = getWorkspaceBootstrapPresetDefaults(git)

  switch (preset) {
    case 'react-minimal': {
      const frontend = getSharedFrontendPresetDefaults('react-minimal')
      return {
        name,
        type: 'react',
        language: 'typescript',
        git: cli.args.git ?? false,
        linting: 'none',
        codeQuality: [],
        ...frontend,
        router: 'none',
        stateManagement: 'none',
      }
    }
    case 'react-full': {
      const frontend = getSharedFrontendPresetDefaults('react-full')
      return {
        name,
        type: 'react',
        language: 'typescript',
        git,
        ...workspaceBootstrap,
        ...frontend,
        router: 'react-router',
        stateManagement: 'jotai',
      }
    }
    case 'vue-minimal': {
      const frontend = getSharedFrontendPresetDefaults('vue-minimal')
      return {
        name,
        type: 'vue',
        language: 'typescript',
        git: cli.args.git ?? false,
        linting: 'none',
        codeQuality: [],
        ...frontend,
        router: false,
        stateManagement: false,
      }
    }
    case 'vue-full': {
      const frontend = getSharedFrontendPresetDefaults('vue-full')
      return {
        name,
        type: 'vue',
        language: 'typescript',
        git,
        ...workspaceBootstrap,
        ...frontend,
        router: true,
        stateManagement: true,
      }
    }
    case 'workspace-root':
      return {
        name,
        type: 'workspace-root',
        language: 'typescript',
        git,
        ...workspaceBootstrap,
        packageManager: PnpmPackageManager.name,
      }
    case 'node-minimal': {
      return {
        name,
        type: 'node',
        language: 'typescript',
        git: cli.args.git ?? false,
        linting: 'none',
        codeQuality: [],
      }
    }
    case 'cli-minimal': {
      return {
        name,
        type: 'cli',
        language: 'typescript',
        git: cli.args.git ?? false,
        linting: 'none',
        codeQuality: [],
      }
    }
    default:
      return assertNever(preset)
  }
})

export const collectQuestions = Effect.gen(function* () {
  const cli = yield* CliContext

  if (!cli.isInteractive) {
    return yield* createPreset.pipe(Effect.flatMap(decodeCollectedProjectConfig))
  }

  const createMode = yield* ask(askCreateMode)
  switch (createMode) {
    case 'create':
      return yield* createProject.pipe(Effect.flatMap(decodeCollectedProjectConfig))
    case 'preset':
      return yield* createPreset.pipe(Effect.flatMap(decodeCollectedProjectConfig))
    default:
      return assertNever(createMode)
  }
}).pipe(
  Effect.withSpan('questions.collect'),
  Effect.annotateLogs({ taskKind: 'questions.collect' }),
  Effect.annotateSpans({ taskKind: 'questions.collect' }),
)
