import type { PackageManifestContribution } from '../../../src/core/modifier/package-manifest-contributions'
import { describe, expect, it } from 'vitest'
import {
  collectPackageManifestContributions,
  collectPackageManifestContributionsByTarget,
  PackageManifestContributionConflictError,
  packageManifestTargetPath,
  rootPackageManifestTargetPath,
} from '../../../src/core/modifier/package-manifest-contributions'
import { getReactRouterPackageContributions } from '../../../src/core/owners/router'
import { getScaffoldFamilyPackageContributions } from '../../../src/core/owners/scaffold-family'
import { getReactStateManagementPackageContributions } from '../../../src/core/owners/state-management'
import {
  CliPackageOwner,
  contributionTrace,
  ContributionUnitKind,
  defineOwner,
  FrontendPackageOwner,
  LibraryPackageOwner,
  NodePackageOwner,
  OwnershipLayer,
  WorkspaceBootstrapOwner,
} from '../../../src/core/ownership/model'
import { getWorkspaceBootstrapPackageContributions } from '../../../src/core/workspace-bootstrap'
import { cliEffectPresetProjectConfig, cliMinimalPresetProjectConfig, reactPresetProjectConfig } from '../../support/fixtures'

const alphaOwner = defineOwner({
  id: 'alpha-owner',
  layer: OwnershipLayer.Capability,
  label: 'Alpha Owner',
})

const betaOwner = defineOwner({
  id: 'beta-owner',
  layer: OwnershipLayer.Capability,
  label: 'Beta Owner',
})

const alphaTrace = contributionTrace(alphaOwner, ContributionUnitKind.JsonTextMutation)
const betaTrace = contributionTrace(betaOwner, ContributionUnitKind.JsonTextMutation)
const workspaceRootTrace = contributionTrace(WorkspaceBootstrapOwner, ContributionUnitKind.JsonTextMutation)
const frontendPackageTrace = contributionTrace(FrontendPackageOwner, ContributionUnitKind.JsonTextMutation)
const nodePackageTrace = contributionTrace(NodePackageOwner, ContributionUnitKind.JsonTextMutation)
const cliPackageTrace = contributionTrace(CliPackageOwner, ContributionUnitKind.JsonTextMutation)
const libraryPackageTrace = contributionTrace(LibraryPackageOwner, ContributionUnitKind.JsonTextMutation)

