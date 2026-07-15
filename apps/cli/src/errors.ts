import { Schema } from 'effect'

export class PreludeError extends Schema.TaggedErrorClass<PreludeError>()('PreludeError', {
  phase: Schema.Literals([
    'config',
    'artifact',
    'planning',
    'composition',
    'apply',
    'check',
    'cli',
  ]),
  message: Schema.String,
  detail: Schema.optionalKey(Schema.String),
  data: Schema.optionalKey(Schema.Unknown),
}) {}

export function preludeError(
  phase: PreludeError['phase'],
  message: string,
  detail?: string,
  data?: unknown,
): PreludeError {
  return PreludeError.make({
    phase,
    message,
    ...(detail === undefined ? {} : { detail }),
    ...(data === undefined ? {} : { data }),
  })
}

export function errorMessage(error: unknown): string {
  if (Schema.is(PreludeError)(error))
    return error.detail === undefined ? error.message : `${error.message}: ${error.detail}`

  if (error instanceof Error)
    return error.message

  return String(error)
}
