import { ParseResult, Schema } from 'effect'
import { PackageNameSchema } from '@/brand/package-name'

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
    framework: Schema.Literal('react', 'vue'),
    buildTool: Schema.Literal('vite', 'none'),
    cssPreprocessor: Schema.Literal('css', 'less', 'sass'),
    cssFramework: Schema.Literal('tailwind', 'none'),
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

export const CliToolkitSchema = Schema.Literal('none', 'effect').annotations({
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

export type PackageKind = Schema.Schema.Type<typeof PackageKindSchema>
export type RuntimeKind = Schema.Schema.Type<typeof RuntimeKindSchema>
export type PackageId = Schema.Schema.Type<typeof PackageIdSchema>
export type InternalDependencyTarget = Schema.Schema.Type<typeof InternalDependencyTargetSchema>
export type InternalDependencyLink = Schema.Schema.Type<typeof InternalDependencyLinkSchema>
export type FrontendAppSpec = Schema.Schema.Type<typeof FrontendAppSpecSchema>
export type BackendAppSpec = Schema.Schema.Type<typeof BackendAppSpecSchema>
export type WorkerAppSpec = Schema.Schema.Type<typeof WorkerAppSpecSchema>
export type CliToolkit = Schema.Schema.Type<typeof CliToolkitSchema>
export type CliToolSpec = Schema.Schema.Type<typeof CliToolSpecSchema>
export type LibraryPackageSpec = Schema.Schema.Type<typeof LibraryPackageSpecSchema>
export type GenerationPackageSpec = Schema.Schema.Type<typeof GenerationPackageSpecSchema>

export const decodeGenerationPackageSpec = Schema.decodeUnknown(GenerationPackageSpecSchema, { errors: 'all' })

export const formatGenerationPackageSpecError = ParseResult.TreeFormatter.formatErrorSync

export const makePackageId = (value: string): PackageId => Schema.decodeUnknownSync(PackageIdSchema)(value)
