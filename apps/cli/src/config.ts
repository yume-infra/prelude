import type { ParseError } from 'jsonc-parser'
import type { PreludeError } from './errors.js'
import { BarePackageExportSchema, PackageRootSchema, StableIdSchema } from '@sayoriqwq/prelude-contract'

import { Effect, FileSystem, Path, Schema } from 'effect'
import { parse, printParseErrorCode } from 'jsonc-parser'
import { errorMessage, preludeError } from './errors.js'
import { assertNoSymlinkSegments } from './filesystem.js'

const CONFIG_RELATIVE_PATH = '.prelude/config.jsonc'
const CONFIG_SCHEMA_VERSION = 2

export function encodeIntegrationId(integrationId: string): string {
  return encodeURIComponent(integrationId)
}

export function integrationWorkspaceRelativePath(integrationId: string): string {
  return `.prelude/${encodeIntegrationId(integrationId)}`
}

const IntegrationConfigSchema = Schema.Struct({
  id: StableIdSchema,
  module: BarePackageExportSchema,
  packageRoots: Schema.NonEmptyArray(PackageRootSchema).pipe(
    Schema.check(
      Schema.isMaxLength(64),
      Schema.makeFilter(
        roots => new Set(roots).size === roots.length,
        { expected: 'unique Package Roots' },
      ),
    ),
  ),
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

export function discoverControlRoot(start: string): Effect.Effect<string, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    let current = yield* fs.realPath(start).pipe(
      Effect.mapError(error => preludeError('config', 'Cannot resolve Prelude start directory', errorMessage(error))),
    )

    while (true) {
      const candidate = path.join(current, CONFIG_RELATIVE_PATH)
      if (yield* fs.exists(candidate).pipe(
        Effect.mapError(error => preludeError('config', 'Cannot inspect Prelude Configuration candidate', errorMessage(error))),
      )) {
        yield* assertNoSymlinkSegments(current, candidate, 'config')
        return current
      }

      const parent = path.dirname(current)
      if (parent === current)
        return yield* preludeError('config', `Cannot find nearest ${CONFIG_RELATIVE_PATH}`, start)
      current = parent
    }
  })
}

export function loadPreludeConfig(controlRoot: string): Effect.Effect<PreludeConfig, PreludeError, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const configPath = path.join(controlRoot, CONFIG_RELATIVE_PATH)
    yield* assertNoSymlinkSegments(controlRoot, configPath, 'config')
    const source = yield* fs.readFileString(configPath).pipe(
      Effect.mapError(error => preludeError('config', `Cannot read ${CONFIG_RELATIVE_PATH}`, errorMessage(error))),
    )
    const errors: Array<ParseError> = []
    const value: unknown = parse(source, errors, { allowTrailingComma: true, disallowComments: false })

    if (errors.length > 0)
      return yield* preludeError('config', `Invalid ${CONFIG_RELATIVE_PATH}`, formatParseErrors(errors))

    const decoded = yield* decodePreludeConfig(value).pipe(
      Effect.mapError(error => preludeError('config', `Invalid ${CONFIG_RELATIVE_PATH}`, errorMessage(error))),
    )
    return {
      ...decoded,
      integrations: decoded.integrations.map((integration) => {
        const sorted = [...integration.packageRoots].sort()
        return { ...integration, packageRoots: [sorted[0]!, ...sorted.slice(1)] }
      }),
    }
  })
}
