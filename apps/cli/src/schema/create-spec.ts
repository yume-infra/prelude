import type { CodeQuality, Linting, ProjectConfig } from './project-config'
import type { ProjectName } from '@/brand/project-name'
import { ParseResult, Schema } from 'effect'
import { makePackageName } from '@/brand/package-name'
import {
  GenerationPackageSpecSchema,
  makePackageId,
} from './generation-package-spec'

export {
  decodeGenerationPackageSpec,
  makePackageId,
} from './generation-package-spec'

const StandaloneCreateSpecSchema = Schema.Struct({
  shape: Schema.Literal('standalone'),
  package: GenerationPackageSpecSchema,
}).annotations({
  identifier: 'StandaloneCreateSpec',
  title: 'StandaloneCreateSpec',
})

const WorkspaceCreateSpecSchema = Schema.Struct({
  shape: Schema.Literal('workspace'),
  packages: Schema.Array(GenerationPackageSpecSchema),
}).annotations({
  identifier: 'WorkspaceCreateSpec',
  title: 'WorkspaceCreateSpec',
})

const CreateSpecSchema = Schema.Union(
  StandaloneCreateSpecSchema,
  WorkspaceCreateSpecSchema,
).annotations({
  identifier: 'CreateSpec',
  title: 'CreateSpec',
})

export type CreateSpec = Schema.Schema.Type<typeof CreateSpecSchema>

export const decodeCreateSpec = Schema.decodeUnknown(CreateSpecSchema, { errors: 'all' })
export const encodeCreateSpecJson = Schema.encode(Schema.parseJson(CreateSpecSchema))

export const formatCreateSpecError = ParseResult.TreeFormatter.formatErrorSync

export interface CreateSpecProjectConfigOptions {
  readonly name: ProjectName
  readonly git?: boolean
  readonly linting?: Linting
  readonly codeQuality?: readonly CodeQuality[]
}

function baseSpecProjectConfig(options: CreateSpecProjectConfigOptions) {
  return {
    name: options.name,
    git: options.git ?? false,
    linting: options.linting ?? 'none',
    codeQuality: [...(options.codeQuality ?? [])],
  }
}

export function createSpecToProjectConfig(
  spec: CreateSpec,
  options: CreateSpecProjectConfigOptions,
): ProjectConfig {
  const base = baseSpecProjectConfig(options)

  if (spec.shape === 'workspace') {
    const workerPackage = spec.packages.find(packageSpec => packageSpec.kind === 'worker-app')
    if (workerPackage) {
      throw new Error(`Create spec worker package "${workerPackage.id}" generation is not available yet.`)
    }

    return {
      ...base,
      type: 'workspace-root',
      language: 'typescript',
      packageManager: 'pnpm',
      packages: spec.packages,
    }
  }

  switch (spec.package.kind) {
    case 'frontend-app':
      if (spec.package.frontend.framework === 'react') {
        return {
          ...base,
          type: 'react',
          language: 'typescript',
          buildTool: spec.package.frontend.buildTool,
          cssPreprocessor: spec.package.frontend.cssPreprocessor,
          cssFramework: spec.package.frontend.cssFramework,
          router: 'none',
          stateManagement: 'none',
        }
      }

      return {
        ...base,
        type: 'vue',
        language: 'typescript',
        buildTool: spec.package.frontend.buildTool,
        cssPreprocessor: spec.package.frontend.cssPreprocessor,
        cssFramework: spec.package.frontend.cssFramework,
        router: false,
        stateManagement: false,
      }
    case 'backend-app':
      return {
        ...base,
        type: 'node',
        language: 'typescript',
      }
    case 'cli-tool':
      return {
        ...base,
        type: 'cli',
        language: 'typescript',
        toolkit: spec.package.cli.toolkit,
      }
    case 'library-package':
      return {
        ...base,
        type: 'library',
        language: 'typescript',
        runtime: spec.package.runtime,
      }
    case 'worker-app':
      throw new Error('Create spec worker app generation is not available yet.')
    default: {
      const exhaustive: never = spec.package
      return exhaustive
    }
  }
}

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
            toolkit: config.toolkit ?? 'none',
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
