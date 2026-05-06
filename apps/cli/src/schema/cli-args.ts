import { ParseResult, Schema } from 'effect'
import { ProjectNameSchema } from '../brand/project-name'
import { PresetSchema } from './preset'

const CliArgsSchema = Schema.Struct({
  _: Schema.optionalWith(Schema.Array(Schema.String), { exact: true }),
  preset: Schema.optionalWith(PresetSchema, { exact: true }),
  spec: Schema.optionalWith(Schema.String, { exact: true }),
  name: Schema.optionalWith(ProjectNameSchema, { exact: true }),
  install: Schema.optionalWith(Schema.Boolean, { exact: true }),
  git: Schema.optionalWith(Schema.Boolean, { exact: true }),
  help: Schema.optionalWith(Schema.Boolean, { exact: true }),
  version: Schema.optionalWith(Schema.Boolean, { exact: true }),
  rollback: Schema.optionalWith(Schema.Boolean, { exact: true }),
  dryRun: Schema.optionalWith(Schema.Boolean, { exact: true }),
  noInput: Schema.optionalWith(Schema.Boolean, { exact: true }),
  printSpec: Schema.optionalWith(Schema.Boolean, { exact: true }),
}).annotations({
  identifier: 'CliArgs',
  title: 'CliArgs',
})

export type CliArgs = Schema.Schema.Type<typeof CliArgsSchema>

export const decodeCliArgs = Schema.decodeUnknown(CliArgsSchema, { errors: 'all' })

export const formatCliArgsError = ParseResult.TreeFormatter.formatErrorSync
