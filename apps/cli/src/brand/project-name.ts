import { Schema } from 'effect'
import { formatSchemaError } from '@/schema/errors'

const ProjectNamePattern = /^[\w-]+$/

const ProjectNameSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(ProjectNamePattern)),
  Schema.brand('ProjectName'),
  Schema.annotate({
    identifier: 'ProjectName',
    title: 'ProjectName',
  }),
)

export type ProjectName = Schema.Schema.Type<typeof ProjectNameSchema>

export const decodeProjectName = Schema.decodeUnknownEffect(ProjectNameSchema, { errors: 'all' })

export const formatProjectNameError = formatSchemaError

export const makeProjectName = (value: string): ProjectName => Schema.decodeUnknownSync(ProjectNameSchema)(value)
