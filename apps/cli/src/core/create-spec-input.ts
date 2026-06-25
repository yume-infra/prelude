import type { CreateSpec } from '@/core/create'
import { readFileSync } from 'node:fs'
import { Effect, ParseResult, Schema } from 'effect'
import { PackageNameSchema } from '@/brand/package-name'
import { SchemaContractError } from '@/core/errors'

const CapabilityIdSchema = Schema.Literal(
  'minimal-node-package',
  'react-app',
  'react-counter',
  'effect-package',
)

const CanonicalCreateSpecSchema = Schema.Struct({
  topology: Schema.Literal('single-package', 'workspace'),
  package: Schema.Struct({
    id: Schema.String,
    name: PackageNameSchema,
    capabilities: Schema.Array(CapabilityIdSchema),
  }),
  rootCapabilities: Schema.Array(Schema.String),
  providers: Schema.Array(Schema.String),
  overrides: Schema.Record({ key: Schema.String, value: Schema.Never }),
}).annotations({
  identifier: 'CanonicalCreateSpec',
  title: 'CanonicalCreateSpec',
})

const decodeJsonSpecInput = Schema.decodeUnknown(Schema.parseJson(Schema.Unknown), { errors: 'all' })
const decodeCanonicalCreateSpec = Schema.decodeUnknown(CanonicalCreateSpecSchema, { errors: 'all' })

function formatUnknownError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isInlineJsonSpecInput(input: string) {
  return input.trimStart().startsWith('{')
}

function readSpecInput(input: string) {
  return isInlineJsonSpecInput(input) ? input : readFileSync(input, 'utf8')
}

function parseSpecInput(input: string) {
  return Effect.try({
    try: () => readSpecInput(input),
    catch: error => new SchemaContractError({
      schema: 'CreateSpec',
      message: `CreateSpec: failed to read --spec input: ${formatUnknownError(error)}`,
      issueCount: 1,
    }),
  }).pipe(
    Effect.flatMap(content =>
      decodeJsonSpecInput(content).pipe(
        Effect.mapError(error => new SchemaContractError({
          schema: 'CreateSpec',
          message: `CreateSpec: failed to parse --spec input: ${ParseResult.TreeFormatter.formatErrorSync(error)}`,
          issueCount: ParseResult.ArrayFormatter.formatErrorSync(error).length,
        })),
      ),
    ),
  )
}

export function loadCreateSpecFromInput(input: string): Effect.Effect<CreateSpec, SchemaContractError> {
  return parseSpecInput(input).pipe(
    Effect.flatMap(spec =>
      decodeCanonicalCreateSpec(spec).pipe(
        Effect.mapError(error => new SchemaContractError({
          schema: 'CreateSpec',
          message: `CreateSpec: ${ParseResult.TreeFormatter.formatErrorSync(error)}`,
          issueCount: ParseResult.ArrayFormatter.formatErrorSync(error).length,
        })),
      ),
    ),
  )
}

export function formatCanonicalCreateSpecJson(spec: CreateSpec) {
  return `${JSON.stringify(spec, null, 2)}\n`
}
