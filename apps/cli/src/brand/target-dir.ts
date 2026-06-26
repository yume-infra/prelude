import type { ProjectName } from './project-name'
import { Schema } from 'effect'

const TargetDirSchema = Schema.String.pipe(
  Schema.brand('TargetDir'),
  Schema.annotate({
    identifier: 'TargetDir',
    title: 'TargetDir',
  }),
)

export type TargetDir = Schema.Schema.Type<typeof TargetDirSchema>

export const makeTargetDir = (value: string): TargetDir => Schema.decodeUnknownSync(TargetDirSchema)(value)

export const makeProjectTargetDir = (name: ProjectName): TargetDir => makeTargetDir(`./${name}`)
