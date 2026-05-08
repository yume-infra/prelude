import type { PackageManifestContribution } from '@/core/modifier/package-manifest-contributions'
import type { ProjectConfig } from '@/schema/project-config'
import {
  CliScaffoldOwner,
  contributionTrace,
  ContributionUnitKind,
  FrontendScaffoldOwner,
  LibraryPackageOwner,
  NodeScaffoldOwner,
  ReactScaffoldOwner,
  VueScaffoldOwner,
} from '@/core/ownership/model'
import { isCliProject, isFrontendProject, isLibraryProject, isNodeProject, isReactProject, isVueProject } from '@/utils/type-guard'

const frontendScaffoldPackageJsonMutation = contributionTrace(
  FrontendScaffoldOwner,
  ContributionUnitKind.JsonTextMutation,
)
const reactScaffoldPackageJsonMutation = contributionTrace(
  ReactScaffoldOwner,
  ContributionUnitKind.JsonTextMutation,
)
const vueScaffoldPackageJsonMutation = contributionTrace(
  VueScaffoldOwner,
  ContributionUnitKind.JsonTextMutation,
)
const nodeScaffoldPackageJsonMutation = contributionTrace(
  NodeScaffoldOwner,
  ContributionUnitKind.JsonTextMutation,
)
const cliScaffoldPackageJsonMutation = contributionTrace(
  CliScaffoldOwner,
  ContributionUnitKind.JsonTextMutation,
)
const libraryPackageJsonMutation = contributionTrace(
  LibraryPackageOwner,
  ContributionUnitKind.JsonTextMutation,
)

const distPackageExports = {
  '.': {
    types: './dist/index.d.ts',
    import: './dist/index.js',
  },
} as const

const distPackageEntryFields = {
  exports: distPackageExports,
  main: 'dist/index.js',
  types: 'dist/index.d.ts',
  files: ['dist'],
} as const

const distPackageLifecycleScripts = {
  prepack: 'pnpm build',
} as const

function packageContribution(options: PackageManifestContribution): PackageManifestContribution {
  return {
    ...options,
    targetScope: options.targetScope ?? 'package',
  }
}

