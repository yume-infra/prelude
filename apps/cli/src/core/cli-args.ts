import { Effect, ParseResult } from 'effect'
import mri from 'mri'
import { SchemaContractError } from '@/core/errors'
import { decodeCliArgs, formatCliArgsError } from '@/schema/cli-args'

export interface RawCliArgs {
  readonly _: string[]
  readonly preset?: string | string[]
  readonly name?: string | string[]
  readonly install?: boolean
  readonly git?: boolean
  readonly help?: boolean
  readonly version?: boolean
  readonly rollback?: boolean
  readonly dryRun?: boolean
}

type MutableRawCliArgs = {
  -readonly [Key in keyof RawCliArgs]: RawCliArgs[Key]
}

function hasRemovedYesArg(argv: string[]) {
  return argv.some(arg => arg === '-y' || arg === '--y' || arg === '--yes' || arg.startsWith('--yes='))
}

export function parseRawCliArgs(argv: string[]): RawCliArgs {
  const parsed = mri(argv, {
    alias: {
      'h': 'help',
      'p': 'preset',
      'v': 'version',
      'dry-run': 'dryRun',
    },
    boolean: ['install', 'git', 'help', 'version', 'rollback', 'dry-run', 'dryRun'],
    default: {
      rollback: true,
    },
  })

  const rawArgs: MutableRawCliArgs = { _: parsed._ }

  if (parsed.preset !== undefined)
    rawArgs.preset = parsed.preset
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

  return rawArgs
}

export function parseCliArgs(argv: string[]) {
  if (hasRemovedYesArg(argv)) {
    return Effect.fail(new SchemaContractError({
      schema: 'CliArgs',
      message: 'CliArgs: --yes/-y has been removed. Use --preset or --p to choose an explicit preset combination.',
      issueCount: 1,
    }))
  }

  return decodeCliArgs(parseRawCliArgs(argv)).pipe(
    Effect.mapError(error => new SchemaContractError({
      schema: 'CliArgs',
      message: formatCliArgsError(error),
      issueCount: ParseResult.ArrayFormatter.formatErrorSync(error).length,
    })),
  )
}
