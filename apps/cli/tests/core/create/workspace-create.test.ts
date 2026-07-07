import type { CreateSpec } from '@/core/create'
import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { makePackageName } from '@/brand/package-name'
import { makeTargetDir } from '@/brand/target-dir'
import { createProjectFromSpec, materializeWritePlan } from '@/core/create'
import { FsLive } from '@/core/services/fs'
import { assertPathDoesNotExist, makeTempProjectDir, pathJoinSync, readFileString, readJson } from '../../support/effect-files'
import { EffectHarnessDiscoveryTestLayer } from '../../support/effect-harness-discovery'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

const workspaceSpec = {
  topology: 'workspace',
  packages: [
    {
      id: 'api',
      name: makePackageName('@workspace-graph/api'),
      capabilities: ['node-backend'],
      internalDependencies: [
        {
          target: { by: 'id', value: 'shared' },
          alias: makePackageName('@workspace-graph/shared-runtime'),
        },
      ],
    },
    {
      id: 'tool',
      name: makePackageName('@workspace-graph/tool'),
      capabilities: ['cli-tool'],
      internalDependencies: [
        {
          target: { by: 'name', value: '@workspace-graph/shared' },
        },
      ],
    },
    {
      id: 'shared',
      name: makePackageName('@workspace-graph/shared'),
      capabilities: ['library'],
      internalDependencies: [],
    },
  ],
  rootCapabilities: ['package-manager:pnpm', 'linting', 'knip', 'dependency-update:taze'],
  providers: [],
  overrides: {},
} as const satisfies CreateSpec