export function getScaffoldFamilyPackageContributions(config: ProjectConfig): PackageManifestContribution[] {
  const contributions: PackageManifestContribution[] = []

  if (isFrontendProject(config) && config.language === 'typescript') {
    contributions.push(packageContribution({
      ownership: frontendScaffoldPackageJsonMutation,
      sections: {
        devDependencies: { typescript: '^6.0.3' },
      },
    }))
  }

  if (isNodeProject(config)) {
    contributions.push(packageContribution({
      ownership: nodeScaffoldPackageJsonMutation,
      fields: {
        ...distPackageEntryFields,
      },
      sections: {
        scripts: {
          build: 'tsdown --config tsdown.config.ts',
          ...distPackageLifecycleScripts,
          start: 'node dist/index.js',
          typecheck: 'tsc --noEmit',
        },
        devDependencies: {
          '@types/node': '^25.6.0',
          'tsdown': '^0.21.10',
          'typescript': '^6.0.3',
        },
      },
    }))
  }

  if (isCliProject(config)) {
    contributions.push(packageContribution({
      ownership: cliScaffoldPackageJsonMutation,
      fields: {
        ...distPackageEntryFields,
        bin: {
          [config.name]: 'dist/index.js',
        },
      },
      sections: {
        scripts: {
          'build': 'tsdown --config tsdown.config.ts && node scripts/ensure-shebang.mjs',
          ...distPackageLifecycleScripts,
          'smoke:bin': 'pnpm build && dist/index.js --help',
          'typecheck': 'tsc --noEmit',
        },
        devDependencies: {
          '@types/node': '^25.6.0',
          'tsdown': '^0.21.10',
          'typescript': '^6.0.3',
        },
      },
    }))

    if (config.toolkit === 'effect') {
      contributions.push(packageContribution({
        ownership: cliScaffoldPackageJsonMutation,
        sections: {
          dependencies: {
            '@effect/cli': '^0.75.1',
            '@effect/platform': '^0.96.1',
            '@effect/platform-node': '^0.106.0',
            '@effect/printer': '^0.49.0',
            '@effect/printer-ansi': '^0.49.0',
            'effect': '^3.21.2',
          },
        },
      }))
    }
  }

  if (isLibraryProject(config)) {
    contributions.push(packageContribution({
      ownership: libraryPackageJsonMutation,
      fields: {
        ...distPackageEntryFields,
      },
      sections: {
        scripts: {
          build: 'tsdown --config tsdown.config.ts',
          ...distPackageLifecycleScripts,
          typecheck: 'tsc --noEmit',
        },
        devDependencies: {
          ...(config.runtime === 'node' ? { '@types/node': '^25.6.0' } : {}),
          tsdown: '^0.21.10',
          typescript: '^6.0.3',
        },
      },
    }))
  }

  if (!isFrontendProject(config)) {
    return contributions
  }

  if (config.buildTool === 'vite') {
    contributions.push(packageContribution({
      ownership: frontendScaffoldPackageJsonMutation,
      sections: {
        dependencies: { vite: '^8.0.9' },
        scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
      },
    }))
  }

  if (config.cssPreprocessor === 'sass') {
    contributions.push(packageContribution({
      ownership: frontendScaffoldPackageJsonMutation,
      sections: {
        devDependencies: { sass: '^1.99.0' },
      },
    }))
  }

  if (config.cssPreprocessor === 'less') {
    contributions.push(packageContribution({
      ownership: frontendScaffoldPackageJsonMutation,
      sections: {
        devDependencies: { less: '^4.6.4' },
      },
    }))
  }

  if (config.cssFramework === 'tailwind') {
    contributions.push(packageContribution({
      ownership: frontendScaffoldPackageJsonMutation,
      sections: {
        dependencies: { 'tailwindcss': '^4.2.4', '@tailwindcss/vite': '^4.2.4' },
      },
    }))
  }

  if (isVueProject(config)) {
    if (config.language === 'typescript') {
      contributions.push(packageContribution({
        ownership: vueScaffoldPackageJsonMutation,
        sections: {
          devDependencies: { '@vue/tsconfig': '^0.9.1' },
        },
      }))
    }

    if (config.buildTool === 'vite') {
      contributions.push(packageContribution({
        ownership: vueScaffoldPackageJsonMutation,
        sections: {
          dependencies: { '@vitejs/plugin-vue': '^6.0.6', '@vue/compiler-sfc': '^3.5.34' },
        },
      }))
    }

    contributions.push(packageContribution({
      ownership: vueScaffoldPackageJsonMutation,
      sections: {
        dependencies: { vue: '^3.5.32' },
      },
    }))
  }
  else if (isReactProject(config)) {
    contributions.push(packageContribution({
      ownership: reactScaffoldPackageJsonMutation,
      sections: {
        dependencies: { 'react': '^19.2.6', 'react-dom': '^19.2.6' },
      },
    }))

    if (config.buildTool === 'vite') {
      contributions.push(packageContribution({
        ownership: reactScaffoldPackageJsonMutation,
        sections: {
          dependencies: { '@vitejs/plugin-react': '^6.0.1' },
        },
      }))
    }

    if (config.linting === 'antfu-eslint') {
      contributions.push(packageContribution({
        ownership: reactScaffoldPackageJsonMutation,
        sections: {
          devDependencies: {
            '@eslint-react/eslint-plugin': '^3.0.0',
            'eslint-plugin-react-hooks': '^7.1.1',
            'eslint-plugin-react-refresh': '^0.5.2',
          },
        },
      }))
    }

    if (config.language === 'typescript') {
      contributions.push(packageContribution({
        ownership: reactScaffoldPackageJsonMutation,
        sections: {
          devDependencies: { '@types/react': '^19.2.14', '@types/react-dom': '^19.2.3' },
        },
      }))
    }
  }

  return contributions
}
