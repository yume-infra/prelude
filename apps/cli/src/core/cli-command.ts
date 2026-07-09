import type { TargetDir } from '@/brand/target-dir'
import type { CliArgs } from '@/core/cli-context'
import type { ProviderTransitionStep } from '@/core/lifecycle'
import process from 'node:process'
import { Console, Effect, Option, Schema } from 'effect'
import { Command, Flag } from 'effect/unstable/cli'
import { decodeProjectName, formatProjectNameError } from '@/brand/project-name'
import { makeTargetDir } from '@/brand/target-dir'
import { CliContext } from '@/core/cli-context'
import { runCreateRoute } from '@/core/create-route'
import { SchemaContractError } from '@/core/errors'
import { effectHarnessLifecycleProvider, runProviderLifecycleAdopt, runProviderLifecycleStatus, runProviderLifecycleTransition, runProviderLifecycleUpdate, runProviderLifecycleVerify } from '@/core/lifecycle'
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

const preludeCommandConfig = {
  spec: specFlag,
  name: nameFlag,
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

const lifecycleCommandConfig = {
  provider: Flag.string('provider').pipe(
    Flag.optional,
    Flag.withDescription('Limit the command to one maintain provider id'),
  ),
  target: Flag.string('target').pipe(
    Flag.optional,
    Flag.withDescription('Target project directory; defaults to the current working directory'),
  ),
}

const adoptionCommandConfig = {
  ...lifecycleCommandConfig,
  dryRun: Flag.boolean('dry-run').pipe(
    Flag.withDefault(false),
    Flag.withDescription('Print adoption plan without writing files'),
  ),
}

const transitionCommandConfig = {
  ...lifecycleCommandConfig,
  plan: Flag.string('plan').pipe(
    Flag.withMetavar('<json>'),
    Flag.withDescription('JSON transition steps to approve'),
  ),
  dryRun: Flag.boolean('dry-run').pipe(
    Flag.withDefault(false),
    Flag.withDescription('Validate the transition without writing files'),
  ),
}

const lifecycleProviders = {
  'effect-harness': effectHarnessLifecycleProvider,
}

const decodeJsonString = Schema.decodeUnknownSync(Schema.UnknownFromJsonString)

type PreludeCommandInput = Command.Command.Config.Infer<typeof preludeCommandConfig>
type LifecycleCommandInput = Command.Command.Config.Infer<typeof lifecycleCommandConfig>
type AdoptionCommandInput = Command.Command.Config.Infer<typeof adoptionCommandConfig>
type TransitionCommandInput = Command.Command.Config.Infer<typeof transitionCommandConfig>
type MutableCliArgs = {
  -readonly [Key in keyof CliArgs]: CliArgs[Key]
}

const decodeCliProjectName = Effect.fn('decodeCliProjectName')(
  function* (input: string) {
    return yield* decodeProjectName(input).pipe(
      Effect.mapError(error => SchemaContractError.make({
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

function lifecycleTargetDir(options: PreludeCommandOptions, input: LifecycleCommandInput): TargetDir {
  return makeTargetDir(optionValue(input.target) ?? options.targetDir ?? process.cwd())
}

function lifecycleProvider(input: LifecycleCommandInput) {
  return optionValue(input.provider)
}

function lifecycleCommandOptions(options: PreludeCommandOptions, input: LifecycleCommandInput) {
  const provider = lifecycleProvider(input)

  return {
    targetDir: lifecycleTargetDir(options, input),
    providers: lifecycleProviders,
    ...(provider === undefined ? {} : { provider }),
  }
}

function adoptionCommandOptions(options: PreludeCommandOptions, input: AdoptionCommandInput) {
  const provider = lifecycleProvider(input)

  return {
    targetDir: lifecycleTargetDir(options, input),
    preludeVersion: options.preludeVersion,
    providers: lifecycleProviders,
    dryRun: input.dryRun,
    ...(provider === undefined ? {} : { provider }),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function decodeTransitionStep(value: unknown, index: number): ProviderTransitionStep {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    throw new TypeError(`transition step ${index} must declare a kind`)
  }

  if (value.kind === 'add' || value.kind === 'retire' || value.kind === 'detach') {
    if (typeof value.surfaceId !== 'string') {
      throw new TypeError(`transition step ${index} must declare surfaceId`)
    }

    return {
      kind: value.kind,
      surfaceId: value.surfaceId,
    }
  }

  if (value.kind === 'ownership-transfer') {
    if (typeof value.fromSurfaceId !== 'string' || typeof value.toSurfaceId !== 'string') {
      throw new TypeError(`transition step ${index} must declare fromSurfaceId and toSurfaceId`)
    }

    return {
      kind: 'ownership-transfer',
      fromSurfaceId: value.fromSurfaceId,
      toSurfaceId: value.toSurfaceId,
    }
  }

  throw new TypeError(`unsupported transition step kind ${value.kind}`)
}

function decodeTransitionPlan(payload: string): Effect.Effect<readonly ProviderTransitionStep[], SchemaContractError> {
  return Effect.try({
    try: () => {
      const parsed = decodeJsonString(payload)
      const steps = Array.isArray(parsed)
        ? parsed
        : isRecord(parsed) && Array.isArray(parsed.transitions)
          ? parsed.transitions
          : undefined

      if (steps === undefined) {
        throw new TypeError('transition plan must be a JSON array or an object with transitions')
      }

      return steps.map(decodeTransitionStep)
    },
    catch: error => SchemaContractError.make({
      schema: 'LifecycleTransition',
      message: `LifecycleTransition: ${error instanceof Error ? error.message : String(error)}`,
      issueCount: 1,
    }),
  })
}

function transitionCommandOptions(options: PreludeCommandOptions, input: TransitionCommandInput) {
  const provider = lifecycleProvider(input)

  return decodeTransitionPlan(input.plan).pipe(
    Effect.map(transitions => ({
      targetDir: lifecycleTargetDir(options, input),
      providers: lifecycleProviders,
      dryRun: input.dryRun,
      transitions,
      ...(provider === undefined ? {} : { provider }),
    })),
  )
}

function printJson(value: unknown) {
  return Console.log(JSON.stringify(value, null, 2))
}

const cliArgsFromCommandInput = Effect.fn('cliArgsFromCommandInput')(
  function* (input: PreludeCommandInput): Effect.fn.Return<CliArgs, SchemaContractError> {
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
      const isInteractive = options.stdinIsTTY === true && args.noInput !== true && args.spec === undefined
      const routeOptions = options.targetDir === undefined
        ? { preludeVersion: options.preludeVersion, preferWorkbench: isInteractive }
        : { preludeVersion: options.preludeVersion, targetDir: options.targetDir, preferWorkbench: isInteractive }

      yield* runCreateRoute(routeOptions).pipe(
        Effect.provideService(CliContext, CliContext.of({ args, isInteractive })),
      )
    },
  )
}

function makeLifecycleStatusCommand(options: PreludeCommandOptions) {
  return Command.make('status', lifecycleCommandConfig, input =>
    runProviderLifecycleStatus(lifecycleCommandOptions(options, input)).pipe(Effect.flatMap(printJson))).pipe(
    Command.withDescription('Read maintain provider status from the prelude manifest'),
    Command.withShortDescription('Read maintain provider status'),
  )
}

function makeLifecycleVerifyCommand(options: PreludeCommandOptions) {
  return Command.make('verify', lifecycleCommandConfig, input =>
    runProviderLifecycleVerify(lifecycleCommandOptions(options, input)).pipe(Effect.flatMap(printJson))).pipe(
    Command.withDescription('Verify maintain provider records and managed surfaces'),
    Command.withShortDescription('Verify maintain providers'),
  )
}

function makeLifecycleUpdateCommand(options: PreludeCommandOptions) {
  return Command.make('update', lifecycleCommandConfig, input =>
    runProviderLifecycleUpdate(lifecycleCommandOptions(options, input)).pipe(Effect.flatMap(printJson))).pipe(
    Command.withDescription('Update declared maintain provider surfaces after drift preflight'),
    Command.withShortDescription('Update maintain providers'),
  )
}

function makeLifecycleAdoptCommand(options: PreludeCommandOptions) {
  return Command.make('adopt', adoptionCommandConfig, input =>
    runProviderLifecycleAdopt(adoptionCommandOptions(options, input)).pipe(Effect.flatMap(printJson))).pipe(
    Command.withDescription('Adopt maintain provider surfaces into an existing target'),
    Command.withShortDescription('Adopt maintain provider surfaces'),
  )
}

function makeLifecycleTransitionCommand(options: PreludeCommandOptions) {
  return Command.make('transition', transitionCommandConfig, input =>
    transitionCommandOptions(options, input).pipe(
      Effect.flatMap(runProviderLifecycleTransition),
      Effect.flatMap(printJson),
    )).pipe(
    Command.withDescription('Approve explicit maintain provider surface transitions'),
    Command.withShortDescription('Approve maintain provider transitions'),
  )
}

export function makePreludeCommand(options: PreludeCommandOptions) {
  return Command.make(
    'prelude',
    preludeCommandConfig,
    handlePreludeCommand(options),
  ).pipe(
    Command.withSubcommands([
      makeLifecycleStatusCommand(options),
      makeLifecycleVerifyCommand(options),
      makeLifecycleUpdateCommand(options),
      makeLifecycleAdoptCommand(options),
      makeLifecycleTransitionCommand(options),
    ]),
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
      {
        command: 'prelude verify --provider effect-harness',
        description: 'Verify declared maintain provider surfaces for the current project',
      },
      {
        command: 'prelude adopt --provider effect-harness --dry-run',
        description: 'Preview effect-harness adoption for an existing project',
      },
      {
        command: 'prelude transition --provider effect-harness --plan \'[{ "kind": "add", "surfaceId": "..." }]\'',
        description: 'Approve an explicit provider surface transition',
      },
    ]),
  )
}

export function formatPreludeCommandError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function shouldPrintPreludeCommandHelp(error: unknown) {
  return !(Schema.is(SchemaContractError)(error) && error.schema === 'CreateWorkbench')
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
