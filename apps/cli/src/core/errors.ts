import { Data } from 'effect'

export class FileIOError extends Data.TaggedError('FileIOError')<{
  op: 'read' | 'write' | 'mkdir' | 'exists' | 'parse'
  path: string
  message: string
}> {}

export class SchemaContractError extends Data.TaggedError('SchemaContractError')<{
  schema: string
  message: string
  issueCount?: number
}> {}
