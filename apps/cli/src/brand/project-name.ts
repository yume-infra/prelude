import { ParseResult, Schema } from 'effect'

const ProjectNamePattern = /^[\w-]+$/

export const ProjectNameSchema = Schema.String.pipe(
  Schema.pattern(ProjectNamePattern),
  Schema.brand('ProjectName'),
  Schema.annotations({
    identifier: 'ProjectName',
    title: 'ProjectName',
  }),
)

export type ProjectName = Schema.Schema.Type<typeof ProjectNameSchema>

export const decodeProjectName = Schema.decodeUnknown(ProjectNameSchema, { errors: 'all' })

export const formatProjectNameError = ParseResult.TreeFormatter.formatErrorSync

export const makeProjectName = (value: string): ProjectName => Schema.decodeUnknownSync(ProjectNameSchema)(value)
