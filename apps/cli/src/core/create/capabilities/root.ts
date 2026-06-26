import type { JsonValue, ResolvedGraph } from '../model'
import type { PackageManifestEntries, RootCapabilityDefinition } from './types'

function verifyScriptFor(graph: ResolvedGraph): string | undefined {
  const commands = ['pnpm build']

  if (graph.providers.some(provider => provider.id === 'effect-harness')) {
    commands.push('pnpm typecheck')
  }

  if (graph.rootCapabilities.includes('linting')) {
    commands.push('pnpm lint')
  }

  if (graph.rootCapabilities.includes('knip')) {
    commands.push('pnpm knip')
  }

  if (graph.providers.some(provider => provider.id === 'effect-harness')) {
    commands.push('pnpm effect:verify')
  }

  return commands.length > 1 ? commands.join(' && ') : undefined
}

export function workspaceGlobs(packages: ResolvedGraph['packages']) {
  const globs: string[] = []

  for (const pkg of packages) {
    const [directory] = pkg.path.split('/')
    if (directory && pkg.path !== '.') {
      const glob = `${directory}/*`
      if (!globs.includes(glob)) {
        globs.push(glob)
      }
    }
  }

  return globs
}

export function workspaceRootPackageEntries(graph: ResolvedGraph): PackageManifestEntries {
  const scripts: Record<string, JsonValue> = {
    build: 'pnpm -r --if-present build',
    typecheck: 'pnpm -r --if-present typecheck',
  }
  const verifyScript = verifyScriptFor(graph)

  if (verifyScript) {
    scripts.verify = verifyScript
  }

  return {
    private: true,
    scripts,
  }
}

export function rootVerifyContribution(graph: ResolvedGraph): PackageManifestEntries {
  const verifyScript = verifyScriptFor(graph)

  return verifyScript === undefined
    ? {}
    : {
        scripts: {
          verify: verifyScript,
        },
      }
}

function knipRootConfig(graph: ResolvedGraph): Record<string, JsonValue> {
  const ignoredProviderDependencies = graph.providers.some(provider => provider.id === 'effect-harness')
    ? ['@effect/tsgo', '@effect/vitest']
    : []

  return {
    $schema: 'https://unpkg.com/knip@6/schema.json',
    ...(ignoredProviderDependencies.length === 0
      ? {}
      : { ignoreDependencies: ignoredProviderDependencies }),
  }
}

export const rootCapabilityDefinitions: readonly RootCapabilityDefinition[] = [
  {
    id: 'package-manager:pnpm',
    scope: 'root',
    requirements: [],
    conflicts: [],
    logicalSurfaces: () => [],
    contribute: () => [
      {
        kind: 'packageManifest',
        surfaceId: 'package-manifest:root',
        owner: 'capability:package-manager:pnpm',
        entries: {
          packageManager: 'pnpm@10.33.4',
        },
      },
    ],
  },
  {
    id: 'linting',
    scope: 'root',
    requirements: [],
    conflicts: [],
    logicalSurfaces: () => [
      {
        id: 'eslint-root',
        materializer: 'eslint-config',
        owner: 'capability:linting',
      },
    ],
    contribute: () => [
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
    ],
  },
  {
    id: 'knip',
    scope: 'root',
    requirements: [],
    conflicts: [],
    logicalSurfaces: () => [
      {
        id: 'knip-root',
        materializer: 'knip-config',
        owner: 'capability:knip',
      },
    ],
    contribute: ({ graph }) => [
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
        config: knipRootConfig(graph),
      },
    ],
  },
  {
    id: 'dependency-update:taze',
    scope: 'root',
    requirements: [],
    conflicts: [],
    logicalSurfaces: () => [],
    contribute: () => [
      {
        kind: 'packageManifest',
        surfaceId: 'package-manifest:root',
        owner: 'capability:dependency-update:taze',
        entries: {
          scripts: {
            'deps:check': 'taze -r',
          },
          devDependencies: {
            taze: 'catalog:',
          },
        },
      },
    ],
  },
  {
    id: 'ai-harness',
    scope: 'root',
    requirements: [],
    conflicts: [],
    logicalSurfaces: () => [],
    contribute: () => [],
  },
]
