import type { TargetDir } from '@/brand/target-dir'
import type { CliArgs } from '@/core/cli-context'
import { Effect, Option } from 'effect'
import { Command, Flag } from 'effect/unstable/cli'
import { decodeProjectName, formatProjectNameError } from '@/brand/project-name'
import { CliContextLive } from '@/core/cli-context'
import { runCreateRoute } from '@/core/create-route'
import { SchemaContractError } from '@/core/errors'
import { schemaIssueCount } from '@/schema/errors'

export interface PreludeCommandOptions {
  readonly preludeVersion: string
  readonly targetDir?: TargetDir
  readonly stdinIsTTY: boolean
}

const specFlag = Flag.string('spec').pipe(
  Flag.optional,
  Flag.withMetavar('<file-or-json>'),
  Flag.withDescription('Complete canonical CreateSpec file path or inline JSON payload'),
)

const nameFlag = Flag.string('name').pipe(
  Flag.optional,
  Flag.withMetavar('<project>'),
  Flag.withDescription('Target directory name for create'),
)

const presetFlag = Flag.string('preset').pipe(
  Flag.optional,
  Flag.withAlias('p'),
  Flag.withDescription('Removed; reusable shapes are complete CreateSpec files passed with --spec'),
)

function optionalRemovedBooleanFlag(name: string, description: string) {
  return Flag.boolean(name).pipe(
    Flag.optional,
    Flag.withDescription(description),
  )
}

const yesFlag = Flag.boolean('yes').pipe(
  Flag.optional,
  Flag.withAlias('y'),
  Flag.withDescription('Removed; use --spec with a complete canonical CreateSpec for non-interactive creation'),
)

const preludeCommandConfig = {
  spec: specFlag,
  name: nameFlag,
  preset: presetFlag,
  install: optionalRemovedBooleanFlag('install', 'Removed; dependency installation is outside create'),
  git: optionalRemovedBooleanFlag('git', 'Removed; git setup is outside create'),
  rollback: optionalRemovedBooleanFlag('rollback', 'Removed; create uses the canonical write boundary'),
  yes: yesFlag,
  noInput: Flag.boolean('no-input').pipe(
    Flag.withDefault(false),
    Flag.withDescription('Disable prompts; requires --spec'),
  ),
  printSpec: Flag.boolean('print-spec').pipe(
    Flag.withDefault(false),
    Flag.withDescription('Print the canonical CreateSpec and exit before generation'),
  ),
  dryRun: Flag.boolean('dry-run').pipe(
    Flag.withDefault(false),
    Flag.withDescription('Print WritePlan operations and blockers without writing files'),
  ),
}

type PreludeCommandInput = Command.Command.Config.Infer<typeof preludeCommandConfig>
type MutableCliArgs = {
  -readonly [Key in keyof CliArgs]: CliArgs[Key]
}

function removedFlagError(flag: string, message: string) {
  return new SchemaContractError({
    schema: 'CliArgs',
    message: `CliArgs: ${flag} has been removed. ${message}`,
    issueCount: 1,
  })
}

const decodeCliProjectName = Effect.fn('decodeCliProjectName')(
  function* (input: string) {
    return yield* decodeProjectName(input).pipe(
      Effect.mapError(error => new SchemaContractError({
        schema: 'CliArgs',
        message: `CliArgs: ${formatProjectNameError(error)}`,
        issueCount: schemaIssueCount(error),
      })),
    )
  },
)

function optionValue<A>(value: Option.Option<A>) {
  return Option.isSome(value) ? value.value : undefined
}

const cliArgsFromCommandInput = Effect.fn('cliArgsFromCommandInput')(
  function* (input: PreludeCommandInput): Effect.fn.Return<CliArgs, SchemaContractError> {
    if (Option.isSome(input.preset)) {
      return yield* removedFlagError('--preset', 'Reusable shapes are complete canonical CreateSpec files passed with --spec.')
    }

    if (Option.isSome(input.install)) {
      return yield* removedFlagError('--install/--no-install', 'Dependency installation is not part of the canonical create route.')
    }

    if (Option.isSome(input.git)) {
      return yield* removedFlagError('--git/--no-git', 'Git setup is not part of the canonical create route.')
    }

    if (Option.isSome(input.rollback)) {
      return yield* removedFlagError('--rollback/--no-rollback', 'Creation now goes through the canonical write boundary.')
    }

    if (Option.isSome(input.yes)) {
      return yield* removedFlagError('--yes/-y', 'Use --spec with a complete canonical CreateSpec for non-interactive creation.')
    }

    const args: MutableCliArgs = {}

    const spec = optionValue(input.spec)
    if (spec !== undefined) {
      args.spec = spec
    }

    const name = optionValue(input.name)
    if (name !== undefined) {
      args.name = yield* decodeCliProjectName(name)
    }

    if (input.noInput) {
      args.noInput = true
    }

    if (input.dryRun) {
      args.dryRun = true
    }

    if (input.printSpec) {
      args.printSpec = true
    }

    return args
  },
)

function handlePreludeCommand(options: PreludeCommandOptions) {
  return Effect.fn('handlePreludeCommand')(
    function* (input: PreludeCommandInput) {
      const args = yield* cliArgsFromCommandInput(input)
      const isInteractive = options.stdinIsTTY && !args.noInput && args.spec === undefined
      const routeOptions = options.targetDir === undefined
        ? { preludeVersion: options.preludeVersion, preferWorkbench: isInteractive }
        : { preludeVersion: options.preludeVersion, targetDir: options.targetDir, preferWorkbench: isInteractive }

      yield* runCreateRoute(routeOptions).pipe(
        Effect.provide(CliContextLive({ args, isInteractive })),
      )
    },
  )
}

export function makePreludeCommand(options: PreludeCommandOptions) {
  return Command.make(
    'prelude',
    preludeCommandConfig,
    handlePreludeCommand(options),
  ).pipe(
    Command.withDescription('Create an agent-ready project workspace from a canonical CreateSpec'),
    Command.withExamples([
      {
        command: 'prelude --spec prelude.json --name my-project --no-input',
        description: 'Create from a canonical CreateSpec file',
      },
      {
        command: 'prelude --spec prelude.json --dry-run',
        description: 'Print WritePlan operations and blockers without writing files',
      },
      {
        command: 'prelude --spec prelude.json --print-spec',
        description: 'Print the canonical CreateSpec and exit before generation',
      },
    ]),
  )
}

export function formatPreludeCommandError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function shouldPrintPreludeCommandHelp(error: unknown) {
  return !(error instanceof SchemaContractError && error.schema === 'CreateWorkbench')
}

export const printPreludeCommandHelp = Effect.fn('printPreludeCommandHelp')(
  function* (options: PreludeCommandOptions) {
    yield* Command.runWith(
      makePreludeCommand(options),
      { version: options.preludeVersion },
    )(['--help'])
  },
)

export const runPreludeCommand = Effect.fn('runPreludeCommand')(
  function* (options: PreludeCommandOptions) {
    yield* makePreludeCommand(options).pipe(
      Command.run({ version: options.preludeVersion }),
    )
  },
)