describe('collectPackageManifestContributions', () => {
  it('applies package-aware top-level and section ordering', () => {
    const collection = collectPackageManifestContributions({
      base: {
        version: '0.0.0',
        name: 'demo-app',
      },
      contributions: [
        {
          ownership: alphaTrace,
          fields: {
            type: 'module',
            license: 'MIT',
          },
          sections: {
            scripts: {
              preview: 'vite preview',
              build: 'vite build',
              dev: 'vite',
            },
            dependencies: {
              'vue': '^3.5.32',
              '@vitejs/plugin-vue': '^6.0.6',
            },
            devDependencies: {
              typescript: '^6.0.3',
              eslint: '^10.3.0',
            },
          },
        },
      ],
    })

    expect(Object.keys(collection.manifest)).toEqual([
      'name',
      'type',
      'version',
      'license',
      'scripts',
      'dependencies',
      'devDependencies',
    ])
    expect(Object.keys(collection.manifest.scripts as Record<string, unknown>)).toEqual([
      'build',
      'dev',
      'preview',
    ])
    expect(Object.keys(collection.manifest.dependencies as Record<string, unknown>)).toEqual([
      '@vitejs/plugin-vue',
      'vue',
    ])
    expect(Object.keys(collection.manifest.devDependencies as Record<string, unknown>)).toEqual([
      'eslint',
      'typescript',
    ])
  })

  it('dedupes same-value contributions and preserves contributing owners', () => {
    const collection = collectPackageManifestContributions({
      contributions: [
        {
          ownership: alphaTrace,
          sections: {
            dependencies: {
              vite: '^8.0.9',
            },
          },
        },
        {
          ownership: betaTrace,
          sections: {
            dependencies: {
              vite: '^8.0.9',
            },
          },
        },
      ],
    })

    expect(collection.manifest.dependencies).toEqual({ vite: '^8.0.9' })
    expect(collection.provenance).toContainEqual({
      targetPath: 'package.json',
      section: 'dependencies',
      key: 'vite',
      owners: ['alpha-owner', 'beta-owner'],
      value: '^8.0.9',
    })
  })

  it('dedupes same-value contributions from real migrated owners', () => {
    const collection = collectPackageManifestContributions({
      contributions: [
        ...getScaffoldFamilyPackageContributions(reactPresetProjectConfig)
          .filter(contribution => contribution.sections?.dependencies?.vite),
        {
          ownership: betaTrace,
          sections: {
            dependencies: {
              vite: '^8.0.9',
            },
          },
        },
      ],
    })

    expect(collection.manifest.dependencies).toEqual({ vite: '^8.0.9' })
    expect(collection.provenance).toContainEqual({
      targetPath: 'package.json',
      section: 'dependencies',
      key: 'vite',
      owners: ['frontend-scaffold', 'beta-owner'],
      value: '^8.0.9',
    })
  })

  it('records provenance across migrated package owners in collection order', () => {
    const collection = collectPackageManifestContributions({
      contributions: [
        ...getScaffoldFamilyPackageContributions(reactPresetProjectConfig),
        ...getWorkspaceBootstrapPackageContributions(reactPresetProjectConfig),
        ...getReactStateManagementPackageContributions(reactPresetProjectConfig),
        ...getReactRouterPackageContributions(reactPresetProjectConfig),
      ],
    })

    expect(collection.provenance).toEqual(expect.arrayContaining([
      {
        targetPath: 'package.json',
        section: 'dependencies',
        key: 'vite',
        owners: ['frontend-scaffold'],
        value: '^8.0.9',
      },
      {
        targetPath: 'package.json',
        section: 'devDependencies',
        key: 'eslint',
        owners: ['workspace-bootstrap'],
        value: '^10.3.0',
      },
      {
        targetPath: 'package.json',
        section: 'dependencies',
        key: 'jotai',
        owners: ['state-management'],
        value: '^2.19.1',
      },
      {
        targetPath: 'package.json',
        section: 'dependencies',
        key: 'react-router',
        owners: ['router'],
        value: '^7.15.0',
      },
    ]))
    expect(collection.provenance.map(entry => `${entry.section}.${entry.key}`)).toEqual(expect.arrayContaining([
      'dependencies.vite',
      'devDependencies.eslint',
      'dependencies.jotai',
      'dependencies.react-router',
    ]))
    expect(Object.keys(collection.manifest)).toEqual([
      'scripts',
      'dependencies',
      'devDependencies',
    ])
    expect(Object.keys(collection.manifest.dependencies as Record<string, unknown>)).toEqual([
      '@tailwindcss/vite',
      '@vitejs/plugin-react',
      'jotai',
      'react',
      'react-dom',
      'react-router',
      'react-router-dom',
      'tailwindcss',
      'vite',
    ])
  })

  it('records standalone cli package manifest provenance with cli scaffold ownership', () => {
    const collection = collectPackageManifestContributions({
      contributions: getScaffoldFamilyPackageContributions(cliMinimalPresetProjectConfig),
    })

    expect(collection.provenance).toEqual(expect.arrayContaining([
      {
        targetPath: 'package.json',
        section: '<root>',
        key: 'bin',
        owners: ['cli-scaffold'],
        value: {
          'cli-minimal-fixture': 'dist/index.js',
        },
      },
      {
        targetPath: 'package.json',
        section: 'scripts',
        key: 'build',
        owners: ['cli-scaffold'],
        value: 'tsdown --config tsdown.config.ts && node scripts/ensure-shebang.mjs',
      },
      {
        targetPath: 'package.json',
        section: 'devDependencies',
        key: 'tsdown',
        owners: ['cli-scaffold'],
        value: '^0.21.10',
      },
    ]))
  })

  it('records effect cli runtime dependency provenance with cli scaffold ownership', () => {
    const collection = collectPackageManifestContributions({
      contributions: getScaffoldFamilyPackageContributions(cliEffectPresetProjectConfig),
    })

    expect(collection.provenance).toEqual(expect.arrayContaining([
      {
        targetPath: 'package.json',
        section: 'dependencies',
        key: '@effect/cli',
        owners: ['cli-scaffold'],
        value: '^0.75.1',
      },
      {
        targetPath: 'package.json',
        section: 'dependencies',
        key: '@effect/platform-node',
        owners: ['cli-scaffold'],
        value: '^0.106.0',
      },
      {
        targetPath: 'package.json',
        section: 'dependencies',
        key: 'effect',
        owners: ['cli-scaffold'],
        value: '^3.21.2',
      },
    ]))
  })

  it('fails fast on same-key different-value contributions with owner-aware diagnostics', () => {
    expect(() => collectPackageManifestContributions({
      contributions: [
        {
          ownership: alphaTrace,
          sections: {
            devDependencies: {
              eslint: '^10.3.0',
            },
          },
        },
        {
          ownership: betaTrace,
          sections: {
            devDependencies: {
              eslint: '^9.0.0',
            },
          },
        },
      ],
    })).toThrow(PackageManifestContributionConflictError)

    try {
      collectPackageManifestContributions({
        contributions: [
          {
            ownership: alphaTrace,
            sections: {
              devDependencies: {
                eslint: '^10.3.0',
              },
            },
          },
          {
            ownership: betaTrace,
            sections: {
              devDependencies: {
                eslint: '^9.0.0',
              },
            },
          },
        ],
      })
    }
    catch (error) {
      expect(error).toBeInstanceOf(PackageManifestContributionConflictError)
      if (!(error instanceof PackageManifestContributionConflictError)) {
        throw error
      }

      expect(error.targetPath).toBe('package.json')
      expect(error.section).toBe('devDependencies')
      expect(error.key).toBe('eslint')
      expect(error.existingOwners).toEqual(['alpha-owner'])
      expect(error.incomingOwner).toBe('beta-owner')
      expect(error.existingValue).toBe('^10.3.0')
      expect(error.incomingValue).toBe('^9.0.0')
      expect(error.message).toContain('package.json devDependencies.eslint')
      expect(error.message).toContain('alpha-owner')
      expect(error.message).toContain('beta-owner')
      expect(error.message).toContain('^10.3.0')
      expect(error.message).toContain('^9.0.0')
      expect(error.message).not.toContain('scripts')
      expect(error.message).not.toContain('dependencies.vite')
      return
    }

    throw new Error('Expected package manifest conflict to be thrown')
  })

  it('reports conflicts after prior same-value dedupe with all existing owners', () => {
    try {
      collectPackageManifestContributions({
        contributions: [
          {
            ownership: alphaTrace,
            sections: {
              dependencies: {
                vite: '^8.0.9',
              },
            },
          },
          {
            ownership: betaTrace,
            sections: {
              dependencies: {
                vite: '^8.0.9',
              },
            },
          },
          {
            ownership: getWorkspaceBootstrapPackageContributions(reactPresetProjectConfig)[0]!.ownership,
            sections: {
              dependencies: {
                vite: '^9.0.0',
              },
            },
          },
        ],
      })
    }
    catch (error) {
      expect(error).toBeInstanceOf(PackageManifestContributionConflictError)
      if (!(error instanceof PackageManifestContributionConflictError)) {
        throw error
      }

      expect(error.targetPath).toBe('package.json')
      expect(error.section).toBe('dependencies')
      expect(error.key).toBe('vite')
      expect(error.existingOwners).toEqual(['alpha-owner', 'beta-owner'])
      expect(error.incomingOwner).toBe('workspace-bootstrap')
      expect(error.existingValue).toBe('^8.0.9')
      expect(error.incomingValue).toBe('^9.0.0')
      expect(error.message).toContain('Existing owner(s): alpha-owner, beta-owner')
      expect(error.message).toContain('Incoming owner: workspace-bootstrap')
      return
    }

    throw new Error('Expected package manifest conflict to be thrown')
  })

  it('reports root field conflicts with package path and owner context', () => {
    expect(() => collectPackageManifestContributions({
      base: {
        name: 'base-name',
      },
      contributions: [
        {
          ownership: alphaTrace,
          fields: {
            name: 'owner-name',
          },
        },
      ],
    })).toThrow(/package\.json name/)
  })

  it('filters root and package manifest contributions by target scope', () => {
    const packageTargetPath = packageManifestTargetPath('apps/web')
    const contributions = [
      {
        ownership: workspaceRootTrace,
        targetScope: 'root',
        sections: {
          devDependencies: {
            eslint: '^10.3.0',
          },
        },
      },
      {
        ownership: frontendPackageTrace,
        targetScope: 'package',
        sections: {
          dependencies: {
            react: '^19.2.6',
          },
        },
      },
    ] satisfies readonly PackageManifestContribution[]

    const rootCollection = collectPackageManifestContributions({
      targetPath: rootPackageManifestTargetPath,
      targetScope: 'root',
      contributions,
    })
    const packageCollection = collectPackageManifestContributions({
      targetPath: packageTargetPath,
      targetScope: 'package',
      base: { name: '@demo/web' },
      contributions,
    })

    expect(rootCollection.manifest).toEqual({
      devDependencies: {
        eslint: '^10.3.0',
      },
    })
    expect(packageCollection.manifest).toEqual({
      name: '@demo/web',
      dependencies: {
        react: '^19.2.6',
      },
    })
    expect(packageCollection.provenance).toContainEqual({
      targetPath: 'apps/web/package.json',
      section: 'dependencies',
      key: 'react',
      owners: ['frontend-package'],
      value: '^19.2.6',
    })
  })

  it('reports nested package manifest conflicts with the nested target path', () => {
    const targetPath = packageManifestTargetPath('apps/web')

    try {
      collectPackageManifestContributions({
        targetPath,
        targetScope: 'package',
        contributions: [
          {
            ownership: frontendPackageTrace,
            targetScope: 'package',
            sections: {
              dependencies: {
                react: '^19.2.6',
              },
            },
          },
          {
            ownership: betaTrace,
            targetScope: 'package',
            sections: {
              dependencies: {
                react: '^18.0.0',
              },
            },
          },
        ],
      })
    }
    catch (error) {
      expect(error).toBeInstanceOf(PackageManifestContributionConflictError)
      if (!(error instanceof PackageManifestContributionConflictError)) {
        throw error
      }

      expect(error.targetPath).toBe('apps/web/package.json')
      expect(error.section).toBe('dependencies')
      expect(error.key).toBe('react')
      expect(error.existingOwners).toEqual(['frontend-package'])
      expect(error.incomingOwner).toBe('beta-owner')
      expect(error.message).toContain('apps/web/package.json dependencies.react')
      return
    }

    throw new Error('Expected nested package manifest conflict to be thrown')
  })

  it('groups target-aware manifest collections in deterministic root-first path order', () => {
    const collections = collectPackageManifestContributionsByTarget({
      contributions: [
        {
          ownership: libraryPackageTrace,
          targetPath: packageManifestTargetPath('libs/ui'),
          targetScope: 'package',
          fields: {
            name: '@demo/ui',
          },
        },
        {
          ownership: workspaceRootTrace,
          targetPath: rootPackageManifestTargetPath,
          targetScope: 'root',
          fields: {
            name: 'demo-workspace',
          },
        },
        {
          ownership: frontendPackageTrace,
          targetPath: packageManifestTargetPath('apps/web'),
          targetScope: 'package',
          fields: {
            name: '@demo/web',
          },
        },
      ],
    })

    expect(collections.map(collection => collection.targetPath)).toEqual([
      'package.json',
      'apps/web/package.json',
      'libs/ui/package.json',
    ])
    expect(collections.map(collection => collection.manifest.name)).toEqual([
      'demo-workspace',
      '@demo/web',
      '@demo/ui',
    ])
  })

  it('preserves ownership traces across root, package, and capability boundaries', () => {
    const collections = collectPackageManifestContributionsByTarget({
      contributions: [
        {
          ownership: workspaceRootTrace,
          targetPath: rootPackageManifestTargetPath,
          targetScope: 'root',
          sections: {
            scripts: {
              build: 'turbo run build',
            },
          },
        },
        {
          ownership: frontendPackageTrace,
          targetPath: packageManifestTargetPath('apps/web'),
          targetScope: 'package',
          sections: {
            dependencies: {
              react: '^19.2.6',
            },
          },
        },
        {
          ownership: nodePackageTrace,
          targetPath: packageManifestTargetPath('apps/api'),
          targetScope: 'package',
          sections: {
            dependencies: {
              hono: '^4.13.0',
            },
          },
        },
        {
          ownership: cliPackageTrace,
          targetPath: packageManifestTargetPath('apps/tool'),
          targetScope: 'package',
          fields: {
            bin: {
              tool: './dist/index.js',
            },
          },
        },
        {
          ownership: libraryPackageTrace,
          targetPath: packageManifestTargetPath('libs/shared'),
          targetScope: 'package',
          fields: {
            exports: {
              '.': './src/index.ts',
            },
          },
        },
        {
          ownership: alphaTrace,
          targetPath: packageManifestTargetPath('apps/web'),
          targetScope: 'package',
          sections: {
            dependencies: {
              'react-router': '^7.15.0',
            },
          },
        },
      ],
    })
    const provenance = collections.flatMap(collection => collection.provenance)

    expect(provenance).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetPath: 'package.json',
        owners: ['workspace-bootstrap'],
      }),
      expect.objectContaining({
        targetPath: 'apps/web/package.json',
        key: 'react',
        owners: ['frontend-package'],
      }),
      expect.objectContaining({
        targetPath: 'apps/api/package.json',
        owners: ['node-package'],
      }),
      expect.objectContaining({
        targetPath: 'apps/tool/package.json',
        owners: ['cli-package'],
      }),
      expect.objectContaining({
        targetPath: 'libs/shared/package.json',
        owners: ['library-package'],
      }),
      expect.objectContaining({
        targetPath: 'apps/web/package.json',
        key: 'react-router',
        owners: ['alpha-owner'],
      }),
    ]))
  })
})
