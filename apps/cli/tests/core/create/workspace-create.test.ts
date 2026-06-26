import type { CreateSpec } from '@/core/create'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { NodeServices } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { assert, describe, it } from 'vitest'
import { makePackageName } from '@/brand/package-name'
import { makeTargetDir } from '@/brand/target-dir'
import { createProjectFromSpec } from '@/core/create'
import { FsLive } from '@/core/services/fs'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
)

async function makeTempProjectDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'prelude-workspace-create-'))
}

async function readJson<T = unknown>(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
}

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
  it('materializes package graph scopes and internal workspace dependencies', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const targetDir = yield* Effect.promise(makeTempProjectDir)

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

        const workspaceYaml = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'pnpm-workspace.yaml'), 'utf8'))
        assert.match(workspaceYaml, / {2}- apps\/\*/u)
        assert.match(workspaceYaml, / {2}- libs\/\*/u)
        assert.match(workspaceYaml, /typescript: 6\.0\.3/u)
        assert.match(workspaceYaml, /tsdown: \^0\.21\.10/u)

        const rootPackageJson = yield* Effect.promise(() =>
          readJson<{
            private: boolean
            packageManager: string
            scripts: Record<string, string>
            devDependencies: Record<string, string>
          }>(path.join(targetDir, 'package.json')),
        )
        assert.equal(rootPackageJson.private, true)
        assert.equal(rootPackageJson.packageManager, 'pnpm@10.33.4')
        assert.equal(rootPackageJson.scripts.build, 'pnpm -r --if-present build')
        assert.equal(rootPackageJson.scripts.typecheck, 'pnpm -r --if-present typecheck')
        assert.equal(rootPackageJson.scripts.lint, 'eslint .')
        assert.equal(rootPackageJson.scripts.knip, 'knip')
        assert.equal(rootPackageJson.scripts['deps:check'], 'taze -r')
        assert.equal(rootPackageJson.devDependencies.taze, 'catalog:')

        const apiPackageJson = yield* Effect.promise(() =>
          readJson<{
            name: string
            scripts: Record<string, string>
            dependencies: Record<string, string>
            devDependencies: Record<string, string>
          }>(path.join(targetDir, 'apps/api/package.json')),
        )
        assert.equal(apiPackageJson.name, '@workspace-graph/api')
        assert.equal(apiPackageJson.scripts.build, 'tsdown --config tsdown.config.ts')
        assert.equal(apiPackageJson.scripts.typecheck, 'tsc --noEmit --project tsconfig.json')
        assert.equal(apiPackageJson.dependencies['@workspace-graph/shared-runtime'], 'workspace:@workspace-graph/shared@*')
        assert.equal(apiPackageJson.devDependencies.tsdown, 'catalog:')

        const toolPackageJson = yield* Effect.promise(() =>
          readJson<{
            name: string
            bin: Record<string, string>
            scripts: Record<string, string>
            dependencies: Record<string, string>
          }>(path.join(targetDir, 'apps/tool/package.json')),
        )
        assert.equal(toolPackageJson.name, '@workspace-graph/tool')
        assert.deepStrictEqual(toolPackageJson.bin, {
          '@workspace-graph/tool': 'dist/index.js',
        })
        assert.equal(toolPackageJson.scripts['smoke:bin'], 'pnpm build && ./dist/index.js --help')
        assert.equal(toolPackageJson.dependencies['@workspace-graph/shared'], 'workspace:*')

        const sharedPackageJson = yield* Effect.promise(() =>
          readJson<{
            name: string
            scripts: Record<string, string>
          }>(path.join(targetDir, 'libs/shared/package.json')),
        )
        assert.equal(sharedPackageJson.name, '@workspace-graph/shared')
        assert.equal(sharedPackageJson.scripts.build, 'tsdown --config tsdown.config.ts')

        const manifest = yield* Effect.promise(() =>
          readJson<{
            createSpec: unknown
            resolvedGraph: {
              topology: string
              packages: Array<{ id: string, path: string, internalDependencies?: Array<{ dependencyName: string, targetPackageId: string, targetPackageName: string, range: string }> }>
              rootCapabilities: readonly string[]
              packageCapabilities: Record<string, readonly string[]>
              logicalSurfaces: Array<{ id: string, materializer: string, owner: string }>
            }
            generatedUserSurfaces: Array<{ path: string, authority: string }>
            verificationRecords: Array<{ id: string, checkedPaths: readonly string[] }>
          }>(path.join(targetDir, '.prelude/manifest.json')),
        )
        assert.deepStrictEqual(manifest.createSpec, workspaceSpec)
        assert.equal(manifest.resolvedGraph.topology, 'workspace')
        assert.deepStrictEqual(
          manifest.resolvedGraph.packages.map(pkg => ({ id: pkg.id, path: pkg.path })),
          [
            { id: 'api', path: 'apps/api' },
            { id: 'tool', path: 'apps/tool' },
            { id: 'shared', path: 'libs/shared' },
          ],
        )
        assert.deepStrictEqual(manifest.resolvedGraph.packages[0]?.internalDependencies, [
          {
            targetPackageId: 'shared',
            targetPackageName: '@workspace-graph/shared',
            dependencyName: '@workspace-graph/shared-runtime',
            range: 'workspace:@workspace-graph/shared@*',
          },
        ])
        assert.deepStrictEqual(manifest.resolvedGraph.packages[1]?.internalDependencies, [
          {
            targetPackageId: 'shared',
            targetPackageName: '@workspace-graph/shared',
            dependencyName: '@workspace-graph/shared',
            range: 'workspace:*',
          },
        ])
        assert.deepStrictEqual(manifest.resolvedGraph.rootCapabilities, ['package-manager:pnpm', 'linting', 'knip', 'dependency-update:taze'])
        assert.deepStrictEqual(manifest.resolvedGraph.packageCapabilities, {
          api: ['node-backend'],
          tool: ['cli-tool'],
          shared: ['library'],
        })
        assert.ok(manifest.resolvedGraph.logicalSurfaces.some(surface => surface.id === 'package-manifest:root'))
        assert.ok(manifest.resolvedGraph.logicalSurfaces.some(surface => surface.id === 'workspace-manifest:root'))
        assert.ok(manifest.resolvedGraph.logicalSurfaces.some(surface => surface.id === 'package-manifest:apps/api'))
        assert.ok(manifest.resolvedGraph.logicalSurfaces.some(surface => surface.id === 'package-manifest:libs/shared'))
        assert.ok(manifest.generatedUserSurfaces.every(surface => surface.authority === 'none'))
        assert.deepStrictEqual(manifest.verificationRecords.map(record => record.id), [
          'workspace-root-files-present',
          'workspace-package-files-present',
          'root-engineering-files-present',
        ])
      }).pipe(Effect.provide(TestLayer)),
    )
  })
})
