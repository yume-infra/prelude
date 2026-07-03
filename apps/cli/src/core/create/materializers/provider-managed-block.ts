import type { ProviderManagedBlockContribution, WriteOperation } from '../model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'
import { pathIsAbsolute, pathNormalize } from '@/core/path-utils'

function providerManagedBlockPathError(contribution: ProviderManagedBlockContribution) {
  return SchemaContractError.make({
    schema: contribution.surfaceId,
    issueCount: 1,
    message: `Provider ${contribution.providerId} declared unsupported managed block path "${contribution.path}". Managed blocks must target normalized relative paths inside the generated project.`,
  })
}

function isSafeRelativePath(filePath: string) {
  if (pathIsAbsolute(filePath) || filePath.includes('\\')) {
    return false
  }

  const normalized = pathNormalize(filePath)
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
