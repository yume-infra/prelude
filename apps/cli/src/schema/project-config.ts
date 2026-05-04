import { ParseResult, Schema } from 'effect'
import { ProjectNameSchema } from '../brand/project-name'

export const ProjectTypeSchema = Schema.Literal('vue', 'react', 'workspace-root', 'node', 'cli').annotations({
  identifier: 'ProjectType',
  title: 'ProjectType',
})

export const WorkspaceRootTypeSchema = Schema.Literal('workspace-root').annotations({
  identifier: 'WorkspaceRootType',
  title: 'WorkspaceRootType',
})

export const WorkspacePackageManagerSchema = Schema.Literal('pnpm').annotations({
  identifier: 'WorkspacePackageManager',
  title: 'WorkspacePackageManager',
})

export const BaseFrontendAppTypeSchema = Schema.Literal('vue', 'react').annotations({
  identifier: 'BaseFrontendAppType',
  title: 'BaseFrontendAppType',
})

export const BuildToolSchema = Schema.Literal('vite', 'none').annotations({
  identifier: 'BuildTool',
  title: 'BuildTool',
})

export const CSSPreprocessorSchema = Schema.Literal('css', 'less', 'sass').annotations({
  identifier: 'CSSPreprocessor',
  title: 'CSSPreprocessor',
})

export const CSSFrameworkSchema = Schema.Literal('tailwind', 'none').annotations({
  identifier: 'CSSFramework',
  title: 'CSSFramework',
})

export const ReactStateManagementSchema = Schema.Literal('zustand', 'jotai', 'none').annotations({
  identifier: 'ReactStateManagement',
  title: 'ReactStateManagement',
})

export const ReactRouterSchema = Schema.Literal('react-router', 'tanstack-router', 'none').annotations({
  identifier: 'ReactRouter',
  title: 'ReactRouter',
})

export const LanguageSchema = Schema.Literal('typescript', 'javascript').annotations({
  identifier: 'Language',
  title: 'Language',
})

export const LintingSchema = Schema.Literal('antfu-eslint', 'none').annotations({
  identifier: 'Linting',
  title: 'Linting',
})

