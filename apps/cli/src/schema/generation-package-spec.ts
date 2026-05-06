import { Schema } from 'effect'
import { PackageNameSchema } from '@/brand/package-name'

const PackageIdPattern = /^[\w-]+$/

const PackageIdSchema = Schema.String.pipe(
  Schema.pattern(PackageIdPattern),
  Schema.brand('PackageId'),
  Schema.annotations({
    identifier: 'PackageId',
    title: 'PackageId',
  }),
)

const InternalDependencyTargetSchema = Schema.Union(
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

const InternalDependencyLinkSchema = Schema.Struct({
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

const FrontendAppSpecSchema = Schema.Struct({
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

const BackendAppFrameworkSchema = Schema.Literal('none').annotations({
  identifier: 'BackendAppFramework',
  title: 'BackendAppFramework',
})

const BackendAppSpecSchema = Schema.Struct({
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

const WorkerToolkitSchema = Schema.Literal('none').annotations({
  identifier: 'WorkerToolkit',
  title: 'WorkerToolkit',
})

const WorkerAppSpecSchema = Schema.Struct({
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

const CliToolSpecSchema = Schema.Struct({
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

const LibraryToolkitSchema = Schema.Literal('none').annotations({
  identifier: 'LibraryToolkit',
  title: 'LibraryToolkit',
})

const LibraryPackageSpecSchema = Schema.Struct({
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

export type PackageId = Schema.Schema.Type<typeof PackageIdSchema>
export type InternalDependencyLink = Schema.Schema.Type<typeof InternalDependencyLinkSchema>
export type GenerationPackageSpec = Schema.Schema.Type<typeof GenerationPackageSpecSchema>

export const decodeGenerationPackageSpec = Schema.decodeUnknown(GenerationPackageSpecSchema, { errors: 'all' })

export const makePackageId = (value: string): PackageId => Schema.decodeUnknownSync(PackageIdSchema)(value)
