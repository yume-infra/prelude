import type { ParseError } from 'jsonc-parser'
import type { PreludeError } from './errors.js'
import { BarePackageExportSchema, PackageRootSchema, StableIdSchema } from '@sayoriqwq/prelude-contract'

import { Effect, FileSystem, Schema } from 'effect'
import { parse, printParseErrorCode } from 'jsonc-parser'
import { errorMessage, preludeError } from './errors.js'

const CONFIG_FILE_NAME = 'prelude.config.jsonc'
const CONFIG_SCHEMA_VERSION = 1

const IntegrationConfigSchema = Schema.Struct({
  id: StableIdSchema,
  module: BarePackageExportSchema,
  packageRoot: PackageRootSchema,
})

export type IntegrationConfig = Schema.Schema.Type<typeof IntegrationConfigSchema>

const hasUniqueIntegrationIds = Schema.makeFilter<{
  readonly integrations: ReadonlyArray<{ readonly id: string }>
}>(
  config => new Set(config.integrations.map(integration => integration.id)).size === config.integrations.length,
  { expected: 'unique Integration ids' },
)

const PreludeConfigSchema = Schema.Struct({
  schemaVersion: Schema.Literal(CONFIG_SCHEMA_VERSION),
  integrations: Schema.Array(IntegrationConfigSchema),
}).pipe(
  Schema.check(hasUniqueIntegrationIds),
)

export type PreludeConfig = Schema.Schema.Type<typeof PreludeConfigSchema>

const decodePreludeConfig = Schema.decodeUnknownEffect(PreludeConfigSchema, {
  errors: 'all',
  onExcessProperty: 'error',
})

function formatParseErrors(errors: ReadonlyArray<ParseError>): string {
  return errors
    .map(error => `${printParseErrorCode(error.error)} at offset ${error.offset}`)
    .join(', ')
}

export function loadPreludeConfig(controlRoot: string): Effect.Effect<PreludeConfig, PreludeError, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const configPath = `${controlRoot}/${CONFIG_FILE_NAME}`
    const source = yield* fs.readFileString(configPath).pipe(
      Effect.mapError(error => preludeError('config', `Cannot read ${CONFIG_FILE_NAME}`, errorMessage(error))),
    )
    const errors: Array<ParseError> = []
    const value: unknown = parse(source, errors, { allowTrailingComma: true, disallowComments: false })

    if (errors.length > 0)
      return yield* Effect.fail(preludeError('config', `Invalid ${CONFIG_FILE_NAME}`, formatParseErrors(errors)))

    return yield* decodePreludeConfig(value).pipe(
      Effect.mapError(error => preludeError('config', `Invalid ${CONFIG_FILE_NAME}`, errorMessage(error))),
    )
  })
}
