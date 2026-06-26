import type { CreateSpec } from '@/core/create'
import { readFileSync } from 'node:fs'
import { Effect, Schema } from 'effect'
import { PackageNameSchema } from '@/brand/package-name'
import { SchemaContractError } from '@/core/errors'
import { formatSchemaError, schemaIssueCount } from '@/schema/errors'

const CapabilityIdSchema = Schema.Literals([
  'minimal-node-package',
  'react-app',
  'react-counter',
  'vue-app',
  'effect-package',
  'node-backend',
  'library',
  'cli-tool',
  'router:react-router',
  'router:vue-router',
  'state:jotai',
  'state:pinia',
  'css:less',
  'css:tailwind',
])

const CanonicalPackageSchema = Schema.Struct({
  id: Schema.String,
  name: PackageNameSchema,
  capabilities: Schema.Array(CapabilityIdSchema),
})

const InternalDependencySchema = Schema.Struct({
  target: Schema.Struct({
    by: Schema.Literals(['id', 'name']),
    value: Schema.String,
  }),
  alias: Schema.optionalKey(PackageNameSchema),
})

const CanonicalSinglePackageCreateSpecSchema = Schema.Struct({
  topology: Schema.Literal('single-package'),
  package: CanonicalPackageSchema,
  rootCapabilities: Schema.Array(Schema.String),
  providers: Schema.Array(Schema.String),
  overrides: Schema.Record(Schema.String, Schema.Never),
})

const CanonicalWorkspacePackageSchema = Schema.Struct({
  id: Schema.String,
  name: PackageNameSchema,
  capabilities: Schema.Array(CapabilityIdSchema),
  internalDependencies: Schema.Array(InternalDependencySchema),
})

const CanonicalWorkspaceCreateSpecSchema = Schema.Struct({
  topology: Schema.Literal('workspace'),
  packages: Schema.Array(CanonicalWorkspacePackageSchema),
  rootCapabilities: Schema.Array(Schema.String),
  providers: Schema.Array(Schema.String),
  overrides: Schema.Record(Schema.String, Schema.Never),
})

const CanonicalCreateSpecSchema = Schema.Union([
  CanonicalSinglePackageCreateSpecSchema,
  CanonicalWorkspaceCreateSpecSchema,
]).annotate({
  identifier: 'CanonicalCreateSpec',
  title: 'CanonicalCreateSpec',
})

const decodeCanonicalCreateSpec = Schema.decodeUnknownEffect(CanonicalCreateSpecSchema, { errors: 'all' })

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
      Effect.try({
        try: () => JSON.parse(content) as unknown,
        catch: error => new SchemaContractError({
          schema: 'CreateSpec',
          message: `CreateSpec: failed to parse --spec input: ${formatUnknownError(error)}`,
          issueCount: 1,
        }),
      }),
    ),
  )
}

export function loadCreateSpecFromInput(input: string): Effect.Effect<CreateSpec, SchemaContractError> {
  return parseSpecInput(input).pipe(
    Effect.flatMap(spec =>
      decodeCanonicalCreateSpec(spec).pipe(
        Effect.map(spec => spec as CreateSpec),
        Effect.mapError(error => new SchemaContractError({
          schema: 'CreateSpec',
          message: `CreateSpec: ${formatSchemaError(error)}`,
          issueCount: schemaIssueCount(error),
        })),
      ),
    ),
  )
}

export function formatCanonicalCreateSpecJson(spec: CreateSpec) {
  return `${JSON.stringify(spec, null, 2)}\n`
}
