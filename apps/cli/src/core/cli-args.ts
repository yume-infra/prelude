import type { CliArgs } from '@/schema/cli-args'
import { Effect, ParseResult } from 'effect'
import mri from 'mri'
import { SchemaContractError } from '@/core/errors'
import { decodeCliArgs, formatCliArgsError } from '@/schema/cli-args'

export interface RawCliArgs {
  readonly _: string[]
  readonly preset?: string | string[]
  readonly spec?: string | string[]
  readonly name?: string | string[]
  readonly install?: boolean
  readonly git?: boolean
  readonly help?: boolean
  readonly version?: boolean
  readonly rollback?: boolean
  readonly dryRun?: boolean
  readonly noInput?: boolean
  readonly printSpec?: boolean
}

type MutableRawCliArgs = {
  -readonly [Key in keyof RawCliArgs]: RawCliArgs[Key]
}

function hasRemovedYesArg(argv: string[]) {
  return argv.some(arg => arg === '-y' || arg === '--y' || arg === '--yes' || arg.startsWith('--yes='))
}

function hasNoInputArg(argv: string[]) {
  return argv.some(arg => arg === '--no-input' || arg.startsWith('--no-input='))
}

function removedFlagError(flag: string, message: string) {
  return new SchemaContractError({
    schema: 'CliArgs',
    message: `CliArgs: ${flag} has been removed. ${message}`,
    issueCount: 1,
  })
}

export function parseRawCliArgs(argv: string[]): RawCliArgs {
  const parsed = mri(argv, {
    alias: {
      'h': 'help',
      'p': 'preset',
      'v': 'version',
      'dry-run': 'dryRun',
      'print-spec': 'printSpec',
    },
    boolean: ['install', 'git', 'help', 'version', 'rollback', 'dry-run', 'dryRun', 'print-spec', 'printSpec'],
  })

  const rawArgs: MutableRawCliArgs = { _: parsed._ }

  if (parsed.preset !== undefined)
    rawArgs.preset = parsed.preset
  if (parsed.spec !== undefined)
    rawArgs.spec = parsed.spec
  if (parsed.name !== undefined)
    rawArgs.name = parsed.name
  if (parsed.install !== undefined)
    rawArgs.install = parsed.install
  if (parsed.git !== undefined)
    rawArgs.git = parsed.git
  if (parsed.help !== undefined)
    rawArgs.help = parsed.help
  if (parsed.version !== undefined)
    rawArgs.version = parsed.version
  if (parsed.rollback !== undefined)
    rawArgs.rollback = parsed.rollback
  if (parsed.dryRun !== undefined)
    rawArgs.dryRun = parsed.dryRun
  if (hasNoInputArg(argv))
    rawArgs.noInput = true
  if (parsed.printSpec !== undefined)
    rawArgs.printSpec = parsed.printSpec

  return rawArgs
}

function validateCliArgs(args: CliArgs) {
  if (args.preset !== undefined) {
    return Effect.fail(removedFlagError('--preset', 'Reusable shapes are complete canonical CreateSpec files passed with --spec.'))
  }

  if (args.dryRun !== undefined) {
    return Effect.fail(removedFlagError('--dry-run', 'Use --print-spec to inspect canonical CreateSpec input.'))
  }

  if (args.install !== undefined) {
    return Effect.fail(removedFlagError('--install/--no-install', 'Dependency installation is not part of the canonical create route.'))
  }

  if (args.git !== undefined) {
    return Effect.fail(removedFlagError('--git/--no-git', 'Git setup is not part of the canonical create route.'))
  }

  if (args.rollback !== undefined) {
    return Effect.fail(removedFlagError('--rollback/--no-rollback', 'Creation now goes through the canonical write boundary.'))
  }

  return Effect.succeed(args)
}

export function parseCliArgs(argv: string[]) {
  if (hasRemovedYesArg(argv)) {
    return Effect.fail(new SchemaContractError({
      schema: 'CliArgs',
      message: 'CliArgs: --yes/-y has been removed. Use --spec with a complete canonical CreateSpec for non-interactive creation.',
      issueCount: 1,
    }))
  }

  const rawArgs = parseRawCliArgs(argv)

  if (rawArgs.preset !== undefined) {
    return Effect.fail(removedFlagError('--preset', 'Reusable shapes are complete canonical CreateSpec files passed with --spec.'))
  }

  if (rawArgs.dryRun !== undefined) {
    return Effect.fail(removedFlagError('--dry-run', 'Use --print-spec to inspect canonical CreateSpec input.'))
  }

  if (rawArgs.install !== undefined) {
    return Effect.fail(removedFlagError('--install/--no-install', 'Dependency installation is not part of the canonical create route.'))
  }

  if (rawArgs.git !== undefined) {
    return Effect.fail(removedFlagError('--git/--no-git', 'Git setup is not part of the canonical create route.'))
  }

  if (rawArgs.rollback !== undefined) {
    return Effect.fail(removedFlagError('--rollback/--no-rollback', 'Creation now goes through the canonical write boundary.'))
  }

  return decodeCliArgs(rawArgs).pipe(
    Effect.mapError(error => new SchemaContractError({
      schema: 'CliArgs',
      message: formatCliArgsError(error),
      issueCount: ParseResult.ArrayFormatter.formatErrorSync(error).length,
    })),
    Effect.flatMap(validateCliArgs),
  )
}
