import assert from 'node:assert/strict'
import { NodeServices } from '@effect/platform-node'
import { describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { beforeEach, vi } from 'vitest'
import { makeProjectName } from '@/brand/project-name'
import { makeTargetDir } from '@/brand/target-dir'
import { CliContext } from '@/core/cli-context'
import { runCreateRoute } from '@/core/create-route'
import { loadCreateSpecFromInput } from '@/core/create-spec-input'
import { FsLive } from '@/core/services/fs'
import { assertPathDoesNotExist, makeTempProjectDir, parseJson, pathJoin, readJson, stringifyJson } from '../support/effect-files'
import { EffectHarnessDiscoveryTestLayer } from '../support/effect-harness-discovery'

const prompts = vi.hoisted(() => ({
  isCancel: vi.fn(),
  multiselect: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
}))

vi.mock('@clack/prompts', () => ({
  isCancel: prompts.isCancel,
  multiselect: prompts.multiselect,
  select: prompts.select,
  text: prompts.text,
}))

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

function routeOutput(result: { readonly output?: string }) {
  if (result.output !== undefined) {
    return result.output
  }

  return assert.fail('expected create route to return output')
}

describe('canonical create CLI route', () => {
  it.layer(TestLayer)((it) => {
    beforeEach(() => {
      prompts.isCancel.mockReset()
      prompts.multiselect.mockReset()
      prompts.select.mockReset()
      prompts.text.mockReset()
      prompts.isCancel.mockReturnValue(false)
    })

    it.effect('creates from direct canonical --spec through the CreateSpec pipeline', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-route-')
      const spec = {
        topology: 'single-package',
        package: {
          id: 'app',
          name: 'direct-spec-app',
          capabilities: ['minimal-node-package'],
        },
        rootCapabilities: [],
        providers: [],
        overrides: {},
      }

      yield* runCreateRoute({
        preludeVersion: '0.0.0-test',
        targetDir: makeTargetDir(targetDir),
      }).pipe(
        Effect.provideService(CliContext, CliContext.of({
          args: {
            spec: stringifyJson(spec),
            name: makeProjectName('ignored-target-name'),
            noInput: true,
          },
          isInteractive: false,
        })),
      )

      const manifest = yield* readJson<{
        createSpec: unknown
        resolvedGraph: { packageCapabilities: unknown }
      }>(yield* pathJoin(targetDir, '.prelude/manifest.json'))

      assert.deepEqual(manifest.createSpec, spec)
      assert.deepEqual(manifest.resolvedGraph.packageCapabilities, {
        app: ['minimal-node-package'],
      })
    }))

    it.effect('uses the prompted project name as the target directory for guided creation', () => Effect.gen(function* () {
      const originalCwd = process.cwd()
      const parentDir = yield* makeTempProjectDir('prelude-create-route-')
      prompts.text.mockResolvedValue('guided-spec-app')
      prompts.select.mockResolvedValue('single-package')
      prompts.multiselect
        .mockResolvedValueOnce(['minimal-node-package'])
        .mockResolvedValueOnce([])

      try {
        process.chdir(parentDir)

        yield* runCreateRoute({
          preludeVersion: '0.0.0-test',
        }).pipe(
          Effect.provideService(CliContext, CliContext.of({
            args: {},
            isInteractive: true,
          })),
        )

        const manifest = yield* readJson<{
          createSpec: {
            package: { name: string }
          }
        }>(yield* pathJoin(parentDir, 'guided-spec-app/.prelude/manifest.json'))

        assert.equal(manifest.createSpec.package.name, 'guided-spec-app')
        assert.ok(prompts.select.mock.invocationCallOrder[0]! < prompts.multiselect.mock.invocationCallOrder[0]!)
      }
      finally {
        process.chdir(originalCwd)
      }
    }))

    const guidedSinglePackageScenarios = [
      {
        label: 'React',
        projectName: 'guided-react-app',
        capabilities: ['react-app', 'css:less', 'css:tailwind', 'router:react-router', 'state:jotai'],
        rootCapabilities: ['package-manager:pnpm', 'linting', 'knip'],
        providers: [],
      },
      {
        label: 'Vue',
        projectName: 'guided-vue-app',
        capabilities: ['vue-app', 'css:less', 'css:tailwind', 'router:vue-router', 'state:pinia'],
        rootCapabilities: ['package-manager:pnpm', 'linting', 'knip'],
        providers: [],
      },
      {
        label: 'Node backend',
        projectName: 'guided-node-backend',
        capabilities: ['node-backend'],
        rootCapabilities: ['package-manager:pnpm', 'linting', 'knip'],
        providers: [],
      },
      {
        label: 'library',
        projectName: 'guided-library',
        capabilities: ['library'],
        rootCapabilities: ['package-manager:pnpm'],
        providers: [],
      },
      {
        label: 'CLI',
        projectName: 'guided-cli',
        capabilities: ['cli-tool'],
        rootCapabilities: ['package-manager:pnpm'],
        providers: [],
      },
      {
        label: 'Effect',
        projectName: 'guided-effect-worker',
        capabilities: ['effect-package'],
        rootCapabilities: ['package-manager:pnpm', 'ai-harness'],
        providers: ['effect-harness'],
      },
    ] as const

    for (const scenario of guidedSinglePackageScenarios) {
      it.effect(`prints guided ${scenario.label} CreateSpec without writing files`, () => Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-create-route-')
        prompts.text.mockResolvedValue(scenario.projectName)
        prompts.select.mockResolvedValue('single-package')
        prompts.multiselect
          .mockResolvedValueOnce([...scenario.capabilities])
          .mockResolvedValueOnce([...scenario.rootCapabilities])

        const result = yield* runCreateRoute({
          preludeVersion: '0.0.0-test',
          targetDir: makeTargetDir(targetDir),
        }).pipe(
          Effect.provideService(CliContext, CliContext.of({
            args: {
              printSpec: true,
            },
            isInteractive: true,
          })),
        )

        const spec = parseJson(routeOutput(result)) as {
          topology: string
          package: { id: string, name: string, capabilities: readonly string[] }
          rootCapabilities: readonly string[]
          providers: readonly string[]
        }

        assert.equal(result.kind, 'printed-spec')
        assert.equal(spec.topology, 'single-package')
        assert.deepEqual(spec.package, {
          id: 'app',
          name: scenario.projectName,
          capabilities: scenario.capabilities,
        })
        assert.deepEqual(spec.rootCapabilities, scenario.rootCapabilities)
        assert.deepEqual(spec.providers, scenario.providers)
        yield* assertPathDoesNotExist(yield* pathJoin(targetDir, '.prelude/manifest.json'))
      }))
    }

    it.effect('prints guided workspace CreateSpec with explicit package graph and internal dependencies', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-route-')
      prompts.text.mockResolvedValue('guided-workspace')
      prompts.select
        .mockResolvedValueOnce('workspace')
        .mockResolvedValueOnce('fullstack-react')
      prompts.multiselect.mockResolvedValueOnce(['package-manager:pnpm', 'linting', 'knip'])

      const result = yield* runCreateRoute({
        preludeVersion: '0.0.0-test',
        targetDir: makeTargetDir(targetDir),
      }).pipe(
        Effect.provideService(CliContext, CliContext.of({
          args: {
            printSpec: true,
          },
          isInteractive: true,
        })),
      )

      const spec = parseJson(routeOutput(result)) as {
        topology: string
        packages: Array<{
          id: string
          name: string
          capabilities: readonly string[]
          internalDependencies: Array<{ target: { by: string, value: string } }>
        }>
        rootCapabilities: readonly string[]
        providers: readonly string[]
      }

      assert.equal(result.kind, 'printed-spec')
      assert.equal(spec.topology, 'workspace')
      assert.deepEqual(spec.rootCapabilities, ['package-manager:pnpm', 'linting', 'knip'])
      assert.deepEqual(spec.providers, [])
      assert.deepEqual(spec.packages.map(pkg => ({ id: pkg.id, name: pkg.name, capabilities: pkg.capabilities })), [
        {
          id: 'web',
          name: '@guided-workspace/web',
          capabilities: ['react-app', 'css:less', 'css:tailwind', 'router:react-router', 'state:jotai'],
        },
        {
          id: 'api',
          name: '@guided-workspace/api',
          capabilities: ['node-backend'],
        },
        {
          id: 'shared',
          name: '@guided-workspace/shared',
          capabilities: ['library'],
        },
      ])
      assert.deepEqual(spec.packages[0]!.internalDependencies, [
        {
          target: { by: 'id', value: 'shared' },
        },
      ])
      assert.deepEqual(spec.packages[1]!.internalDependencies, [
        {
          target: { by: 'name', value: '@guided-workspace/shared' },
        },
      ])
      yield* assertPathDoesNotExist(yield* pathJoin(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('prints the canonical --spec without creating files', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-route-')
      const spec = {
        topology: 'single-package',
        package: {
          id: 'app',
          name: 'printed-spec-app',
          capabilities: ['minimal-node-package'],
        },
        rootCapabilities: [],
        providers: [],
        overrides: {},
      }

      const result = yield* runCreateRoute({
        preludeVersion: '0.0.0-test',
        targetDir: makeTargetDir(targetDir),
      }).pipe(
        Effect.provideService(CliContext, CliContext.of({
          args: {
            spec: stringifyJson(spec),
            printSpec: true,
            noInput: true,
          },
          isInteractive: false,
        })),
      )

      assert.equal(result.kind, 'printed-spec')
      assert.deepEqual(parseJson(routeOutput(result)), spec)
      yield* assertPathDoesNotExist(yield* pathJoin(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('rejects legacy structured spec shapes instead of adapting them', () => Effect.gen(function* () {
      const result = yield* Effect.result(loadCreateSpecFromInput(stringifyJson({
        shape: 'standalone',
        package: {
          id: 'app',
          name: 'old-spec-app',
          kind: 'backend-app',
        },
      })))

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.equal(result.failure._tag, 'SchemaContractError')
        assert.match(result.failure.message, /CanonicalCreateSpec/)
      }
    }))

    it.effect('rejects preset input as a removed active API', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-route-')
      const result = yield* Effect.result(
        runCreateRoute({
          preludeVersion: '0.0.0-test',
          targetDir: makeTargetDir(targetDir),
        }).pipe(
          Effect.provideService(CliContext, CliContext.of({
            args: {
              preset: 'react-full',
              name: makeProjectName('removed-preset-app'),
            },
            isInteractive: false,
          })),
        ),
      )

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.equal(result.failure._tag, 'SchemaContractError')
        assert.match(result.failure.message, /--preset has been removed/)
      }
    }))

    it.effect('prints the WritePlan for dry-run without creating files', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-route-')
      const spec = {
        topology: 'single-package',
        package: {
          id: 'app',
          name: 'dry-run-app',
          capabilities: ['minimal-node-package'],
        },
        rootCapabilities: [],
        providers: [],
        overrides: {},
      }

      const result = yield* runCreateRoute({
        preludeVersion: '0.0.0-test',
        targetDir: makeTargetDir(targetDir),
      }).pipe(
        Effect.provideService(CliContext, CliContext.of({
          args: {
            spec: stringifyJson(spec),
            dryRun: true,
            noInput: true,
          },
          isInteractive: false,
        })),
      )

      const output = parseJson(routeOutput(result)) as {
        operations: Array<{ path: string, kind: string }>
        blockers: unknown[]
      }

      assert.equal(result.kind, 'dry-run')
      assert.deepEqual(result.blockers, [])
      assert.deepEqual(output.blockers, [])
      assert.deepEqual(output.operations.map(operation => operation.path), ['package.json', 'src/index.ts'])
      assert.deepEqual(output.operations.map(operation => operation.kind), ['writeStructuredFile', 'writeGeneratedUserFile'])
      yield* assertPathDoesNotExist(yield* pathJoin(targetDir, 'package.json'))
      yield* assertPathDoesNotExist(yield* pathJoin(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('prints dry-run blockers from the canonical planning pipeline', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-route-')

      const result = yield* runCreateRoute({
        preludeVersion: '0.0.0-test',
        targetDir: makeTargetDir(targetDir),
      }).pipe(
        Effect.provideService(CliContext, CliContext.of({
          args: {
            spec: stringifyJson({
              topology: 'single-package',
              package: {
                id: 'app',
                name: 'blocked-workspace-app',
                capabilities: ['minimal-node-package'],
              },
              rootCapabilities: ['unsupported-root-capability'],
              providers: ['effect-harness'],
              overrides: {},
            }),
            dryRun: true,
            noInput: true,
          },
          isInteractive: false,
        })),
      )

      const output = parseJson(routeOutput(result)) as {
        operations: unknown[]
        blockers: Array<{ message: string, schema: string }>
      }

      assert.equal(result.kind, 'dry-run')
      assert.deepEqual(output.operations, [])
      assert.equal(output.blockers[0]!.schema, 'CreateSpec')
      assert.match(output.blockers[0]!.message, /unsupported root capabilities: unsupported-root-capability/u)
      yield* assertPathDoesNotExist(yield* pathJoin(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('fails no-input automation clearly when --spec is missing and does not prompt', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-route-')
      const result = yield* Effect.result(
        runCreateRoute({
          preludeVersion: '0.0.0-test',
          targetDir: makeTargetDir(targetDir),
        }).pipe(
          Effect.provideService(CliContext, CliContext.of({
            args: {
              noInput: true,
            },
            isInteractive: false,
          })),
        ),
      )

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.equal(result.failure._tag, 'SchemaContractError')
        assert.match(result.failure.message, /non-interactive mode requires --spec/)
      }
      assert.equal(prompts.text.mock.calls.length, 0)
      assert.equal(prompts.select.mock.calls.length, 0)
      assert.equal(prompts.multiselect.mock.calls.length, 0)
    }))
  })
})
