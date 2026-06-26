import { Schema } from 'effect'
import { ProjectNameSchema } from '../brand/project-name'
import { formatSchemaError } from './errors'

const CliArgsSchema = Schema.Struct({
  _: Schema.optionalKey(Schema.Array(Schema.String)),
  preset: Schema.optionalKey(Schema.String),
  spec: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(ProjectNameSchema),
  install: Schema.optionalKey(Schema.Boolean),
  git: Schema.optionalKey(Schema.Boolean),
  help: Schema.optionalKey(Schema.Boolean),
  version: Schema.optionalKey(Schema.Boolean),
  rollback: Schema.optionalKey(Schema.Boolean),
  dryRun: Schema.optionalKey(Schema.Boolean),
  noInput: Schema.optionalKey(Schema.Boolean),
  printSpec: Schema.optionalKey(Schema.Boolean),
}).annotate({
  identifier: 'CliArgs',
  title: 'CliArgs',
})

export type CliArgs = Schema.Schema.Type<typeof CliArgsSchema>

export const decodeCliArgs = Schema.decodeUnknownEffect(CliArgsSchema, { errors: 'all' })

export const formatCliArgsError = formatSchemaError
