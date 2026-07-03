import type { ProviderArtifactContribution, WriteOperation } from '../model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'
import { pathIsAbsolute, pathNormalize } from '@/core/path-utils'

function providerArtifactPathError(contribution: ProviderArtifactContribution) {
  return SchemaContractError.make({
    schema: contribution.surfaceId,
    issueCount: 1,
    message: `Provider ${contribution.providerId} declared unsupported artifact path "${contribution.path}". Provider artifacts must stay under .prelude/providers/${contribution.providerId}/.`,
  })
}

function isProviderNamespacePath(providerId: string, artifactPath: string) {
  if (pathIsAbsolute(artifactPath) || artifactPath.includes('\\')) {
    return false
  }

  const normalized = pathNormalize(artifactPath)
  const providerRoot = `.prelude/providers/${providerId}/`

  return normalized === artifactPath
    && normalized.startsWith(providerRoot)
    && normalized.length > providerRoot.length
    && !normalized.split('/').includes('..')
}

export const materializeProviderArtifact = Effect.fn('materializeProviderArtifact')(
  function* (contribution: ProviderArtifactContribution): Effect.fn.Return<WriteOperation, SchemaContractError> {
    if (!isProviderNamespacePath(contribution.providerId, contribution.path)) {
      return yield* providerArtifactPathError(contribution)
    }

    return {
      id: 'write-effect-harness-provider-record',
      kind: 'writeStructuredFile',
      owner: 'materializer:provider-artifact',
      surfaceId: contribution.surfaceId,
      path: contribution.path,
      authority: 'owner',
      value: contribution.value,
    }
  },
)
