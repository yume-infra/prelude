import { ParseResult, Schema } from 'effect'
import { ProjectNameSchema } from '../brand/project-name'
import { CliToolkitSchema, GenerationPackageSpecSchema } from './generation-package-spec'

const WorkspaceRootTypeSchema = Schema.Literal('workspace-root').annotations({
  identifier: 'WorkspaceRootType',
  title: 'WorkspaceRootType',
})

const WorkspacePackageManagerSchema = Schema.Literal('pnpm').annotations({
  identifier: 'WorkspacePackageManager',
  title: 'WorkspacePackageManager',
})

const BaseFrontendAppTypeSchema = Schema.Literal('vue', 'react').annotations({
  identifier: 'BaseFrontendAppType',
  title: 'BaseFrontendAppType',
})

const BuildToolSchema = Schema.Literal('vite', 'none').annotations({
  identifier: 'BuildTool',
  title: 'BuildTool',
})

const CSSPreprocessorSchema = Schema.Literal('css', 'less', 'sass').annotations({
  identifier: 'CSSPreprocessor',
  title: 'CSSPreprocessor',
})

const CSSFrameworkSchema = Schema.Literal('tailwind', 'none').annotations({
  identifier: 'CSSFramework',
  title: 'CSSFramework',
})

const ReactStateManagementSchema = Schema.Literal('zustand', 'jotai', 'none').annotations({
  identifier: 'ReactStateManagement',
  title: 'ReactStateManagement',
})

const ReactRouterSchema = Schema.Literal('react-router', 'tanstack-router', 'none').annotations({
  identifier: 'ReactRouter',
  title: 'ReactRouter',
})

const LanguageSchema = Schema.Literal('typescript', 'javascript').annotations({
  identifier: 'Language',
  title: 'Language',
})

const LintingSchema = Schema.Literal('antfu-eslint', 'none').annotations({
  identifier: 'Linting',
  title: 'Linting',
})

const CodeQualitySchema = Schema.Literal('lint-staged', 'commitlint').annotations({
  identifier: 'CodeQuality',
  title: 'CodeQuality',
})

const baseProjectConfigFields = {
  name: ProjectNameSchema,
  language: LanguageSchema,
  git: Schema.Boolean,
  linting: LintingSchema,
  codeQuality: Schema.Array(CodeQualitySchema),
}

const baseTypeScriptProjectConfigFields = {
  ...baseProjectConfigFields,
  language: Schema.Literal('typescript'),
}

const sharedFrontendAppConfigFields = {
  ...baseProjectConfigFields,
  type: BaseFrontendAppTypeSchema,
  buildTool: BuildToolSchema,
  cssPreprocessor: CSSPreprocessorSchema,
  cssFramework: CSSFrameworkSchema,
}

const SharedFrontendAppConfigSchema = Schema.Struct(sharedFrontendAppConfigFields).annotations({
  identifier: 'SharedFrontendAppConfig',
  title: 'SharedFrontendAppConfig',
})

const VueProjectConfigSchema = Schema.Struct({
  ...sharedFrontendAppConfigFields,
  type: Schema.Literal('vue'),
  router: Schema.Boolean,
  stateManagement: Schema.Boolean,
}).annotations({
  identifier: 'VueProjectConfig',
  title: 'VueProjectConfig',
})

const ReactProjectConfigSchema = Schema.Struct({
  ...sharedFrontendAppConfigFields,
  type: Schema.Literal('react'),
  router: ReactRouterSchema,
  stateManagement: ReactStateManagementSchema,
}).annotations({
  identifier: 'ReactProjectConfig',
  title: 'ReactProjectConfig',
})

const WorkspaceRootConfigSchema = Schema.Struct({
  ...baseProjectConfigFields,
  type: WorkspaceRootTypeSchema,
  packageManager: Schema.optionalWith(WorkspacePackageManagerSchema, {
    exact: true,
    default: () => 'pnpm' as const,
  }),
  packages: Schema.optionalWith(Schema.Array(GenerationPackageSpecSchema), {
    exact: true,
    default: () => [],
  }),
}).annotations({
  identifier: 'WorkspaceRootConfig',
  title: 'WorkspaceRootConfig',
})

