import { Data } from 'effect'

export class TemplateError extends Data.TaggedError('TemplateCompileError')<{
  message: string
  templatePath?: string
  stage?: 'compile' | 'render'
  cause?: unknown
}> {}

export class FileIOError extends Data.TaggedError('FileIOError')<{
  op: 'read' | 'write' | 'mkdir' | 'exists' | 'remove' | 'copy' | 'parse' | 'chmod'
  path: string
  message: string
  projectType?: string
  targetDir?: string
}> {}

export class CommandError extends Data.TaggedError('CommandError')<{
  command: string
  args: string[]
  // 暂时用不上，扩展时可能还需要改
  env?: Record<string, string>
  cwd?: string
  shell?: boolean
  cause?: unknown
  stdout?: string
  stderr?: string
  output?: string
}> {}

export class PlanConflictError extends Data.TaggedError('PlanConflictError')<{
  path: string
  taskKinds: string[]
  message: string
}> {}

export class PlanTargetPathError extends Data.TaggedError('PlanTargetPathError')<{
  path: string
  baseDir: string
  message: string
}> {}

export interface PlanSpecProjectionIssue {
  taskKind: string
  targetPath: string
  fieldPath: string
  reason: string
}

export class PlanSpecProjectionError extends Data.TaggedError('PlanSpecProjectionError')<{
  message: string
  issues: PlanSpecProjectionIssue[]
}> {}

export class SchemaContractError extends Data.TaggedError('SchemaContractError')<{
  schema: string
  message: string
  issueCount?: number
}> {}
