import type { CapabilityContribution, ResolvedGraph } from './model'

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

  return contributions
}
