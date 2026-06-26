import { Schema } from 'effect'

export class FileIOError extends Schema.TaggedErrorClass<FileIOError>()('FileIOError', {
  op: Schema.Literals(['read', 'write', 'mkdir', 'exists', 'parse']),
  path: Schema.String,
  message: Schema.String,
}) {}

export class SchemaContractError extends Schema.TaggedErrorClass<SchemaContractError>()('SchemaContractError', {
  schema: Schema.String,
  message: Schema.String,
  issueCount: Schema.optional(Schema.Finite),
}) {}
