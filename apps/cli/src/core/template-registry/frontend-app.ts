import type { Preset } from '@/schema/preset'
import type {
  BuildTool,
  CSSFramework,
  CSSPreprocessor,
  SharedFrontendAppConfig,
} from '@/schema/project-config'
import type { TemplateRegistry } from '@/schema/template-registry'
import { makeTemplatePath } from '@/brand/template-path'
import {
  contributionTrace,
  ContributionUnitKind,
  FrontendScaffoldOwner,
} from '@/core/ownership/model'
import {
  workspaceBootstrapCodeQualityTemplates,
  workspaceBootstrapLintAndGitTemplates,
} from './workspace-bootstrap'

interface SelectOption<T> {
  readonly value: T
  readonly label: string
}

interface FrontendLeafQuestionContract<T> {
  readonly message: string
  readonly options: readonly SelectOption<T>[]
}

type SharedFrontendPolicy = Pick<
  SharedFrontendAppConfig,
  'buildTool' | 'cssPreprocessor' | 'cssFramework'
>
type FrontendPreset = Extract<Preset, 'react-minimal' | 'react-full' | 'vue-minimal' | 'vue-full'>

const frontendFragmentRender = contributionTrace(
  FrontendScaffoldOwner,
  ContributionUnitKind.FragmentRender,
)

export const sharedFrontendQuestionContracts = {
  buildTool: {
    message: 'choose build tool:',
    options: [
      { value: 'vite', label: 'vite' },
      { value: 'none', label: 'none' },
    ],
  } satisfies FrontendLeafQuestionContract<BuildTool>,
  cssPreprocessor: {
    message: 'Choose a CSS preprocessor:',
    options: [
      { value: 'css', label: 'CSS' },
      { value: 'less', label: 'Less' },
      { value: 'sass', label: 'Sass/SCSS' },
    ],
  } satisfies FrontendLeafQuestionContract<CSSPreprocessor>,
  cssFramework: {
    message: 'choose css framework:',
    options: [
      { value: 'tailwind', label: 'Tailwind CSS' },
      { value: 'none', label: 'None' },
    ],
  } satisfies FrontendLeafQuestionContract<CSSFramework>,
} as const

const sharedFrontendPresetDefaults: Record<
  FrontendPreset,
  SharedFrontendPolicy
> = {
  'react-minimal': {
    buildTool: 'vite',
    cssPreprocessor: 'less',
    cssFramework: 'none',
  },
  'react-full': {
    buildTool: 'vite',
    cssPreprocessor: 'less',
    cssFramework: 'tailwind',
  },
  'vue-minimal': {
    buildTool: 'vite',
    cssPreprocessor: 'less',
    cssFramework: 'none',
  },
  'vue-full': {
    buildTool: 'vite',
    cssPreprocessor: 'less',
    cssFramework: 'tailwind',
  },
}

export function getSharedFrontendPresetDefaults(
  preset: FrontendPreset,
): SharedFrontendPolicy {
  return sharedFrontendPresetDefaults[preset]
}

export const sharedFrontendTemplates: TemplateRegistry<SharedFrontendAppConfig>
  = {
    'index.html': {
      template: makeTemplatePath('fragments/common/index.html.hbs'),
      target: 'index.html',
      condition: () => true,
      ownership: frontendFragmentRender,
    },

    'vite.config.ts': {
      template: makeTemplatePath('fragments/common/vite.config.ts.hbs'),
      target: config =>
        `vite.config.${config.language === 'typescript' ? 'ts' : 'js'}`,
      condition: config => config.buildTool === 'vite',
      ownership: frontendFragmentRender,
    },

    'tsconfig.json': {
      template: makeTemplatePath('fragments/common/ts/tsconfig.json.hbs'),
      target: 'tsconfig.json',
      condition: config => config.language === 'typescript',
      ownership: frontendFragmentRender,
    },
    'tsconfig.node.json': {
      template: makeTemplatePath('fragments/common/ts/tsconfig.node.json.hbs'),
      target: 'tsconfig.node.json',
      condition: config =>
        config.language === 'typescript' && config.buildTool === 'vite',
      ownership: frontendFragmentRender,
    },
    'tsconfig.app.json': {
      template: makeTemplatePath('fragments/common/ts/tsconfig.app.json.hbs'),
      target: 'tsconfig.app.json',
      condition: config => config.language === 'typescript',
      ownership: frontendFragmentRender,
    },

    'vite-env.d.ts': {
      template: makeTemplatePath('fragments/common/ts/vite-env.d.ts.hbs'),
      target: 'src/vite-env.d.ts',
      condition: config =>
        config.language === 'typescript' && config.buildTool === 'vite',
      ownership: frontendFragmentRender,
    },

    'README.md': {
      template: makeTemplatePath('fragments/common/README.md.hbs'),
      target: 'README.md',
      condition: () => true,
      ownership: frontendFragmentRender,
    },

    'style.css': {
      template: makeTemplatePath('fragments/common/css/style.css.hbs'),
      target: config =>
        `src/style.${config.cssPreprocessor === 'css' ? 'css' : config.cssPreprocessor === 'less' ? 'less' : 'scss'}`,
      condition: () => true,
      ownership: frontendFragmentRender,
    },
  }

function pickTemplateRegistryEntries<T>(
  registry: TemplateRegistry<T>,
  keys: readonly string[],
): TemplateRegistry<T> {
  return Object.fromEntries(
    keys.map(key => [key, registry[key]!]),
  ) as TemplateRegistry<T>
}

const sharedFrontendCoreTemplates = pickTemplateRegistryEntries(
  sharedFrontendTemplates,
  [
    'index.html',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.node.json',
    'tsconfig.app.json',
    'vite-env.d.ts',
  ],
)

const sharedFrontendFinishingTemplates = pickTemplateRegistryEntries(
  sharedFrontendTemplates,
  ['README.md', 'style.css'],
)

export function assembleFrontendFamilyTemplates<
  T extends SharedFrontendAppConfig,
>(familyLocalTemplates: TemplateRegistry<T>): TemplateRegistry<T> {
  return {
    ...(sharedFrontendCoreTemplates as TemplateRegistry<T>),
    ...(workspaceBootstrapLintAndGitTemplates as TemplateRegistry<T>),
    ...(sharedFrontendFinishingTemplates as TemplateRegistry<T>),
    ...(workspaceBootstrapCodeQualityTemplates as TemplateRegistry<T>),
    ...familyLocalTemplates,
  }
}
