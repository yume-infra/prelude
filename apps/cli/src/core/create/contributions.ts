import type { CapabilityContribution, ResolvedGraph } from './model'

function verifyScriptFor(graph: ResolvedGraph): string | undefined {
  const commands = ['pnpm build']

  if (graph.rootCapabilities.includes('linting')) {
    commands.push('pnpm lint')
  }

  if (graph.rootCapabilities.includes('knip')) {
    commands.push('pnpm knip')
  }

  return commands.length > 1 ? commands.join(' && ') : undefined
}

export function collectCapabilityContributions(graph: ResolvedGraph): readonly CapabilityContribution[] {
  const contributions: CapabilityContribution[] = []

  for (const capability of graph.rootPackage.capabilities) {
    switch (capability) {
      case 'minimal-node-package':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:minimal-node-package',
            entries: {
              name: graph.rootPackage.name,
              type: 'module',
              version: '0.0.0',
              scripts: {
                build: 'tsc --noEmit',
              },
            },
          },
          {
            kind: 'generatedUserFile',
            surfaceId: 'source:root/src/index.ts',
            owner: 'capability:minimal-node-package',
            path: 'src/index.ts',
            content: 'export {}\n',
          },
        )
    }
  }

  for (const capability of graph.rootCapabilities) {
    switch (capability) {
      case 'package-manager:pnpm':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:package-manager:pnpm',
            entries: {
              packageManager: 'pnpm@10.33.4',
            },
          },
        )
        break
      case 'linting':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:linting',
            entries: {
              scripts: {
                lint: 'eslint .',
              },
              devDependencies: {
                '@antfu/eslint-config': 'catalog:',
                'eslint': 'catalog:',
                'typescript': 'catalog:',
              },
            },
          },
          {
            kind: 'eslintRoot',
            surfaceId: 'eslint-root',
            owner: 'capability:linting',
          },
        )
        break
      case 'knip':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:knip',
            entries: {
              scripts: {
                knip: 'knip',
              },
              devDependencies: {
                knip: 'catalog:',
              },
            },
          },
          {
            kind: 'knipRoot',
            surfaceId: 'knip-root',
            owner: 'capability:knip',
            config: {
              $schema: 'https://unpkg.com/knip@6/schema.json',
            },
          },
        )
    }
  }

  const verifyScript = verifyScriptFor(graph)
  if (verifyScript) {
    contributions.push({
      kind: 'packageManifest',
      surfaceId: 'package-manifest:root',
      owner: 'resolver:verification',
      entries: {
        scripts: {
          verify: verifyScript,
        },
      },
    })
  }

  return contributions
}
