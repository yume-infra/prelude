import type { ProjectConfig } from '@/schema/project-config'
import { Effect } from 'effect'

function projectAnnotations(
  config: ProjectConfig,
  taskKind: string,
  targetPath?: string,
) {
  return {
    projectName: config.name,
    projectType: config.type,
    taskKind,
    ...(targetPath ? { targetPath } : {}),
  }
}

export function withProjectAnnotations(
  config: ProjectConfig,
  taskKind: string,
  targetPath?: string,
) {
  const annotations = projectAnnotations(config, taskKind, targetPath)
  return <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(
      Effect.annotateLogs(annotations),
      Effect.annotateSpans(annotations),
    )
}
