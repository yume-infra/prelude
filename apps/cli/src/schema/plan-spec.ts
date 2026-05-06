import { Schema } from 'effect'
import { TemplatePathSchema } from '../brand/template-path'

const ContributionUnitKindSchema = Schema.Literal(
  'fragment-render',
  'partial-namespace',
  'json-text-mutation',
  'static-asset-copy',
  'post-generate-command',
  'post-generate-file',
).annotations({
  identifier: 'ContributionUnitKind',
  title: 'ContributionUnitKind',
})

const ContributionTraceSchema = Schema.Struct({
  owner: Schema.String,
  unit: ContributionUnitKindSchema,
}).annotations({
  identifier: 'ContributionTrace',
  title: 'ContributionTrace',
})

export type JsonLiteral
  = | string
    | number
    | boolean
    | null
    | readonly JsonLiteral[]
    | { readonly [key: string]: JsonLiteral }

const JsonLiteralSchema: Schema.Schema<JsonLiteral> = Schema.suspend((): Schema.Schema<JsonLiteral> =>
  Schema.Union(
    Schema.String,
    Schema.Number,
    Schema.Boolean,
    Schema.Null,
    Schema.Array(JsonLiteralSchema),
    Schema.Record({ key: Schema.String, value: JsonLiteralSchema }),
  ),
).annotations({
  identifier: 'JsonLiteral',
  title: 'JsonLiteral',
})

const PlanOperationSpecSchema = Schema.Struct({
  reducer: Schema.String,
  ownership: Schema.optionalWith(ContributionTraceSchema, { exact: true }),
  input: Schema.optionalWith(JsonLiteralSchema, { exact: true }),
}).annotations({
  identifier: 'PlanOperationSpec',
  title: 'PlanOperationSpec',
})

const RenderTaskSpecSchema = Schema.Struct({
  kind: Schema.Literal('render'),
  path: Schema.String,
  src: TemplatePathSchema,
  data: Schema.optionalWith(JsonLiteralSchema, { exact: true }),
  ownership: Schema.optionalWith(ContributionTraceSchema, { exact: true }),
}).annotations({
  identifier: 'RenderTaskSpec',
  title: 'RenderTaskSpec',
})

const CopyTaskSpecSchema = Schema.Struct({
  kind: Schema.Literal('copy'),
  path: Schema.String,
  src: TemplatePathSchema,
  ownership: Schema.optionalWith(ContributionTraceSchema, { exact: true }),
}).annotations({
  identifier: 'CopyTaskSpec',
  title: 'CopyTaskSpec',
})

const JsonTaskSpecSchema = Schema.Struct({
  kind: Schema.Literal('json'),
  path: Schema.String,
  ownership: Schema.optionalWith(ContributionTraceSchema, { exact: true }),
  readExisting: Schema.optionalWith(Schema.Boolean, { exact: true }),
  sortKeys: Schema.optionalWith(Schema.Boolean, { exact: true }),
  base: Schema.optionalWith(JsonLiteralSchema, { exact: true }),
  reducers: Schema.Array(PlanOperationSpecSchema),
  finalize: Schema.optionalWith(PlanOperationSpecSchema, { exact: true }),
}).annotations({
  identifier: 'JsonTaskSpec',
  title: 'JsonTaskSpec',
})

const TextTaskSpecSchema = Schema.Struct({
  kind: Schema.Literal('text'),
  path: Schema.String,
  ownership: Schema.optionalWith(ContributionTraceSchema, { exact: true }),
  readExisting: Schema.optionalWith(Schema.Boolean, { exact: true }),
  base: Schema.optionalWith(Schema.String, { exact: true }),
  transforms: Schema.Array(PlanOperationSpecSchema),
}).annotations({
  identifier: 'TextTaskSpec',
  title: 'TextTaskSpec',
})

const PostGenerateCommandPhaseSchema = Schema.Literal('after-plan-apply').annotations({
  identifier: 'PostGenerateCommandPhase',
  title: 'PostGenerateCommandPhase',
})

const PostGenerateCommandSpecSchema = Schema.Struct({
  command: Schema.String,
  args: Schema.Array(Schema.String),
  phase: PostGenerateCommandPhaseSchema,
  ownership: ContributionTraceSchema,
}).annotations({
  identifier: 'PostGenerateCommandSpec',
  title: 'PostGenerateCommandSpec',
})

const PostGenerateFileActionPhaseSchema = Schema.Literal('after-post-generate-commands').annotations({
  identifier: 'PostGenerateFileActionPhase',
  title: 'PostGenerateFileActionPhase',
})

const PostGenerateFileActionSpecSchema = Schema.Struct({
  kind: Schema.Literal('write-file'),
  path: Schema.String,
  content: Schema.String,
  phase: PostGenerateFileActionPhaseSchema,
  ownership: Schema.optionalWith(ContributionTraceSchema, { exact: true }),
  executable: Schema.optionalWith(Schema.Boolean, { exact: true }),
}).annotations({
  identifier: 'PostGenerateFileActionSpec',
  title: 'PostGenerateFileActionSpec',
})

const PlanTaskSpecSchema = Schema.Union(
  RenderTaskSpecSchema,
  CopyTaskSpecSchema,
  JsonTaskSpecSchema,
  TextTaskSpecSchema,
).annotations({
  identifier: 'PlanTaskSpec',
  title: 'PlanTaskSpec',
})

const PlanSpecSchema = Schema.Struct({
  tasks: Schema.Array(PlanTaskSpecSchema),
  postGenerateCommands: Schema.optionalWith(Schema.Array(PostGenerateCommandSpecSchema), { exact: true }),
  postGenerateFileActions: Schema.optionalWith(Schema.Array(PostGenerateFileActionSpecSchema), { exact: true }),
}).annotations({
  identifier: 'PlanSpec',
  title: 'PlanSpec',
})

export type PlanOperationSpec = Schema.Schema.Type<typeof PlanOperationSpecSchema>
export type ContributionTraceSpec = Schema.Schema.Type<typeof ContributionTraceSchema>
export type PostGenerateCommandPhaseSpec = Schema.Schema.Type<typeof PostGenerateCommandPhaseSchema>
export type PostGenerateCommandSpec = Schema.Schema.Type<typeof PostGenerateCommandSpecSchema>
export type PostGenerateFileActionPhaseSpec = Schema.Schema.Type<typeof PostGenerateFileActionPhaseSchema>
export type PostGenerateFileActionSpec = Schema.Schema.Type<typeof PostGenerateFileActionSpecSchema>
export type PlanTaskSpec = Schema.Schema.Type<typeof PlanTaskSpecSchema>
export type PlanSpec = Schema.Schema.Type<typeof PlanSpecSchema>

export const decodePlanSpec = Schema.decodeUnknown(PlanSpecSchema, { errors: 'all' })
