import type { ReactProjectConfig, VueProjectConfig } from './project-config'
import { ParseResult, Schema } from 'effect'
import { makePackageName, PackageNameSchema } from '@/brand/package-name'
import {
  BaseFrontendAppTypeSchema,
  BuildToolSchema,
  CSSFrameworkSchema,
  CSSPreprocessorSchema,
} from './project-config'

export const GenerationShapeSchema = Schema.Literal('standalone', 'workspace').annotations({
  identifier: 'GenerationShape',
  title: 'GenerationShape',
})

export const PackageKindSchema = Schema.Literal(
  'frontend-app',
  'backend-app',
  'worker-app',
  'cli-tool',
  'library-package',
).annotations({
  identifier: 'PackageKind',
  title: 'PackageKind',
})

export const RuntimeKindSchema = Schema.Literal('browser', 'node', 'neutral').annotations({
  identifier: 'RuntimeKind',
  title: 'RuntimeKind',
})

export const PackageIdPattern = /^[\w-]+$/

export const PackageIdSchema = Schema.String.pipe(
  Schema.pattern(PackageIdPattern),
  Schema.brand('PackageId'),
  Schema.annotations({
    identifier: 'PackageId',
    title: 'PackageId',
  }),
)

export const InternalDependencyTargetSchema = Schema.Union(
  Schema.Struct({
    by: Schema.Literal('id'),
    id: PackageIdSchema,
  }),
  Schema.Struct({
    by: Schema.Literal('name'),
    name: PackageNameSchema,
  }),
).annotations({
  identifier: 'InternalDependencyTarget',
  title: 'InternalDependencyTarget',
})

export const InternalDependencyLinkSchema = Schema.Struct({
  target: InternalDependencyTargetSchema,
  alias: Schema.optionalWith(PackageNameSchema, { exact: true }),
}).annotations({
  identifier: 'InternalDependencyLink',
  title: 'InternalDependencyLink',
})

const packageSpecBaseFields = {
  id: PackageIdSchema,
  name: PackageNameSchema,
  internalDependencies: Schema.optionalWith(Schema.Array(InternalDependencyLinkSchema), {
    exact: true,
    default: () => [],
  }),
}

export const FrontendAppSpecSchema = Schema.Struct({
  ...packageSpecBaseFields,
  kind: Schema.Literal('frontend-app'),
  runtime: Schema.optionalWith(Schema.Literal('browser'), {
    exact: true,
    default: () => 'browser' as const,
  }),
  frontend: Schema.Struct({
    framework: BaseFrontendAppTypeSchema,
    buildTool: BuildToolSchema,
    cssPreprocessor: CSSPreprocessorSchema,
    cssFramework: CSSFrameworkSchema,
  }),
}).annotations({
  identifier: 'FrontendAppSpec',
  title: 'FrontendAppSpec',
})

export const BackendAppFrameworkSchema = Schema.Literal('none').annotations({
  identifier: 'BackendAppFramework',
  title: 'BackendAppFramework',
})

export const BackendAppSpecSchema = Schema.Struct({
  ...packageSpecBaseFields,
  kind: Schema.Literal('backend-app'),
  runtime: Schema.optionalWith(Schema.Literal('node'), {
    exact: true,
    default: () => 'node' as const,
  }),
  backend: Schema.Struct({
    framework: BackendAppFrameworkSchema,
  }),
}).annotations({
  identifier: 'BackendAppSpec',
  title: 'BackendAppSpec',
})

export const WorkerToolkitSchema = Schema.Literal('none').annotations({
  identifier: 'WorkerToolkit',
  title: 'WorkerToolkit',
})

export const WorkerAppSpecSchema = Schema.Struct({
  ...packageSpecBaseFields,
  kind: Schema.Literal('worker-app'),
  runtime: Schema.optionalWith(Schema.Literal('node'), {
    exact: true,
    default: () => 'node' as const,
  }),
  worker: Schema.Struct({
    toolkit: WorkerToolkitSchema,
  }),
}).annotations({
  identifier: 'WorkerAppSpec',
  title: 'WorkerAppSpec',
})