describe('workspace create pipeline', () => {
  it.layer(TestLayer)((it) => {
    it.effect('materializes package graph scopes and internal workspace dependencies', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-workspace-create-')

      const result = yield* createProjectFromSpec({
        spec: workspaceSpec,
        targetDir: makeTargetDir(targetDir),
        preludeVersion: '0.0.0-test',
      })

      assert.deepStrictEqual(result.writePlan.operations.map(operation => operation.path), [
        'package.json',
        'apps/api/package.json',
        'apps/tool/package.json',
        'libs/shared/package.json',
        'pnpm-workspace.yaml',
        'eslint.config.mjs',
        'knip.json',
        'apps/api/src/index.ts',
        'apps/tool/src/index.ts',
        'apps/tool/scripts/ensure-shebang.mjs',
        'libs/shared/src/index.ts',
        'apps/api/tsconfig.json',
        'apps/tool/tsconfig.json',
        'libs/shared/tsconfig.json',
        'apps/api/tsdown.config.ts',
        'apps/tool/tsdown.config.ts',
        'libs/shared/tsdown.config.ts',
      ])

      const workspaceYaml = yield* readFileString(pathJoinSync(targetDir, 'pnpm-workspace.yaml'))
      assert.match(workspaceYaml, / {2}- apps\/\*/u)
      assert.match(workspaceYaml, / {2}- libs\/\*/u)
      assert.match(workspaceYaml, /typescript: 6\.0\.3/u)
      assert.match(workspaceYaml, /tsdown: \^0\.21\.10/u)

      const rootPackageJson = yield* readJson<{
        private: boolean
        packageManager: string
        scripts: Record<string, string>
        devDependencies: Record<string, string>
      }>(pathJoinSync(targetDir, 'package.json'))
      assert.equal(rootPackageJson.private, true)
      assert.equal(rootPackageJson.packageManager, 'pnpm@10.33.4')
      assert.equal(rootPackageJson.scripts.build, 'pnpm -r --if-present build')
      assert.equal(rootPackageJson.scripts.typecheck, 'pnpm -r --if-present typecheck')
      assert.equal(rootPackageJson.scripts.lint, 'eslint .')
      assert.equal(rootPackageJson.scripts.knip, 'knip')
      assert.equal(rootPackageJson.scripts['deps:check'], 'taze -r')
      assert.equal(rootPackageJson.devDependencies.taze, 'catalog:')

      const apiPackageJson = yield* readJson<{
        name: string
        scripts: Record<string, string>
        dependencies: Record<string, string>
        devDependencies: Record<string, string>
      }>(pathJoinSync(targetDir, 'apps/api/package.json'))
      assert.equal(apiPackageJson.name, '@workspace-graph/api')
      assert.equal(apiPackageJson.scripts.build, 'tsdown --config tsdown.config.ts')
      assert.equal(apiPackageJson.scripts.typecheck, 'tsc --noEmit --project tsconfig.json')
      assert.equal(apiPackageJson.dependencies['@workspace-graph/shared-runtime'], 'workspace:@workspace-graph/shared@*')
      assert.equal(apiPackageJson.devDependencies.tsdown, 'catalog:')

      const toolPackageJson = yield* readJson<{
        name: string
        bin: Record<string, string>
        scripts: Record<string, string>
        dependencies: Record<string, string>
      }>(pathJoinSync(targetDir, 'apps/tool/package.json'))
      assert.equal(toolPackageJson.name, '@workspace-graph/tool')
      assert.deepStrictEqual(toolPackageJson.bin, {
        '@workspace-graph/tool': 'dist/index.js',
      })
      assert.equal(toolPackageJson.scripts['smoke:bin'], 'pnpm build && ./dist/index.js --help')
      assert.equal(toolPackageJson.dependencies['@workspace-graph/shared'], 'workspace:*')

      const sharedPackageJson = yield* readJson<{
        name: string
        scripts: Record<string, string>
      }>(pathJoinSync(targetDir, 'libs/shared/package.json'))
      assert.equal(sharedPackageJson.name, '@workspace-graph/shared')
      assert.equal(sharedPackageJson.scripts.build, 'tsdown --config tsdown.config.ts')

      assert.equal(result.resolvedGraph.topology, 'workspace')
      assert.deepStrictEqual(
        result.resolvedGraph.packages.map(pkg => ({ id: pkg.id, path: pkg.path })),
        [
          { id: 'api', path: 'apps/api' },
          { id: 'tool', path: 'apps/tool' },
          { id: 'shared', path: 'libs/shared' },
        ],
      )
      assert.deepStrictEqual(result.resolvedGraph.packages[0]?.internalDependencies, [
        {
          targetPackageId: 'shared',
          targetPackageName: '@workspace-graph/shared',
          dependencyName: '@workspace-graph/shared-runtime',
          range: 'workspace:@workspace-graph/shared@*',
        },
      ])
      assert.deepStrictEqual(result.resolvedGraph.packages[1]?.internalDependencies, [
        {
          targetPackageId: 'shared',
          targetPackageName: '@workspace-graph/shared',
          dependencyName: '@workspace-graph/shared',
          range: 'workspace:*',
        },
      ])
      assert.deepStrictEqual(result.resolvedGraph.rootCapabilities, ['package-manager:pnpm', 'linting', 'knip', 'dependency-update:taze'])
      assert.deepStrictEqual(result.resolvedGraph.packageCapabilities, {
        api: ['node-backend'],
        tool: ['cli-tool'],
        shared: ['library'],
      })
      assert.ok(result.resolvedGraph.logicalSurfaces.some(surface => surface.id === 'package-manifest:root'))
      assert.ok(result.resolvedGraph.logicalSurfaces.some(surface => surface.id === 'workspace-manifest:root'))
      assert.ok(result.resolvedGraph.logicalSurfaces.some(surface => surface.id === 'package-manifest:apps/api'))
      assert.ok(result.resolvedGraph.logicalSurfaces.some(surface => surface.id === 'package-manifest:libs/shared'))
      assert.deepStrictEqual(result.verification.records.map(record => record.id), [
        'workspace-root-files-present',
        'workspace-package-files-present',
        'root-engineering-files-present',
      ])
      yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('merges typed workspace manifest surfaces and blocks workspace package manifest conflicts', () => Effect.gen(function* () {
      const workspacePlan = yield* materializeWritePlan([
        {
          kind: 'workspaceManifest',
          surfaceId: 'workspace-manifest:root',
          owner: 'topology:workspace',
          globs: ['apps/*', 'libs/*'],
        },
        {
          kind: 'workspaceManifest',
          surfaceId: 'workspace-manifest:root',
          owner: 'capability:workspace-extra',
          globs: ['apps/*'],
        },
      ])

      assert.deepStrictEqual(workspacePlan.operations, [
        {
          id: 'write-pnpm-workspace',
          kind: 'writeGeneratedUserFile',
          owner: 'materializer:workspace-manifest',
          surfaceId: 'workspace-manifest:root',
          path: 'pnpm-workspace.yaml',
          authority: 'none',
          content: `packages:
  - apps/*
  - libs/*
`,
        },
      ])

      const conflictResult = yield* Effect.result(materializeWritePlan([
        {
          kind: 'packageManifest',
          surfaceId: 'package-manifest:apps/api',
          owner: 'capability:node-backend',
          entries: {
            scripts: {
              build: 'tsdown --config tsdown.config.ts',
            },
          },
        },
        {
          kind: 'packageManifest',
          surfaceId: 'package-manifest:apps/api',
          owner: 'capability:conflicting-builder',
          entries: {
            scripts: {
              build: 'vite build',
            },
          },
        },
      ]))

      assert.equal(conflictResult._tag, 'Failure')
      if (conflictResult._tag === 'Failure') {
        assert.include(conflictResult.failure.message, 'Conflicting package-manifest:apps/api contribution at /scripts/build')
        assert.include(conflictResult.failure.message, 'capability:node-backend')
        assert.include(conflictResult.failure.message, 'capability:conflicting-builder')
      }
    }))
  })
})
