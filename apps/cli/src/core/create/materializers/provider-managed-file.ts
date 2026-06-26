import type { ProviderManagedFileContribution, WriteOperation } from '../model'
import * as path from 'node:path'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'

function providerManagedFilePathError(contribution: ProviderManagedFileContribution) {
  return new SchemaContractError({
    schema: contribution.surfaceId,
    issueCount: 1,
    message: `Provider ${contribution.providerId} declared unsupported managed file path "${contribution.path}". Managed files must be normalized relative paths inside the generated project.`,
  })
}

function isSafeRelativePath(filePath: string) {
  if (path.isAbsolute(filePath) || filePath.includes('\\')) {
    return false
  }

  const normalized = path.posix.normalize(filePath)
  return normalized === filePath
    && normalized.length > 0
    && normalized !== '.'
    && !normalized.startsWith('../')
    && !normalized.split('/').includes('..')
}

export const materializeProviderManagedFile = Effect.fn('materializeProviderManagedFile')(
  function* (contribution: ProviderManagedFileContribution): Effect.fn.Return<WriteOperation, SchemaContractError> {
    if (!isSafeRelativePath(contribution.path)) {
      return yield* providerManagedFilePathError(contribution)
    }

    return {
      id: contribution.operationId,
      kind: 'writeManagedFile',
      owner: contribution.owner,
      surfaceId: contribution.surfaceId,
      path: contribution.path,
      authority: 'owner',
      content: contribution.content,
    }
  },
)
