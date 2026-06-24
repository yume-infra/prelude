import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { NodeContext, NodeFileSystem } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { describe, it } from 'vitest'
import { makePackageName } from '@/brand/package-name'
import { makeTargetDir } from '@/brand/target-dir'
import { createProjectFromSpec, materializeWritePlan } from '@/core/create'
import { FsLive } from '@/core/services/fs'

async function makeTempProjectDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'prelude-create-'))
}

async function readJson<T = unknown>(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
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

        const manifest = yield* Effect.promise(() => readJson<{ resolvedGraph: { rootCapabilities: unknown, logicalSurfaces: unknown }, generatedUserSurfaces: Array<{ path: string, authority: string }> }>(path.join(targetDir, '.prelude/manifest.json')))
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

  it('materializes root engineering capabilities through logical surfaces', async () => {
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
            rootCapabilities: ['package-manager:pnpm', 'linting', 'knip'],
            providers: [],
            overrides: {},
          },
          targetDir: makeTargetDir(targetDir),
          preludeVersion: '0.0.0-test',
        })

        assert.deepEqual(result.writePlan.operations.map(operation => operation.path), [
          'package.json',
          'eslint.config.mjs',
          'knip.json',
          'src/index.ts',
        ])

        const packageJson = yield* Effect.promise(() => readJson(path.join(targetDir, 'package.json')))
        assert.deepEqual(packageJson, {
          name: 'demo-app',
          type: 'module',
          version: '0.0.0',
          packageManager: 'pnpm@10.33.4',
          scripts: {
            build: 'tsc --noEmit',
            lint: 'eslint .',
            knip: 'knip',
            verify: 'pnpm build && pnpm lint && pnpm knip',
          },
          devDependencies: {
            '@antfu/eslint-config': 'catalog:',
            'eslint': 'catalog:',
            'knip': 'catalog:',
            'typescript': 'catalog:',
          },
        })

        const eslintConfig = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'eslint.config.mjs'), 'utf8'))
        assert.equal(eslintConfig, 'import antfu from \'@antfu/eslint-config\'\n\nexport default antfu()\n')

        const knipConfig = yield* Effect.promise(() => readJson(path.join(targetDir, 'knip.json')))
        assert.deepEqual(knipConfig, {
          $schema: 'https://unpkg.com/knip@6/schema.json',
        })

        const manifest = yield* Effect.promise(() =>
          readJson<{
            resolvedGraph: {
              rootCapabilities: unknown
              logicalSurfaces: unknown
            }
            generatedUserSurfaces: Array<{ path: string, authority: string }>
          }>(path.join(targetDir, '.prelude/manifest.json')),
        )
        assert.deepEqual(manifest.resolvedGraph.rootCapabilities, ['package-manager:pnpm', 'linting', 'knip'])
        assert.deepEqual(manifest.resolvedGraph.logicalSurfaces, [
          {
            id: 'package-manifest:root',
            materializer: 'package-json',
            owner: 'prelude',
          },
          {
            id: 'eslint-root',
            materializer: 'eslint-config',
            owner: 'capability:linting',
          },
          {
            id: 'knip-root',
            materializer: 'knip-config',
            owner: 'capability:knip',
          },
          {
            id: 'source:root/src/index.ts',
            materializer: 'generated-user-file',
            owner: 'capability:minimal-node-package',
          },
        ])
        assert.deepEqual(
          manifest.generatedUserSurfaces.map((surface: { path: string, authority: string }) => ({
            path: surface.path,
            authority: surface.authority,
          })),
          [
            { path: 'package.json', authority: 'none' },
            { path: 'eslint.config.mjs', authority: 'none' },
            { path: 'knip.json', authority: 'none' },
            { path: 'src/index.ts', authority: 'none' },
          ],
        )
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  it('creates a React package runtime through package manifest and app shell surfaces', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const targetDir = yield* Effect.promise(makeTempProjectDir)

        const result = yield* createProjectFromSpec({
          spec: {
            topology: 'single-package',
            package: {
              id: 'app',
              name: makePackageName('demo-react-app'),
              capabilities: ['react-app', 'react-counter'],
            },
            rootCapabilities: [],
            providers: [],
            overrides: {},
          },
          targetDir: makeTargetDir(targetDir),
          preludeVersion: '0.0.0-test',
        })

        assert.deepEqual(result.writePlan.operations.map(operation => ({
          id: operation.id,
          kind: operation.kind,
          owner: operation.owner,
          surfaceId: operation.surfaceId,
          path: operation.path,
          authority: operation.authority,
        })), [
          {
            id: 'write-package-json',
            kind: 'writeStructuredFile',
            owner: 'materializer:package-json',
            surfaceId: 'package-manifest:root',
            path: 'package.json',
            authority: 'none',
          },
          {
            id: 'write-react-index-html',
            kind: 'writeGeneratedUserFile',
            owner: 'materializer:react-app-static',
            surfaceId: 'react-app-static:app/index.html',
            path: 'index.html',
            authority: 'none',
          },
          {
            id: 'write-react-main',
            kind: 'writeGeneratedUserFile',
            owner: 'materializer:react-app-static',
            surfaceId: 'react-app-static:app/src/main.tsx',
            path: 'src/main.tsx',
            authority: 'none',
          },
          {
            id: 'write-react-app-shell',
            kind: 'writeGeneratedUserFile',
            owner: 'materializer:react-app-shell',
            surfaceId: 'react-app-shell:app',
            path: 'src/App.tsx',
            authority: 'none',
          },
        ])

        const packageJson = yield* Effect.promise(() => readJson(path.join(targetDir, 'package.json')))
        assert.deepEqual(packageJson, {
          name: 'demo-react-app',
          type: 'module',
          version: '0.0.0',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {
            'react': '^19.2.6',
            'react-dom': '^19.2.6',
          },
          devDependencies: {
            '@vitejs/plugin-react': '^6.0.1',
            '@types/react': '^19.2.14',
            '@types/react-dom': '^19.2.3',
            'typescript': 'catalog:',
            'vite': '^8.0.9',
          },
        })

        const appShell = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/App.tsx'), 'utf8'))
        assert.equal(appShell, `import { useState } from 'react'

export function App() {
  const [count, setCount] = useState(0)

  return (
    <main>
      <h1>demo-react-app</h1>
      <button type="button" onClick={() => setCount(value => value + 1)}>
        Count: {count}
      </button>
    </main>
  )
}
`)

        const mainSource = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/main.tsx'), 'utf8'))
        assert.equal(mainSource, `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`)

        const manifest = yield* Effect.promise(() =>
          readJson<{
            resolvedGraph: {
              packageCapabilities: unknown
              logicalSurfaces: unknown
            }
            generatedUserSurfaces: Array<{ path: string, creator: string, authority: string, operationId: string }>
            verificationRecords: unknown
          }>(path.join(targetDir, '.prelude/manifest.json')),
        )
        assert.deepEqual(manifest.resolvedGraph.packageCapabilities, {
          app: ['react-app', 'react-counter'],
        })
        assert.deepEqual(manifest.resolvedGraph.logicalSurfaces, [
          {
            id: 'package-manifest:root',
            materializer: 'package-json',
            owner: 'prelude',
          },
          {
            id: 'react-app-static:app/index.html',
            materializer: 'generated-user-file',
            owner: 'capability:react-app',
          },
          {
            id: 'react-app-static:app/src/main.tsx',
            materializer: 'generated-user-file',
            owner: 'capability:react-app',
          },
          {
            id: 'react-app-shell:app',
            materializer: 'react-app-shell',
            owner: 'capability:react-app',
          },
        ])
        assert.deepEqual(manifest.generatedUserSurfaces, [
          {
            path: 'package.json',
            creator: 'materializer:package-json',
            authority: 'none',
            operationId: 'write-package-json',
          },
          {
            path: 'index.html',
            creator: 'materializer:react-app-static',
            authority: 'none',
            operationId: 'write-react-index-html',
          },
          {
            path: 'src/main.tsx',
            creator: 'materializer:react-app-static',
            authority: 'none',
            operationId: 'write-react-main',
          },
          {
            path: 'src/App.tsx',
            creator: 'materializer:react-app-shell',
            authority: 'none',
            operationId: 'write-react-app-shell',
          },
        ])
        assert.deepEqual(manifest.verificationRecords, [
          {
            id: 'react-app-files-present',
            status: 'passed',
            checkedPaths: ['package.json', 'index.html', 'src/main.tsx', 'src/App.tsx'],
          },
        ])
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  it('combines React package runtime output with root engineering surfaces', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const targetDir = yield* Effect.promise(makeTempProjectDir)

        const result = yield* createProjectFromSpec({
          spec: {
            topology: 'single-package',
            package: {
              id: 'app',
              name: makePackageName('demo-react-app'),
              capabilities: ['react-app', 'react-counter'],
            },
            rootCapabilities: ['package-manager:pnpm', 'linting', 'knip'],
            providers: [],
            overrides: {},
          },
          targetDir: makeTargetDir(targetDir),
          preludeVersion: '0.0.0-test',
        })

        assert.deepEqual(result.writePlan.operations.map(operation => operation.path), [
          'package.json',
          'eslint.config.mjs',
          'knip.json',
          'index.html',
          'src/main.tsx',
          'src/App.tsx',
        ])

        const packageJson = yield* Effect.promise(() => readJson(path.join(targetDir, 'package.json')))
        assert.deepEqual(packageJson, {
          name: 'demo-react-app',
          type: 'module',
          version: '0.0.0',
          packageManager: 'pnpm@10.33.4',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
            lint: 'eslint .',
            knip: 'knip',
            verify: 'pnpm build && pnpm lint && pnpm knip',
          },
          dependencies: {
            'react': '^19.2.6',
            'react-dom': '^19.2.6',
          },
          devDependencies: {
            '@vitejs/plugin-react': '^6.0.1',
            '@antfu/eslint-config': 'catalog:',
            '@types/react': '^19.2.14',
            '@types/react-dom': '^19.2.3',
            'eslint': 'catalog:',
            'knip': 'catalog:',
            'typescript': 'catalog:',
            'vite': '^8.0.9',
          },
        })

        const manifest = yield* Effect.promise(() =>
          readJson<{
            verificationRecords: unknown
            generatedUserSurfaces: Array<{ path: string, authority: string }>
          }>(path.join(targetDir, '.prelude/manifest.json')),
        )
        assert.deepEqual(manifest.verificationRecords, [
          {
            id: 'react-app-files-present',
            status: 'passed',
            checkedPaths: ['package.json', 'index.html', 'src/main.tsx', 'src/App.tsx'],
          },
          {
            id: 'root-engineering-files-present',
            status: 'passed',
            checkedPaths: ['eslint.config.mjs', 'knip.json'],
          },
        ])
        assert.deepEqual(
          manifest.generatedUserSurfaces.map(surface => ({ path: surface.path, authority: surface.authority })),
          [
            { path: 'package.json', authority: 'none' },
            { path: 'eslint.config.mjs', authority: 'none' },
            { path: 'knip.json', authority: 'none' },
            { path: 'index.html', authority: 'none' },
            { path: 'src/main.tsx', authority: 'none' },
            { path: 'src/App.tsx', authority: 'none' },
          ],
        )
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  it('dedupes equal structured package keys and blocks incompatible values before writes', async () => {
    const dedupedPlan = await Effect.runPromise(materializeWritePlan([
      {
        kind: 'packageManifest',
        surfaceId: 'package-manifest:root',
        owner: 'capability:alpha-linting',
        entries: {
          scripts: {
            lint: 'eslint .',
          },
        },
      },
      {
        kind: 'packageManifest',
        surfaceId: 'package-manifest:root',
        owner: 'capability:beta-linting',
        entries: {
          scripts: {
            lint: 'eslint .',
          },
        },
      },
    ]))

    assert.deepEqual(dedupedPlan.operations[0], {
      id: 'write-package-json',
      kind: 'writeStructuredFile',
      owner: 'materializer:package-json',
      surfaceId: 'package-manifest:root',
      path: 'package.json',
      authority: 'none',
      value: {
        scripts: {
          lint: 'eslint .',
        },
      },
    })

    await assert.rejects(
      Effect.runPromise(materializeWritePlan([
        {
          kind: 'packageManifest',
          surfaceId: 'package-manifest:root',
          owner: 'capability:alpha-linting',
          entries: {
            scripts: {
              lint: 'eslint .',
            },
          },
        },
        {
          kind: 'packageManifest',
          surfaceId: 'package-manifest:root',
          owner: 'capability:beta-linting',
          entries: {
            scripts: {
              lint: 'biome check .',
            },
          },
        },
      ])),
      error =>
        error instanceof Error
        && error.message.includes('Conflicting package-manifest:root contribution at /scripts/lint')
        && error.message.includes('capability:alpha-linting')
        && error.message.includes('capability:beta-linting'),
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
              rootCapabilities: ['unsupported-root-capability'],
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
        && error.message.includes('unsupported root capabilities: unsupported-root-capability')
        && error.message.includes('unsupported providers: effect-harness'),
    )
  })
})
