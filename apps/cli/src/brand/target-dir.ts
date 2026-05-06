import type { ProjectName } from './project-name'
import { Schema } from 'effect'

const TargetDirSchema = Schema.String.pipe(
  Schema.brand('TargetDir'),
  Schema.annotations({
    identifier: 'TargetDir',
    title: 'TargetDir',
  }),
)

export type TargetDir = Schema.Schema.Type<typeof TargetDirSchema>

export const makeTargetDir = (value: string): TargetDir => TargetDirSchema.make(value)

export const makeProjectTargetDir = (name: ProjectName): TargetDir => makeTargetDir(`./${name}`)
