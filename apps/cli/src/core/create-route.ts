import type { ProjectName } from '@/brand/project-name'
import type { TargetDir } from '@/brand/target-dir'
import type { CapabilityId, CreateSpec, WritePlan } from '@/core/create'
import { multiselect, select, text } from '@clack/prompts'
import { Console, Effect, Result } from 'effect'
import { makePackageName } from '@/brand/package-name'
import { decodeProjectName, formatProjectNameError } from '@/brand/project-name'
import { makeProjectTargetDir } from '@/brand/target-dir'
import { createProjectFromSpec, planCreateProjectFromSpec } from '@/core/create'
import { formatCanonicalCreateSpecJson, loadCreateSpecFromInput } from '@/core/create-spec-input'
import { runCreateWorkbench } from '@/core/create-workbench'
import { SchemaContractError } from '@/core/errors'
import { schemaIssueCount } from '@/schema/errors'
import { ask } from './adapters/prompts'
import { CliContext } from './cli-context'

interface CreateRouteOptions {
  readonly preludeVersion: string
  readonly targetDir?: TargetDir
  readonly preferWorkbench?: boolean
}

interface CreateRouteSpecInput {
  readonly spec: CreateSpec
  readonly targetName?: ProjectName
}

function unsupportedPresetError() {
  return SchemaContractError.make({
    schema: 'CliArgs',
    message: 'CliArgs: --preset has been removed from the active create API. Reusable shapes are complete canonical CreateSpec files passed with --spec.',
    issueCount: 1,
  })
}

function missingNonInteractiveInputError() {
  return SchemaContractError.make({
    schema: 'CliArgs',
    message: 'CliArgs: non-interactive mode requires --spec with a complete canonical CreateSpec.',
    issueCount: 1,
  })
}

function missingTargetNameError() {
  return SchemaContractError.make({
    schema: 'CliArgs',
    message: 'CliArgs: creation requires --name so the target directory is explicit.',
    issueCount: 1,
  })
}

function decodeGuidedProjectName(input: string) {
  return decodeProjectName(input).pipe(
    Effect.mapError(error => SchemaContractError.make({
      schema: 'ProjectName',
      message: formatProjectNameError(error),
      issueCount: schemaIssueCount(error),
    })),
  )
}

function cancelledCreateWorkbenchError() {
  return SchemaContractError.make({
    schema: 'CreateWorkbench',
    message: 'CreateWorkbench: creation cancelled.',
    issueCount: 1,
  })
}

function formatUnknownError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

const askGuidedProjectName = Effect.fn('askGuidedProjectName')(function* () {
  const cli = yield* CliContext

  if (cli.args.name !== undefined) {
    return cli.args.name
  }

  const value = yield* ask(() =>
    text({
      message: 'Project name:',
      placeholder: 'my-app',
    }),
  )

  if (typeof value !== 'string') {
    return yield* SchemaContractError.make({
      schema: 'ProjectName',
      message: 'ProjectName: expected a project name.',
      issueCount: 1,
    })
  }

  return yield* decodeGuidedProjectName(value)
})

const askTopology = ask(() =>
  select<CreateSpec['topology']>({
    message: 'What are you creating?',
    options: [
      { value: 'single-package', label: 'Single package project' },
      { value: 'workspace', label: 'Workspace / monorepo' },
    ],
  }),
)

const askPackageCapabilities = ask(() =>
  multiselect<CapabilityId>({
    message: 'Package capabilities:',
    required: true,
    options: [
      { value: 'minimal-node-package', label: 'Minimal Node package' },
      { value: 'react-app', label: 'React app' },
      { value: 'react-counter', label: 'React counter demo' },
      { value: 'vue-app', label: 'Vue app' },
      { value: 'node-backend', label: 'Node backend' },
      { value: 'library', label: 'Library package' },
      { value: 'cli-tool', label: 'CLI tool' },
      { value: 'effect-package', label: 'Effect package' },
      { value: 'css:less', label: 'Less stylesheet' },
      { value: 'css:tailwind', label: 'Tailwind CSS' },
      { value: 'router:react-router', label: 'React Router' },
      { value: 'router:vue-router', label: 'Vue Router' },
      { value: 'state:jotai', label: 'Jotai state' },
      { value: 'state:pinia', label: 'Pinia state' },
    ],
  }),
)

type GuidedWorkspaceGraph = 'cli-library' | 'fullstack-react' | 'fullstack-vue' | 'web-tool-shared'

