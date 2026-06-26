import type { WorkspaceManifestContribution, WriteOperation } from '../model'

function unique(values: readonly string[]) {
  return [...new Set(values)]
}

export function materializeWorkspaceManifest(surfaceId: string, contributions: readonly WorkspaceManifestContribution[]): WriteOperation {
  const globs = unique(contributions.flatMap(contribution => contribution.globs))
  const globLines = globs.map(glob => `  - ${glob}`)

  return {
    id: 'write-pnpm-workspace',
    kind: 'writeGeneratedUserFile',
    owner: 'materializer:workspace-manifest',
    surfaceId,
    path: 'pnpm-workspace.yaml',
    authority: 'none',
    content: `packages:
${globLines.join('\n')}

catalog:
  '@antfu/eslint-config': 8.2.0
  '@types/node': 25.6.0
  eslint: ^10.3.0
  knip: ^6.12.0
  taze: ^19.11.0
  tsdown: ^0.21.10
  typescript: 6.0.3
`,
  }
}