const NodeProjectConfigSchema = Schema.Struct({
  ...baseTypeScriptProjectConfigFields,
  type: Schema.Literal('node'),
}).annotations({
  identifier: 'NodeProjectConfig',
  title: 'NodeProjectConfig',
})

const CliProjectConfigSchema = Schema.Struct({
  ...baseTypeScriptProjectConfigFields,
  type: Schema.Literal('cli'),
  toolkit: Schema.optionalWith(CliToolkitSchema, {
    exact: true,
    default: () => 'none' as const,
  }),
}).annotations({
  identifier: 'CliProjectConfig',
  title: 'CliProjectConfig',
})

const LibraryProjectConfigSchema = Schema.Struct({
  ...baseTypeScriptProjectConfigFields,
  type: Schema.Literal('library'),
  runtime: Schema.optionalWith(Schema.Literal('neutral', 'node'), {
    exact: true,
    default: () => 'neutral' as const,
  }),
}).annotations({
  identifier: 'LibraryProjectConfig',
  title: 'LibraryProjectConfig',
})

const ProjectConfigSchema = Schema.Union(
  VueProjectConfigSchema,
  ReactProjectConfigSchema,
  WorkspaceRootConfigSchema,
  NodeProjectConfigSchema,
  CliProjectConfigSchema,
  LibraryProjectConfigSchema,
).annotations({
  identifier: 'ProjectConfig',
  title: 'ProjectConfig',
})

export type ProjectType = 'vue' | 'react' | 'workspace-root' | 'node' | 'cli'
export type BuildTool = Schema.Schema.Type<typeof BuildToolSchema>
export type CSSPreprocessor = Schema.Schema.Type<typeof CSSPreprocessorSchema>
export type CSSFramework = Schema.Schema.Type<typeof CSSFrameworkSchema>
export type ReactStateManagement = Schema.Schema.Type<typeof ReactStateManagementSchema>
export type ReactRouter = Schema.Schema.Type<typeof ReactRouterSchema>
export type Language = Schema.Schema.Type<typeof LanguageSchema>
export type Linting = Schema.Schema.Type<typeof LintingSchema>
export type CodeQuality = Schema.Schema.Type<typeof CodeQualitySchema>
export type CliToolkit = Schema.Schema.Type<typeof CliToolkitSchema>
export interface BaseProjectConfig {
  readonly name: Schema.Schema.Type<typeof ProjectNameSchema>
  readonly language: Language
  readonly git: boolean
  readonly linting: Linting
  readonly codeQuality: readonly CodeQuality[]
}
export type SharedFrontendAppConfig = Schema.Schema.Type<typeof SharedFrontendAppConfigSchema>
export type VueProjectConfig = Schema.Schema.Type<typeof VueProjectConfigSchema>
export type ReactProjectConfig = Schema.Schema.Type<typeof ReactProjectConfigSchema>
export type WorkspaceRootConfig = Schema.Schema.Type<typeof WorkspaceRootConfigSchema>
export type NodeProjectConfig = Schema.Schema.Type<typeof NodeProjectConfigSchema>
export type CliProjectConfig = Schema.Schema.Type<typeof CliProjectConfigSchema>
export type LibraryProjectConfig = Schema.Schema.Type<typeof LibraryProjectConfigSchema>
export type ProjectConfig = Schema.Schema.Type<typeof ProjectConfigSchema>

export const decodeSharedFrontendAppConfig = Schema.decodeUnknown(SharedFrontendAppConfigSchema, { errors: 'all' })
export const decodeWorkspaceRootConfig = Schema.decodeUnknown(WorkspaceRootConfigSchema, { errors: 'all' })
export const decodeLibraryProjectConfig = Schema.decodeUnknown(LibraryProjectConfigSchema, { errors: 'all' })
export const decodeProjectConfig = Schema.decodeUnknown(ProjectConfigSchema, { errors: 'all' })

export const formatProjectConfigError = ParseResult.TreeFormatter.formatErrorSync