const askWorkspaceGraph = ask(() =>
  select<GuidedWorkspaceGraph>({
    message: 'Workspace package graph:',
    options: [
      { value: 'cli-library', label: 'CLI and shared library' },
      { value: 'fullstack-react', label: 'React web, Node API, shared library' },
      { value: 'fullstack-vue', label: 'Vue web, Node API, shared library' },
      { value: 'web-tool-shared', label: 'Vue web, CLI tool, shared library' },
    ],
  }),
)

function askRootCapabilities(topology: CreateSpec['topology']) {
  return ask(() =>
    multiselect<string>({
      message: 'Root capabilities:',
      required: false,
      options: [
        { value: 'package-manager:pnpm', label: 'pnpm package manager' },
        { value: 'linting', label: 'Linting' },
        { value: 'knip', label: 'Knip' },
        ...(topology === 'single-package' ? [{ value: 'ai-harness', label: 'AI harness provider' }] : []),
      ],
    }),
  )
}

function providersForRootCapabilities(rootCapabilities: readonly string[]) {
  return rootCapabilities.includes('ai-harness') ? ['effect-harness'] : []
}

function scopedPackageName(projectName: ProjectName, packageId: string) {
  return makePackageName(`@${String(projectName)}/${packageId}`)
}

function guidedWorkspacePackages(projectName: ProjectName, graph: GuidedWorkspaceGraph) {
  const shared = {
    id: 'shared',
    name: scopedPackageName(projectName, 'shared'),
    capabilities: ['library'],
    internalDependencies: [],
  } as const

  switch (graph) {
    case 'cli-library':
      return [
        {
          id: 'tool',
          name: scopedPackageName(projectName, 'tool'),
          capabilities: ['cli-tool'],
          internalDependencies: [
            {
              target: { by: 'id', value: 'shared' },
            },
          ],
        },
        shared,
      ] satisfies Extract<CreateSpec, { topology: 'workspace' }>['packages']
    case 'fullstack-react':
      return [
        {
          id: 'web',
          name: scopedPackageName(projectName, 'web'),
          capabilities: ['react-app', 'css:less', 'css:tailwind', 'router:react-router', 'state:jotai'],
          internalDependencies: [
            {
              target: { by: 'id', value: 'shared' },
            },
          ],
        },
        {
          id: 'api',
          name: scopedPackageName(projectName, 'api'),
          capabilities: ['node-backend'],
          internalDependencies: [
            {
              target: { by: 'name', value: String(scopedPackageName(projectName, 'shared')) },
            },
          ],
        },
        shared,
      ] satisfies Extract<CreateSpec, { topology: 'workspace' }>['packages']
    case 'fullstack-vue':
      return [
        {
          id: 'web',
          name: scopedPackageName(projectName, 'web'),
          capabilities: ['vue-app', 'css:less', 'css:tailwind', 'router:vue-router', 'state:pinia'],
          internalDependencies: [
            {
              target: { by: 'id', value: 'shared' },
            },
          ],
        },
        {
          id: 'api',
          name: scopedPackageName(projectName, 'api'),
          capabilities: ['node-backend'],
          internalDependencies: [
            {
              target: { by: 'name', value: String(scopedPackageName(projectName, 'shared')) },
            },
          ],
        },
        shared,
      ] satisfies Extract<CreateSpec, { topology: 'workspace' }>['packages']
    case 'web-tool-shared':
      return [
        {
          id: 'web',
          name: scopedPackageName(projectName, 'web'),
          capabilities: ['vue-app', 'css:less'],
          internalDependencies: [
            {
              target: { by: 'id', value: 'shared' },
            },
          ],
        },
        {
          id: 'tool',
          name: scopedPackageName(projectName, 'tool'),
          capabilities: ['cli-tool'],
          internalDependencies: [
            {
              target: { by: 'name', value: String(scopedPackageName(projectName, 'shared')) },
            },
          ],
        },
        shared,
      ] satisfies Extract<CreateSpec, { topology: 'workspace' }>['packages']
  }
}

function formatDryRunOutput(options: {
  readonly writePlan: WritePlan
  readonly blockers: readonly SchemaContractError[]
}) {
  return `${JSON.stringify({
    operations: options.writePlan.operations,
    blockers: options.blockers.map(blocker => ({
      schema: blocker.schema,
      message: blocker.message,
      issueCount: blocker.issueCount,
    })),
  }, null, 2)}\n`
}

function emptyWritePlan(): WritePlan {
  return { operations: [] }
}

