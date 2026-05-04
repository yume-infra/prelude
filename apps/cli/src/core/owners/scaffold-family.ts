import type { PackageManifestContribution } from '@/core/modifier/package-manifest-contributions'
import type { ProjectConfig } from '@/schema/project-config'
import {
  contributionTrace,
  ContributionUnitKind,
  FrontendScaffoldOwner,
  ReactScaffoldOwner,
  VueScaffoldOwner,
} from '@/core/ownership/model'
import { isFrontendProject, isReactProject, isVueProject } from '@/utils/type-guard'

export const frontendScaffoldPackageJsonMutation = contributionTrace(
  FrontendScaffoldOwner,
  ContributionUnitKind.JsonTextMutation,
)
export const reactScaffoldPackageJsonMutation = contributionTrace(
  ReactScaffoldOwner,
  ContributionUnitKind.JsonTextMutation,
)
export const vueScaffoldPackageJsonMutation = contributionTrace(
  VueScaffoldOwner,
  ContributionUnitKind.JsonTextMutation,
)

function packageContribution(options: {
  readonly ownership: PackageManifestContribution['ownership']
  readonly sections: NonNullable<PackageManifestContribution['sections']>
}): PackageManifestContribution {
  return options
}

export function getScaffoldFamilyPackageContributions(config: ProjectConfig): PackageManifestContribution[] {
  const contributions: PackageManifestContribution[] = []

  if (config.language === 'typescript') {
    contributions.push(packageContribution({
      ownership: frontendScaffoldPackageJsonMutation,
      sections: {
        devDependencies: { typescript: '^6.0.3' },
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
          dependencies: { '@vitejs/plugin-vue': '^6.0.6', '@vue/compiler-sfc': '^3.5.32' },
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
        dependencies: { 'react': '^19.2.5', 'react-dom': '^19.2.5' },
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
