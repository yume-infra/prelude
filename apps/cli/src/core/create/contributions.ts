import type { CapabilityContribution, ResolvedGraph } from './model'
import { effectHarnessContributions, hasEffectHarnessProvider } from './effect-harness-provider'

function reactAppShellSurfaceId(packageId: string) {
  return `react-app-shell:${packageId}` as const
}

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
  const packageId = graph.rootPackage.id
  const packageName = graph.rootPackage.name

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
        break
      case 'effect-package':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:effect-package',
            entries: {
              name: graph.rootPackage.name,
              type: 'module',
              version: '0.0.0',
              scripts: {
                build: 'tsgo --noEmit',
              },
            },
          },
          {
            kind: 'generatedUserFile',
            surfaceId: 'source:root/src/index.ts',
            owner: 'capability:effect-package',
            path: 'src/index.ts',
            content: 'export {}\n',
          },
        )
        break
      case 'react-app':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:react-app',
            entries: {
              name: packageName,
              type: 'module',
              version: '0.0.0',
              scripts: {
                dev: 'vite',
                build: 'vite build',
                preview: 'vite preview',
              },
              dependencies: {
                'react': '^19.2.6',
                'react-dom': '^19.2.6',
              },
              devDependencies: {
                '@vitejs/plugin-react': '^6.0.1',
                '@types/react': '^19.2.14',
                '@types/react-dom': '^19.2.3',
                'typescript': 'catalog:',
                'vite': '^8.0.9',
              },
            },
          },
          {
            kind: 'generatedUserFile',
            surfaceId: `react-app-static:${packageId}/index.html`,
            owner: 'capability:react-app',
            path: 'index.html',
            content: `<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
`,
          },
          {
            kind: 'generatedUserFile',
            surfaceId: `react-app-static:${packageId}/src/main.tsx`,
            owner: 'capability:react-app',
            path: 'src/main.tsx',
            content: `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`,
          },
          {
            kind: 'reactAppShell',
            surfaceId: reactAppShellSurfaceId(packageId),
            owner: 'capability:react-app',
            imports: [],
            declarations: [],
            body: [
              `    <main>
      <h1>${packageName}</h1>
    </main>`,
            ],
          },
        )
        break
      case 'react-counter':
        contributions.push({
          kind: 'reactAppShell',
          surfaceId: reactAppShellSurfaceId(packageId),
          owner: 'capability:react-counter',
          imports: ['import { useState } from \'react\''],
          declarations: ['  const [count, setCount] = useState(0)'],
          body: [
            `    <main>
      <h1>${packageName}</h1>
      <button type="button" onClick={() => setCount(value => value + 1)}>
        Count: {count}
      </button>
    </main>`,
          ],
        })
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

  if (hasEffectHarnessProvider(graph)) {
    contributions.push(...effectHarnessContributions(graph))
  }

  return contributions
}