export const CodeQualitySchema = Schema.Literal('lint-staged', 'commitlint').annotations({
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

export const BaseProjectConfigSchema = Schema.Struct(baseProjectConfigFields).annotations({
  identifier: 'BaseProjectConfig',
  title: 'BaseProjectConfig',
})

export const SharedFrontendAppConfigSchema = Schema.Struct(sharedFrontendAppConfigFields).annotations({
  identifier: 'SharedFrontendAppConfig',
  title: 'SharedFrontendAppConfig',
})

export const VueProjectConfigSchema = Schema.Struct({
  ...sharedFrontendAppConfigFields,
  type: Schema.Literal('vue'),
  router: Schema.Boolean,
  stateManagement: Schema.Boolean,
}).annotations({
  identifier: 'VueProjectConfig',
  title: 'VueProjectConfig',
})

export const ReactProjectConfigSchema = Schema.Struct({
  ...sharedFrontendAppConfigFields,
  type: Schema.Literal('react'),
  router: ReactRouterSchema,
  stateManagement: ReactStateManagementSchema,
}).annotations({
  identifier: 'ReactProjectConfig',
  title: 'ReactProjectConfig',
})

export const WorkspaceRootConfigSchema = Schema.Struct({
  ...baseProjectConfigFields,
  type: WorkspaceRootTypeSchema,
  packageManager: Schema.optionalWith(WorkspacePackageManagerSchema, {
    exact: true,
    default: () => 'pnpm' as const,
  }),
}).annotations({
  identifier: 'WorkspaceRootConfig',
  title: 'WorkspaceRootConfig',
})

export const NodeProjectConfigSchema = Schema.Struct({
  ...baseTypeScriptProjectConfigFields,
  type: Schema.Literal('node'),
}).annotations({
  identifier: 'NodeProjectConfig',
  title: 'NodeProjectConfig',
})

export const CliProjectConfigSchema = Schema.Struct({
  ...baseTypeScriptProjectConfigFields,
  type: Schema.Literal('cli'),
}).annotations({
  identifier: 'CliProjectConfig',
  title: 'CliProjectConfig',
})

export const ProjectConfigSchema = Schema.Union(
  VueProjectConfigSchema,
  ReactProjectConfigSchema,
  WorkspaceRootConfigSchema,
  NodeProjectConfigSchema,
  CliProjectConfigSchema,
).annotations({
  identifier: 'ProjectConfig',
  title: 'ProjectConfig',
})

export type ProjectType = Schema.Schema.Type<typeof ProjectTypeSchema>
export type WorkspaceRootType = Schema.Schema.Type<typeof WorkspaceRootTypeSchema>
export type WorkspacePackageManager = Schema.Schema.Type<typeof WorkspacePackageManagerSchema>
export type BaseFrontendAppType = Schema.Schema.Type<typeof BaseFrontendAppTypeSchema>
export type BuildTool = Schema.Schema.Type<typeof BuildToolSchema>
export type CSSPreprocessor = Schema.Schema.Type<typeof CSSPreprocessorSchema>
export type CSSFramework = Schema.Schema.Type<typeof CSSFrameworkSchema>
export type ReactStateManagement = Schema.Schema.Type<typeof ReactStateManagementSchema>
export type ReactRouter = Schema.Schema.Type<typeof ReactRouterSchema>
export type Language = Schema.Schema.Type<typeof LanguageSchema>
export type Linting = Schema.Schema.Type<typeof LintingSchema>
export type CodeQuality = Schema.Schema.Type<typeof CodeQualitySchema>
export type BaseProjectConfig = Schema.Schema.Type<typeof BaseProjectConfigSchema>
export type SharedFrontendAppConfig = Schema.Schema.Type<typeof SharedFrontendAppConfigSchema>
export type VueProjectConfig = Schema.Schema.Type<typeof VueProjectConfigSchema>
export type ReactProjectConfig = Schema.Schema.Type<typeof ReactProjectConfigSchema>
export type WorkspaceRootConfig = Schema.Schema.Type<typeof WorkspaceRootConfigSchema>
export type NodeProjectConfig = Schema.Schema.Type<typeof NodeProjectConfigSchema>
export type CliProjectConfig = Schema.Schema.Type<typeof CliProjectConfigSchema>
export type ProjectConfig = Schema.Schema.Type<typeof ProjectConfigSchema>

export const decodeBaseProjectConfig = Schema.decodeUnknown(BaseProjectConfigSchema, { errors: 'all' })
export const decodeSharedFrontendAppConfig = Schema.decodeUnknown(SharedFrontendAppConfigSchema, { errors: 'all' })
export const decodeVueProjectConfig = Schema.decodeUnknown(VueProjectConfigSchema, { errors: 'all' })
export const decodeReactProjectConfig = Schema.decodeUnknown(ReactProjectConfigSchema, { errors: 'all' })
export const decodeWorkspaceRootConfig = Schema.decodeUnknown(WorkspaceRootConfigSchema, { errors: 'all' })
export const decodeNodeProjectConfig = Schema.decodeUnknown(NodeProjectConfigSchema, { errors: 'all' })
export const decodeCliProjectConfig = Schema.decodeUnknown(CliProjectConfigSchema, { errors: 'all' })
export const decodeProjectConfig = Schema.decodeUnknown(ProjectConfigSchema, { errors: 'all' })

export const formatBaseProjectConfigError = ParseResult.TreeFormatter.formatErrorSync
export const formatSharedFrontendAppConfigError = ParseResult.TreeFormatter.formatErrorSync
export const formatVueProjectConfigError = ParseResult.TreeFormatter.formatErrorSync
export const formatReactProjectConfigError = ParseResult.TreeFormatter.formatErrorSync
export const formatWorkspaceRootConfigError = ParseResult.TreeFormatter.formatErrorSync
export const formatNodeProjectConfigError = ParseResult.TreeFormatter.formatErrorSync
export const formatCliProjectConfigError = ParseResult.TreeFormatter.formatErrorSync
export const formatProjectConfigError = ParseResult.TreeFormatter.formatErrorSync
