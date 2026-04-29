import type { StandardCommand } from '@effect/platform/Command'
import type { ContributionTrace } from '@/core/ownership/model'
import type { PostGenerateCommandPhaseSpec, PostGenerateCommandSpec } from '@/schema/plan-spec'
import type { ProjectConfig } from '@/schema/project-config'
import { Effect } from 'effect'
import { makeCommandName } from '@/brand/command-name'
import {
  contributionTrace,
  ContributionUnitKind,
  WorkspaceBootstrapOwner,
} from '@/core/ownership/model'
import {
  getWorkspaceBootstrapCommandSpecs,
  getWorkspaceBootstrapPostGenerateFileActions,
  resolveWorkspaceBootstrapInstallPolicy,
} from '@/core/workspace-bootstrap'
import { ask } from '../adapters/prompts'
import { CliContext } from '../cli-context'
import { askInstallDeps } from '../questions/common/install-deps'
import { CommandService } from '../services/command'

const PostGenerateCommandPhase = {
  AfterPlanApply: 'after-plan-apply',
} as const

export interface PostGenerateCommand {
  readonly command: StandardCommand
  readonly phase: PostGenerateCommandPhaseSpec
  readonly ownership: ContributionTrace
}

const postGenerateCommandOwnership = contributionTrace(
  WorkspaceBootstrapOwner,
  ContributionUnitKind.PostGenerateCommand,
)

function traceCommand(command: StandardCommand): PostGenerateCommand {
  return {
    command,
    phase: PostGenerateCommandPhase.AfterPlanApply,
    ownership: postGenerateCommandOwnership,
  }
}

export function toPostGenerateCommandSpec(command: PostGenerateCommand): PostGenerateCommandSpec {
  return {
    command: command.command.command,
    args: [...command.command.args],
    phase: command.phase,
    ownership: command.ownership,
  }
}

export function buildCommands(config: ProjectConfig) {
  return Effect.gen(function* () {
    const cli = yield* CliContext
    const commandSvc = yield* CommandService
    const installPolicy = resolveWorkspaceBootstrapInstallPolicy({
      cliInstallArg: cli.args.install,
      isInteractive: cli.isInteractive,
    })
    const installDeps = installPolicy === 'prompt'
      ? (yield* ask(askInstallDeps))
      : installPolicy

    return getWorkspaceBootstrapCommandSpecs(config, installDeps)
      .map(spec => traceCommand(commandSvc.make(makeCommandName(spec.command), ...spec.args)))
  })
}

export function buildPostGenerateFileActions(config: ProjectConfig) {
  return Effect.succeed(getWorkspaceBootstrapPostGenerateFileActions(config))
}