const collectGuidedCreateSpec = Effect.fn('collectGuidedCreateSpec')(function* () {
  const name = yield* askGuidedProjectName()
  const topology = yield* askTopology
  const workspaceGraph = topology === 'workspace' ? yield* askWorkspaceGraph : undefined
  const capabilities = topology === 'single-package' ? yield* askPackageCapabilities : []
  const rootCapabilities = yield* askRootCapabilities(topology)
  const packageSpec = {
    id: 'app',
    name: makePackageName(String(name)),
    capabilities,
  }

  return {
    spec: topology === 'workspace'
      ? {
          topology,
          packages: guidedWorkspacePackages(name, workspaceGraph ?? 'cli-library'),
          rootCapabilities,
          providers: [],
          overrides: {},
        }
      : {
          topology,
          package: packageSpec,
          rootCapabilities,
          providers: providersForRootCapabilities(rootCapabilities),
          overrides: {},
        },
    targetName: name,
  } satisfies CreateRouteSpecInput
})

const collectWorkbenchCreateSpec = Effect.fn('collectWorkbenchCreateSpec')(function* (options: CreateRouteOptions) {
  const cli = yield* CliContext
  const result = yield* Effect.promise(() =>
    runCreateWorkbench({
      ...(cli.args.name === undefined ? {} : { initialProjectName: cli.args.name }),
      ...(options.targetDir === undefined ? {} : { targetDir: options.targetDir }),
    }).catch(error => ({
      kind: 'unavailable' as const,
      reason: `workbench failed: ${formatUnknownError(error)}`,
    })),
  )

  switch (result.kind) {
    case 'submitted':
      return {
        spec: result.spec,
        targetName: yield* decodeGuidedProjectName(result.targetName),
      } satisfies CreateRouteSpecInput
    case 'cancelled':
      return yield* cancelledCreateWorkbenchError()
    case 'unavailable':
      return yield* collectGuidedCreateSpec()
  }
})

const loadCreateRouteSpec = Effect.fn('loadCreateRouteSpec')(function* (options: CreateRouteOptions) {
  const cli = yield* CliContext

  if (cli.args.preset !== undefined) {
    return yield* unsupportedPresetError()
  }

  if (cli.args.spec !== undefined) {
    const spec = yield* loadCreateSpecFromInput(cli.args.spec)
    return { spec } satisfies CreateRouteSpecInput
  }

  if (!cli.isInteractive) {
    return yield* missingNonInteractiveInputError()
  }

  if (options.preferWorkbench === true) {
    return yield* collectWorkbenchCreateSpec(options)
  }

  return yield* collectGuidedCreateSpec()
})

const resolveTargetDir = Effect.fn('resolveTargetDir')(
  function* (options: CreateRouteOptions, input: CreateRouteSpecInput) {
    const cli = yield* CliContext

    if (options.targetDir !== undefined) {
      return options.targetDir
    }

    if (cli.args.name === undefined) {
      if (input.targetName === undefined) {
        return yield* missingTargetNameError()
      }

      return makeProjectTargetDir(input.targetName)
    }

    return makeProjectTargetDir(cli.args.name)
  },
)

export const runCreateRoute = Effect.fn('runCreateRoute')(
  function* (options: CreateRouteOptions) {
    const cli = yield* CliContext

    const input = yield* loadCreateRouteSpec(options)

    if (cli.args.dryRun === true) {
      const planResult = yield* Effect.result(planCreateProjectFromSpec(input.spec))
      const writePlan = Result.isSuccess(planResult) ? planResult.success.writePlan : emptyWritePlan()
      const blockers = Result.isFailure(planResult) ? [planResult.failure] : []
      const output = formatDryRunOutput({ writePlan, blockers })
      yield* Console.log(output.trimEnd())
      return {
        kind: 'dry-run',
        spec: input.spec,
        writePlan,
        blockers,
        output,
      } as const
    }

    if (cli.args.printSpec === true) {
      yield* planCreateProjectFromSpec(input.spec)
      const output = formatCanonicalCreateSpecJson(input.spec)
      yield* Console.log(output.trimEnd())
      return {
        kind: 'printed-spec',
        spec: input.spec,
        output,
      } as const
    }

    const targetDir = yield* resolveTargetDir(options, input)
    const result = yield* createProjectFromSpec({
      spec: input.spec,
      targetDir,
      preludeVersion: options.preludeVersion,
    })

    return {
      kind: 'created',
      spec: input.spec,
      result,
    } as const
  },
)
