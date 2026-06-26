import type { GeneratedUserFileContribution, WriteOperation } from '../model'

export function materializeGeneratedUserFile(contribution: GeneratedUserFileContribution): WriteOperation {
  return {
    id: contribution.operationId ?? 'write-root-source',
    kind: 'writeGeneratedUserFile',
    owner: contribution.operationOwner ?? contribution.owner,
    surfaceId: contribution.surfaceId,
    path: contribution.path,
    authority: 'none',
    content: contribution.content,
  }
}