export const CliToolkitSchema = Schema.Literal('none').annotations({
  identifier: 'CliToolkit',
  title: 'CliToolkit',
})

export const CliToolSpecSchema = Schema.Struct({
  ...packageSpecBaseFields,
  kind: Schema.Literal('cli-tool'),
  runtime: Schema.optionalWith(Schema.Literal('node'), {
    exact: true,
    default: () => 'node' as const,
  }),
  cli: Schema.Struct({
    toolkit: CliToolkitSchema,
  }),
}).annotations({
  identifier: 'CliToolSpec',
  title: 'CliToolSpec',
})

export const LibraryToolkitSchema = Schema.Literal('none').annotations({
  identifier: 'LibraryToolkit',
  title: 'LibraryToolkit',
})

export const LibraryPackageSpecSchema = Schema.Struct({
  ...packageSpecBaseFields,
  kind: Schema.Literal('library-package'),
  runtime: Schema.optionalWith(Schema.Literal('neutral', 'node'), {
    exact: true,
    default: () => 'neutral' as const,
  }),
  library: Schema.Struct({
    toolkit: LibraryToolkitSchema,
  }),
}).annotations({
  identifier: 'LibraryPackageSpec',
  title: 'LibraryPackageSpec',
})

export const GenerationPackageSpecSchema = Schema.Union(
  FrontendAppSpecSchema,
  BackendAppSpecSchema,
  WorkerAppSpecSchema,
  CliToolSpecSchema,
  LibraryPackageSpecSchema,
).annotations({
  identifier: 'GenerationPackageSpec',
  title: 'GenerationPackageSpec',
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
export type PackageKind = Schema.Schema.Type<typeof PackageKindSchema>
export type RuntimeKind = Schema.Schema.Type<typeof RuntimeKindSchema>
export type PackageId = Schema.Schema.Type<typeof PackageIdSchema>
export type InternalDependencyTarget = Schema.Schema.Type<typeof InternalDependencyTargetSchema>
export type InternalDependencyLink = Schema.Schema.Type<typeof InternalDependencyLinkSchema>
export type FrontendAppSpec = Schema.Schema.Type<typeof FrontendAppSpecSchema>
export type BackendAppSpec = Schema.Schema.Type<typeof BackendAppSpecSchema>
export type WorkerAppSpec = Schema.Schema.Type<typeof WorkerAppSpecSchema>
export type CliToolSpec = Schema.Schema.Type<typeof CliToolSpecSchema>
export type LibraryPackageSpec = Schema.Schema.Type<typeof LibraryPackageSpecSchema>
export type GenerationPackageSpec = Schema.Schema.Type<typeof GenerationPackageSpecSchema>
export type StandaloneCreateSpec = Schema.Schema.Type<typeof StandaloneCreateSpecSchema>
export type WorkspaceCreateSpec = Schema.Schema.Type<typeof WorkspaceCreateSpecSchema>
export type CreateSpec = Schema.Schema.Type<typeof CreateSpecSchema>

export const decodeCreateSpec = Schema.decodeUnknown(CreateSpecSchema, { errors: 'all' })
export const decodeGenerationPackageSpec = Schema.decodeUnknown(GenerationPackageSpecSchema, { errors: 'all' })

export const formatCreateSpecError = ParseResult.TreeFormatter.formatErrorSync
export const formatGenerationPackageSpecError = ParseResult.TreeFormatter.formatErrorSync

export const makePackageId = (value: string): PackageId => Schema.decodeUnknownSync(PackageIdSchema)(value)

export function projectConfigToCreateSpec(config: ReactProjectConfig | VueProjectConfig): StandaloneCreateSpec {
  return {
    shape: 'standalone',
    package: {
      id: makePackageId(config.name),
      name: makePackageName(config.name),
      kind: 'frontend-app',
      runtime: 'browser',
      internalDependencies: [],
      frontend: {
        framework: config.type,
        buildTool: config.buildTool,
        cssPreprocessor: config.cssPreprocessor,
        cssFramework: config.cssFramework,
      },
    },
  }
}
