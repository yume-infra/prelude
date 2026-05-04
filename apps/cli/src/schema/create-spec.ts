import type { ProjectConfig } from './project-config'
import { ParseResult, Schema } from 'effect'
import { makePackageName } from '@/brand/package-name'
import {
  GenerationPackageSpecSchema,
  makePackageId,
} from './generation-package-spec'

export {
  BackendAppFrameworkSchema,
  BackendAppSpecSchema,
  CliToolkitSchema,
  CliToolSpecSchema,
  decodeGenerationPackageSpec,
  formatGenerationPackageSpecError,
  FrontendAppSpecSchema,
  GenerationPackageSpecSchema,
  InternalDependencyLinkSchema,
  InternalDependencyTargetSchema,
  LibraryPackageSpecSchema,
  LibraryToolkitSchema,
  makePackageId,
  PackageIdSchema,
  PackageKindSchema,
  RuntimeKindSchema,
  WorkerAppSpecSchema,
  WorkerToolkitSchema,
} from './generation-package-spec'

export type {
  BackendAppSpec,
  CliToolSpec,
  FrontendAppSpec,
  GenerationPackageSpec,
  InternalDependencyLink,
  InternalDependencyTarget,
  LibraryPackageSpec,
  PackageId,
  PackageKind,
  RuntimeKind,
  WorkerAppSpec,
} from './generation-package-spec'

export const GenerationShapeSchema = Schema.Literal('standalone', 'workspace').annotations({
  identifier: 'GenerationShape',
  title: 'GenerationShape',
})

export const StandaloneCreateSpecSchema = Schema.Struct({
  shape: Schema.Literal('standalone'),
  package: GenerationPackageSpecSchema,
}).annotations({
  identifier: 'StandaloneCreateSpec',
  title: 'StandaloneCreateSpec',
})

export const WorkspaceCreateSpecSchema = Schema.Struct({
  shape: Schema.Literal('workspace'),
  packages: Schema.Array(GenerationPackageSpecSchema),
}).annotations({
  identifier: 'WorkspaceCreateSpec',
  title: 'WorkspaceCreateSpec',
})

export const CreateSpecSchema = Schema.Union(
  StandaloneCreateSpecSchema,
  WorkspaceCreateSpecSchema,
).annotations({
  identifier: 'CreateSpec',
  title: 'CreateSpec',
})

export type GenerationShape = Schema.Schema.Type<typeof GenerationShapeSchema>
export type StandaloneCreateSpec = Schema.Schema.Type<typeof StandaloneCreateSpecSchema>
export type WorkspaceCreateSpec = Schema.Schema.Type<typeof WorkspaceCreateSpecSchema>
export type CreateSpec = Schema.Schema.Type<typeof CreateSpecSchema>

export const decodeCreateSpec = Schema.decodeUnknown(CreateSpecSchema, { errors: 'all' })

export const formatCreateSpecError = ParseResult.TreeFormatter.formatErrorSync

export function projectConfigToCreateSpec(config: ProjectConfig): CreateSpec {
  const base = {
    id: makePackageId(config.name),
    name: makePackageName(config.name),
    internalDependencies: [],
  }

  switch (config.type) {
    case 'react':
    case 'vue':
      return {
        shape: 'standalone',
        package: {
          ...base,
          kind: 'frontend-app',
          runtime: 'browser',
          frontend: {
            framework: config.type,
            buildTool: config.buildTool,
            cssPreprocessor: config.cssPreprocessor,
            cssFramework: config.cssFramework,
          },
        },
      }
    case 'node':
      return {
        shape: 'standalone',
        package: {
          ...base,
          kind: 'backend-app',
          runtime: 'node',
          backend: {
            framework: 'none',
          },
        },
      }
    case 'cli':
      return {
        shape: 'standalone',
        package: {
          ...base,
          kind: 'cli-tool',
          runtime: 'node',
          cli: {
            toolkit: 'none',
          },
        },
      }
    case 'workspace-root':
      return {
        shape: 'workspace',
        packages: config.packages,
      }
    case 'library':
      return {
        shape: 'standalone',
        package: {
          ...base,
          kind: 'library-package',
          runtime: config.runtime,
          library: {
            toolkit: 'none',
          },
        },
      }
    default: {
      const exhaustive: never = config
      return exhaustive
    }
  }
}
