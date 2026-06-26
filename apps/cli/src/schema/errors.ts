import type { Schema } from 'effect'

export function formatSchemaError(error: Schema.SchemaError) {
  return error.message
}

export function schemaIssueCount(_error: Schema.SchemaError) {
  return 1
}
