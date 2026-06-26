import type { StyleSheetContribution, WriteOperation } from '../model'

export function materializeStyleSheet(surfaceId: string, contributions: readonly StyleSheetContribution[]): WriteOperation {
  const firstContribution = contributions[0]!
  const content = contributions.flatMap(contribution => contribution.content).join('\n')

  return {
    id: firstContribution.path.endsWith('.less') ? 'write-less-stylesheet' : 'write-css-stylesheet',
    kind: 'writeGeneratedUserFile',
    owner: 'materializer:stylesheet',
    surfaceId,
    path: firstContribution.path,
    authority: 'none',
    content: `${content}\n`,
  }
}
