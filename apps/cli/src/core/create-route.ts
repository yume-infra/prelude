import type { ProjectName } from '@/brand/project-name'
import type { TargetDir } from '@/brand/target-dir'
import type { CapabilityId, CreateSpec, WritePlan } from '@/core/create'
import { multiselect, select, text } from '@clack/prompts'
import { Effect, Result } from 'effect'
import { makePackageName } from '@/brand/package-name'
import { decodeProjectName, formatProjectNameError } from '@/brand/project-name'
import { makeProjectTargetDir } from '@/brand/target-dir'
import { createProjectFromSpec, planCreateProjectFromSpec } from '@/core/create'
import { formatCanonicalCreateSpecJson, loadCreateSpecFromInput } from '@/core/create-spec-input'
import { SchemaContractError } from '@/core/errors'
import { schemaIssueCount } from '@/schema/errors'
import { ask } from './adapters/prompts'
import { CliContext } from './cli-context'

interface CreateRouteOptions {
  readonly preludeVersion: string
  readonly targetDir?: TargetDir
}

interface CreateRouteSpecInput {
  readonly spec: CreateSpec
  readonly targetName?: ProjectName
}

function unsupportedPresetError() {
  return new SchemaContractError({
    schema: 'CliArgs',
    message: 'CliArgs: --preset has been removed from the active create API. Reusable shapes are complete canonical CreateSpec files passed with --spec.',
    issueCount: 1,
  })
}

function missingNonInteractiveInputError() {
  return new SchemaContractError({
    schema: 'CliArgs',
    message: 'CliArgs: non-interactive mode requires --spec with a complete canonical CreateSpec.',
    issueCount: 1,
  })
}

function missingTargetNameError() {
  return new SchemaContractError({
    schema: 'CliArgs',
    message: 'CliArgs: creation requires --name so the target directory is explicit.',
    issueCount: 1,
  })
}

function decodeGuidedProjectName(input: string) {
  return decodeProjectName(input).pipe(
    Effect.mapError(error => new SchemaContractError({
      schema: 'ProjectName',
      message: formatProjectNameError(error),
      issueCount: schemaIssueCount(error),
    })),
  )
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
    return yield* new SchemaContractError({
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
      { value: 'effect-package', label: 'Effect package' },
    ],
  }),
)

const askRootCapabilities = ask(() =>
  multiselect<string>({
    message: 'Root capabilities:',
    required: false,
    options: [
      { value: 'package-manager:pnpm', label: 'pnpm package manager' },
      { value: 'linting', label: 'Linting' },
      { value: 'knip', label: 'Knip' },
      { value: 'ai-harness', label: 'AI harness provider' },
    ],
  }),
)

function providersForRootCapabilities(rootCapabilities: readonly string[]) {
  return rootCapabilities.includes('ai-harness') ? ['effect-harness'] : []
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
  const capabilities = yield* askPackageCapabilities
  const rootCapabilities = yield* askRootCapabilities
  const packageSpec = {
    id: 'app',
    name: makePackageName(String(name)),
    capabilities,
  }

  return {
    spec: topology === 'workspace'
      ? {
          topology,
          packages: [{
            ...packageSpec,
            internalDependencies: [],
          }],
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

const loadCreateRouteSpec = Effect.fn('loadCreateRouteSpec')(function* () {
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

    const input = yield* loadCreateRouteSpec()

    if (cli.args.dryRun) {
      const planResult = yield* Effect.result(planCreateProjectFromSpec(input.spec))
      const writePlan = Result.isSuccess(planResult) ? planResult.success.writePlan : emptyWritePlan()
      const blockers = Result.isFailure(planResult) ? [planResult.failure] : []
      const output = formatDryRunOutput({ writePlan, blockers })
      yield* Effect.sync(() => console.log(output.trimEnd()))
      return {
        kind: 'dry-run',
        spec: input.spec,
        writePlan,
        blockers,
        output,
      } as const
    }

    if (cli.args.printSpec) {
      yield* planCreateProjectFromSpec(input.spec)
      const output = formatCanonicalCreateSpecJson(input.spec)
      yield* Effect.sync(() => console.log(output.trimEnd()))
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
