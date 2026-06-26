import type { ProviderArtifactContribution, WriteOperation } from '../model'
import * as path from 'node:path'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'

function providerArtifactPathError(contribution: ProviderArtifactContribution) {
  return new SchemaContractError({
    schema: contribution.surfaceId,
    issueCount: 1,
    message: `Provider ${contribution.providerId} declared unsupported artifact path "${contribution.path}". Provider artifacts must stay under .prelude/providers/${contribution.providerId}/.`,
  })
}

function isProviderNamespacePath(providerId: string, artifactPath: string) {
  if (path.isAbsolute(artifactPath)) {
    return false
  }

  const normalized = path.posix.normalize(artifactPath)
  const providerRoot = `.prelude/providers/${providerId}/`

  return normalized === artifactPath
    && normalized.startsWith(providerRoot)
    && normalized.length > providerRoot.length
    && !normalized.split('/').includes('..')
}

export function materializeProviderArtifact(contribution: ProviderArtifactContribution): Effect.Effect<WriteOperation, SchemaContractError> {
  if (!isProviderNamespacePath(contribution.providerId, contribution.path)) {
    return Effect.fail(providerArtifactPathError(contribution))
  }

  return Effect.succeed({
    id: 'write-effect-harness-provider-record',
    kind: 'writeStructuredFile',
    owner: 'materializer:provider-artifact',
    surfaceId: contribution.surfaceId,
    path: contribution.path,
    authority: 'owner',
    value: contribution.value,
  })
}
