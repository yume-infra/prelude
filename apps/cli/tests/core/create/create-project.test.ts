import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { NodeContext, NodeFileSystem } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { describe, it } from 'vitest'
import { makePackageName } from '@/brand/package-name'
import { makeTargetDir } from '@/brand/target-dir'
import { createProjectFromSpec } from '@/core/create'
import { FsLive } from '@/core/services/fs'

async function makeTempProjectDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'prelude-create-'))
}

async function readJson(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown
}

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeFileSystem.layer),
  Layer.provideMerge(NodeContext.layer),
)

describe('create spec creation path', () => {
  it('creates a minimal single-package project and writes the manifest last', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const targetDir = yield* Effect.promise(makeTempProjectDir)

        const result = yield* createProjectFromSpec({
          spec: {
            topology: 'single-package',
            package: {
              id: 'app',
              name: makePackageName('demo-app'),
              capabilities: ['minimal-node-package'],
            },
            rootCapabilities: [],
            providers: [],
            overrides: {},
          },
          targetDir: makeTargetDir(targetDir),
          preludeVersion: '0.0.0-test',
        })

        assert.deepEqual(result.writePlan.operations.map(operation => operation.kind), [
          'writeStructuredFile',
          'writeGeneratedUserFile',
        ])
        assert.deepEqual(result.verification.records, [
          {
            id: 'minimal-create-files-present',
            status: 'passed',
            checkedPaths: ['package.json', 'src/index.ts'],
          },
        ])

        const packageJson = yield* Effect.promise(() => readJson(path.join(targetDir, 'package.json')))
        assert.deepEqual(packageJson, {
          name: 'demo-app',
          type: 'module',
          version: '0.0.0',
          scripts: {
            build: 'tsc --noEmit',
          },
        })

        const source = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/index.ts'), 'utf8'))
        assert.equal(source, 'export {}\n')

        const manifest = yield* Effect.promise(() => readJson(path.join(targetDir, '.prelude/manifest.json')))
        assert.deepEqual(manifest, {
          schemaVersion: 1,
          preludeVersion: '0.0.0-test',
          createSpec: {
            topology: 'single-package',
            package: {
              id: 'app',
              name: 'demo-app',
              capabilities: ['minimal-node-package'],
            },
            rootCapabilities: [],
            providers: [],
            overrides: {},
          },
          resolvedGraph: {
            topology: 'single-package',
            rootPackage: {
              id: 'app',
              name: 'demo-app',
              path: '.',
              capabilities: ['minimal-node-package'],
            },
            packages: [],
            rootCapabilities: [],
            packageCapabilities: {
              app: ['minimal-node-package'],
            },
            providers: [],
            logicalSurfaces: [
              {
                id: 'package-manifest:root',
                materializer: 'package-json',
                owner: 'prelude',
              },
              {
                id: 'source:root/src/index.ts',
                materializer: 'generated-user-file',
                owner: 'capability:minimal-node-package',
              },
            ],
            verification: ['minimal-create-files-present'],
          },
          pins: {
            packageManager: 'pnpm@10.33.4',
            typescript: 'catalog:',
          },
          lifecycleProviders: [],
          lifecycleSurfaces: [],
          generatedUserSurfaces: [
            {
              path: 'package.json',
              creator: 'materializer:package-json',
              authority: 'none',
              operationId: 'write-package-json',
            },
            {
              path: 'src/index.ts',
              creator: 'capability:minimal-node-package',
              authority: 'none',
              operationId: 'write-root-source',
            },
          ],
          verificationRecords: [
            {
              id: 'minimal-create-files-present',
              status: 'passed',
              checkedPaths: ['package.json', 'src/index.ts'],
            },
          ],
        })
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  it('blocks unsupported spec branches instead of silently dropping them', async () => {
    await assert.rejects(
      Effect.runPromise(
        Effect.gen(function* () {
          const targetDir = yield* Effect.promise(makeTempProjectDir)

          yield* createProjectFromSpec({
            spec: {
              topology: 'workspace',
              package: {
                id: 'app',
                name: makePackageName('demo-app'),
                capabilities: ['minimal-node-package'],
              },
              rootCapabilities: ['linting'],
              providers: ['effect-harness'],
              overrides: {},
            },
            targetDir: makeTargetDir(targetDir),
            preludeVersion: '0.0.0-test',
          })
        }).pipe(Effect.provide(TestLayer)),
      ),
      error =>
        error instanceof Error
        && error.message.includes('Unsupported CreateSpec for the minimal creation path')
        && error.message.includes('unsupported topology "workspace"')
        && error.message.includes('unsupported root capabilities: linting')
        && error.message.includes('unsupported providers: effect-harness'),
    )
  })
})
