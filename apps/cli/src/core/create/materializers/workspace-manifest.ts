import type { PackageManifestContribution, WorkspaceManifestContribution, WriteOperation } from '../model'

function unique(values: readonly string[]) {
  return [...new Set(values)]
}

const catalogVersions: Record<string, string> = {
  '@antfu/eslint-config': '8.2.0',
  '@types/node': '25.6.0',
  'eslint': '^10.3.0',
  'knip': '^6.12.0',
  'taze': '^19.11.0',
  'tsdown': '^0.21.10',
  'turbo': '^2.9.9',
  'typescript': '6.0.3',
}

const dependencySections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const

function catalogEntries(packageManifestContributions: readonly PackageManifestContribution[]) {
  const dependencyNames = new Set<string>()

  for (const contribution of packageManifestContributions) {
    for (const section of dependencySections) {
      const dependencies = contribution.entries[section]

      if (dependencies === null || typeof dependencies !== 'object' || Array.isArray(dependencies)) {
        continue
      }

      for (const [dependencyName, dependencyVersion] of Object.entries(dependencies)) {
        if (dependencyVersion === 'catalog:') {
          dependencyNames.add(dependencyName)
        }
      }
    }
  }

  return Object.entries(catalogVersions)
    .filter(([dependencyName]) => dependencyNames.has(dependencyName))
    .map(([dependencyName, version]) => `  ${yamlKey(dependencyName)}: ${version}`)
}

function yamlKey(key: string) {
  return /^[\w-]+$/u.test(key)
    ? key
    : `'${key.replaceAll('\'', '\'\'')}'`
}

export function materializeWorkspaceManifest(
  surfaceId: string,
  contributions: readonly WorkspaceManifestContribution[],
  packageManifestContributions: readonly PackageManifestContribution[],
): WriteOperation {
  const globs = unique(contributions.flatMap(contribution => contribution.globs))
  const globLines = globs.map(glob => `  - ${glob}`)
  const catalogLines = catalogEntries(packageManifestContributions)
  const catalogBlock = catalogLines.length === 0
    ? ''
    : `

catalog:
${catalogLines.join('\n')}`

  return {
    id: 'write-pnpm-workspace',
    kind: 'writeGeneratedUserFile',
    owner: 'materializer:workspace-manifest',
    surfaceId,
    path: 'pnpm-workspace.yaml',
    authority: 'none',
    content: `packages:
${globLines.join('\n')}${catalogBlock}
`,
  }
}
