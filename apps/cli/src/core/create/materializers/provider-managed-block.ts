import type { ProviderManagedBlockContribution, WriteOperation } from '../model'
import * as path from 'node:path'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'

function providerManagedBlockPathError(contribution: ProviderManagedBlockContribution) {
  return new SchemaContractError({
    schema: contribution.surfaceId,
    issueCount: 1,
    message: `Provider ${contribution.providerId} declared unsupported managed block path "${contribution.path}". Managed blocks must target normalized relative paths inside the generated project.`,
  })
}

function isSafeRelativePath(filePath: string) {
  if (path.isAbsolute(filePath)) {
    return false
  }

  const normalized = path.posix.normalize(filePath)
  return normalized === filePath
    && normalized.length > 0
    && normalized !== '.'
    && !normalized.startsWith('../')
    && !normalized.split('/').includes('..')
}

export const materializeProviderManagedBlock = Effect.fn('materializeProviderManagedBlock')(
  function* (contribution: ProviderManagedBlockContribution): Effect.fn.Return<WriteOperation, SchemaContractError> {
    if (!isSafeRelativePath(contribution.path)) {
      return yield* providerManagedBlockPathError(contribution)
    }

    return {
      id: contribution.operationId,
      kind: 'writeManagedBlock',
      owner: contribution.owner,
      surfaceId: contribution.surfaceId,
      path: contribution.path,
      authority: 'bounded',
      startMarker: contribution.startMarker,
      endMarker: contribution.endMarker,
      content: contribution.content,
    }
  },
)
