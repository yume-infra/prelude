import type {
  CapabilityContribution,
  GeneratedUserFileContribution,
  JsonValue,
  PackageManifestContribution,
  WriteOperation,
  WritePlan,
} from './model'

function mergePackageManifestContributions(contributions: readonly PackageManifestContribution[]) {
  const manifest: Record<string, JsonValue> = {}

  for (const contribution of contributions) {
    for (const [key, value] of Object.entries(contribution.entries)) {
      if (Object.hasOwn(manifest, key) && JSON.stringify(manifest[key]) !== JSON.stringify(value)) {
        throw new Error(`Conflicting package manifest contribution for "${key}"`)
      }

      manifest[key] = value
    }
  }

  return manifest
}

function materializePackageJson(contributions: readonly PackageManifestContribution[]): WriteOperation {
  return {
    id: 'write-package-json',
    kind: 'writeStructuredFile',
    owner: 'materializer:package-json',
    surfaceId: 'package-manifest:root',
    path: 'package.json',
    authority: 'none',
    value: mergePackageManifestContributions(contributions),
  }
}

function materializeGeneratedUserFile(contribution: GeneratedUserFileContribution): WriteOperation {
  return {
    id: 'write-root-source',
    kind: 'writeGeneratedUserFile',
    owner: 'capability:minimal-node-package',
    surfaceId: contribution.surfaceId,
    path: contribution.path,
    authority: 'none',
    content: contribution.content,
  }
}

export function materializeWritePlan(contributions: readonly CapabilityContribution[]): WritePlan {
  const packageManifestContributions = contributions.filter(
    (contribution): contribution is PackageManifestContribution => contribution.kind === 'packageManifest',
  )
  const sourceContributions = contributions.filter(
    (contribution): contribution is GeneratedUserFileContribution => contribution.kind === 'generatedUserFile',
  )

  return {
    operations: [
      materializePackageJson(packageManifestContributions),
      ...sourceContributions.map(materializeGeneratedUserFile),
    ],
  }
}
