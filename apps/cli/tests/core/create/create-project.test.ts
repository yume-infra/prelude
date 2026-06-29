import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
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
  Layer.provideMerge(NodeServices.layer),
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
            rootCapabilities: ['package-manager:pnpm', 'linting', 'knip', 'dependency-update:taze'],
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
            'build': 'tsc --noEmit',
            'lint': 'eslint .',
            'knip': 'knip',
            'deps:check': 'taze -r',
            'verify': 'pnpm build && pnpm lint && pnpm knip',
          },
          devDependencies: {
            '@antfu/eslint-config': 'catalog:',
            'eslint': 'catalog:',
            'knip': 'catalog:',
            'taze': 'catalog:',
            'typescript': 'catalog:',
          },
        })

        const eslintConfig = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'eslint.config.mjs'), 'utf8'))
        assert.equal(eslintConfig, `import antfu from '@antfu/eslint-config'

export default antfu(
  {
    ignores: ['.prelude/**', 'dist/**'],
  },
  {
    rules: {
      'jsonc/sort-keys': 'off',
      'no-console': 'off',
      'node/prefer-global/process': 'off',
      'pnpm/json-enforce-catalog': 'off',
      'style/quotes': 'off',
      'style/jsx-one-expression-per-line': 'off',
    },
  },
)
`)

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
        assert.deepEqual(manifest.resolvedGraph.rootCapabilities, ['package-manager:pnpm', 'linting', 'knip', 'dependency-update:taze'])
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
            owner: 'materializer:frontend-entry',
            surfaceId: 'react-app-entry:app',
            path: 'src/main.tsx',
            authority: 'none',
          },
          {
            id: 'write-vite-config',
            kind: 'writeGeneratedUserFile',
            owner: 'materializer:vite-config',
            surfaceId: 'vite-config:app',
            path: 'vite.config.ts',
            authority: 'none',
          },
          {
            id: 'write-tsconfig',
            kind: 'writeStructuredFile',
            owner: 'materializer:typescript-config',
            surfaceId: 'typescript-config:root',
            path: 'tsconfig.json',
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

        const viteConfig = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'vite.config.ts'), 'utf8'))
        assert.equal(viteConfig, `import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
})
`)

        const tsconfig = yield* Effect.promise(() =>
          readJson<{
            compilerOptions: { jsx: string, types: readonly string[] }
            include: readonly string[]
          }>(path.join(targetDir, 'tsconfig.json')),
        )
        assert.equal(tsconfig.compilerOptions.jsx, 'react-jsx')
        assert.deepEqual(tsconfig.compilerOptions.types, ['vite/client'])
        assert.deepEqual(tsconfig.include, ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts'])

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
            materializer: 'react-app-static',
            owner: 'capability:react-app',
          },
          {
            id: 'react-app-entry:app',
            materializer: 'frontend-entry',
            owner: 'capability:react-app',
          },
          {
            id: 'react-app-shell:app',
            materializer: 'react-app-shell',
            owner: 'capability:react-app',
          },
          {
            id: 'vite-config:app',
            materializer: 'vite-config',
            owner: 'capability:react-app',
          },
          {
            id: 'typescript-config:root',
            materializer: 'typescript-config',
            owner: 'prelude',
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
            creator: 'materializer:frontend-entry',
            authority: 'none',
            operationId: 'write-react-main',
          },
          {
            path: 'vite.config.ts',
            creator: 'materializer:vite-config',
            authority: 'none',
            operationId: 'write-vite-config',
          },
          {
            path: 'tsconfig.json',
            creator: 'materializer:typescript-config',
            authority: 'none',
            operationId: 'write-tsconfig',
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
            checkedPaths: ['package.json', 'index.html', 'src/main.tsx', 'src/App.tsx', 'vite.config.ts', 'tsconfig.json'],
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
          'vite.config.ts',
          'tsconfig.json',
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
            checkedPaths: ['package.json', 'index.html', 'src/main.tsx', 'src/App.tsx', 'vite.config.ts', 'tsconfig.json'],
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
            { path: 'vite.config.ts', authority: 'none' },
            { path: 'tsconfig.json', authority: 'none' },
            { path: 'src/App.tsx', authority: 'none' },
          ],
        )
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  it('integrates effect-harness as the ai-harness provider under .prelude', async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const targetDir = yield* Effect.promise(makeTempProjectDir)

        const result = yield* createProjectFromSpec({
          spec: {
            topology: 'single-package',
            package: {
              id: 'worker',
              name: makePackageName('demo-worker'),
              capabilities: ['effect-package'],
            },
            rootCapabilities: ['package-manager:pnpm', 'ai-harness'],
            providers: ['effect-harness'],
            overrides: {},
          },
          targetDir: makeTargetDir(targetDir),
          preludeVersion: '0.0.0-test',
        })

        const writeOperations = result.writePlan.operations.map(operation => ({
          id: operation.id,
          kind: operation.kind,
          owner: operation.owner,
          path: operation.path,
          authority: operation.authority,
        }))
        assert.deepEqual(writeOperations.slice(0, 4), [
          {
            id: 'write-package-json',
            kind: 'writeStructuredFile',
            owner: 'materializer:package-json',
            path: 'package.json',
            authority: 'none',
          },
          {
            id: 'write-root-source',
            kind: 'writeGeneratedUserFile',
            owner: 'capability:effect-package',
            path: 'src/index.ts',
            authority: 'none',
          },
          {
            id: 'write-tsconfig',
            kind: 'writeGeneratedUserFile',
            owner: 'capability:effect-package',
            path: 'tsconfig.json',
            authority: 'none',
          },
          {
            id: 'write-effect-harness-provider-record',
            kind: 'writeStructuredFile',
            owner: 'materializer:provider-artifact',
            path: '.prelude/providers/effect-harness/provider.json',
            authority: 'owner',
          },
        ])
        assert.ok(writeOperations.some(operation => operation.path === '.effect-harness.json' && operation.authority === 'owner'))
        assert.ok(writeOperations.some(operation => operation.path === 'AGENTS.md' && operation.kind === 'writeManagedBlock' && operation.authority === 'bounded'))
        assert.ok(writeOperations.some(operation => operation.path === '.codex/skills/effect-code/SKILL.md' && operation.authority === 'owner'))
        assert.ok(writeOperations.some(operation => operation.path === '.codex/agents/effect-worker.md' && operation.authority === 'owner'))

        const packageJson = yield* Effect.promise(() => readJson(path.join(targetDir, 'package.json')))
        assert.deepEqual(packageJson, {
          name: 'demo-worker',
          type: 'module',
          version: '0.0.0',
          packageManager: 'pnpm@10.33.4',
          scripts: {
            'build': 'tsgo --noEmit --project tsconfig.json',
            'effect:status': 'node "/Users/sayori/Desktop/yume-infra/effect-harness/dist/bin/effect-harness.js" status',
            'effect:verify': 'node "/Users/sayori/Desktop/yume-infra/effect-harness/dist/bin/effect-harness.js" verify --target .',
            'typecheck': 'tsgo --noEmit --project tsconfig.json',
            'verify': 'pnpm build && pnpm typecheck && pnpm effect:verify',
          },
          dependencies: {
            '@effect/platform-node': '4.0.0-beta.90',
            'effect': '4.0.0-beta.90',
          },
          devDependencies: {
            '@effect/language-service': '0.86.2',
            '@effect/tsgo': '0.14.6',
            '@effect/vitest': '4.0.0-beta.90',
            '@types/node': 'catalog:',
            '@typescript/native-preview': '7.0.0-dev.20260624.1',
            'typescript': 'catalog:',
          },
        })

        const source = yield* Effect.promise(() => fs.readFile(path.join(targetDir, 'src/index.ts'), 'utf8'))
        assert.equal(source, `import { NodeRuntime } from '@effect/platform-node'
import { Console, Effect } from 'effect'

const main = Effect.fn('main')(function* () {
  yield* Console.log("demo-worker ready")
})

NodeRuntime.runMain(main())
`)

        const tsconfig = yield* Effect.promise(() => readJson(path.join(targetDir, 'tsconfig.json')))
        assert.deepEqual(tsconfig, {
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
            skipLibCheck: true,
            types: ['node'],
            plugins: [
              {
                name: '@effect/language-service',
                options: {
                  diagnosticSeverity: {
                    floatingEffect: 'error',
                  },
                },
              },
            ],
          },
          include: ['src/**/*.ts'],
        })

        const providerArtifact = yield* Effect.promise(() =>
          readJson<{
            id: string
            projectedContext: unknown
            lifecycleSurfaces: string[]
          }>(path.join(targetDir, '.prelude/providers/effect-harness/provider.json')),
        )
        assert.equal(providerArtifact.id, 'effect-harness')
        assert.deepEqual(providerArtifact.projectedContext, {
          topology: 'single-package',
          packageScopes: ['worker'],
          rootCapabilities: ['package-manager:pnpm', 'ai-harness'],
          packageCapabilities: {
            worker: ['effect-package'],
          },
        })
        assert.ok(Array.isArray(providerArtifact.lifecycleSurfaces))
        assert.ok(providerArtifact.lifecycleSurfaces.includes('provider-artifact:effect-harness'))
        assert.ok(providerArtifact.lifecycleSurfaces.includes('package-manifest:root:/dependencies/effect'))
        assert.ok(providerArtifact.lifecycleSurfaces.includes('package-manifest:root:/scripts/effect:verify'))
        assert.ok(providerArtifact.lifecycleSurfaces.includes('tsconfig:root:/compilerOptions/plugins'))
        assert.ok(providerArtifact.lifecycleSurfaces.includes('provider-managed-file:effect-harness:.effect-harness.json'))
        assert.ok(providerArtifact.lifecycleSurfaces.includes('provider-managed-file:effect-harness:.codex/skills/effect-code/SKILL.md'))
        assert.ok(providerArtifact.lifecycleSurfaces.includes('provider-managed-block:effect-harness:AGENTS.md#effect-harness'))
        const manifest = yield* Effect.promise(() =>
          readJson<{
            createSpec: { providers: unknown }
            resolvedGraph: { providers: unknown, logicalSurfaces: unknown, verification: unknown }
            lifecycleProviders: Array<{
              id: string
              projectedContext: unknown
              lifecycleSurfaces: string[]
              verificationRecordId: string
            }>
            lifecycleSurfaces: Array<{
              id: string
              owner: string
              lifecycle: string
              kind: string
              path: string
              pointer?: string
            }>
            generatedUserSurfaces: Array<{ path: string, authority: string }>
            verificationRecords: unknown
          }>(path.join(targetDir, '.prelude/manifest.json')),
        )
        assert.deepEqual(manifest.createSpec.providers, ['effect-harness'])
        assert.deepEqual(manifest.resolvedGraph.providers, [
          {
            id: 'effect-harness',
            contractVersion: '1',
            artifactVersion: '0.1.0',
            packageScopes: ['worker'],
          },
        ])
        assert.deepEqual(manifest.resolvedGraph.logicalSurfaces, [
          {
            id: 'package-manifest:root',
            materializer: 'package-json',
            owner: 'prelude',
          },
          {
            id: 'provider:effect-harness',
            materializer: 'provider-artifact',
            owner: 'capability:ai-harness',
          },
          {
            id: 'source:root/src/index.ts',
            materializer: 'generated-user-file',
            owner: 'capability:effect-package',
          },
          {
            id: 'tsconfig:root',
            materializer: 'generated-user-file',
            owner: 'capability:effect-package',
          },
        ])
        assert.deepEqual(
          manifest.resolvedGraph.verification,
          ['minimal-create-files-present', 'provider:effect-harness:create-contract'],
        )
        assert.equal(manifest.lifecycleProviders.length, 1)
        const providerRecord = manifest.lifecycleProviders[0]!
        assert.equal(providerRecord.id, 'effect-harness')
        assert.equal(providerRecord.verificationRecordId, 'provider:effect-harness:create-contract')
        assert.deepEqual(providerRecord.projectedContext, {
          topology: 'single-package',
          packageScopes: ['worker'],
          rootCapabilities: ['package-manager:pnpm', 'ai-harness'],
          packageCapabilities: {
            worker: ['effect-package'],
          },
        })
        assert.deepEqual(
          providerRecord.lifecycleSurfaces,
          manifest.lifecycleSurfaces.map(surface => surface.id),
        )

        const surfaceIds = new Set(manifest.lifecycleSurfaces.map(surface => surface.id))
        assert.ok(surfaceIds.has('provider-artifact:effect-harness'))
        assert.ok(surfaceIds.has('package-manifest:root:/dependencies/effect'))
        assert.ok(surfaceIds.has('package-manifest:root:/scripts/effect:verify'))
        assert.ok(surfaceIds.has('tsconfig:root:/compilerOptions/plugins'))
        assert.ok(surfaceIds.has('provider-managed-file:effect-harness:.effect-harness.json'))
        assert.ok(surfaceIds.has('provider-managed-block:effect-harness:AGENTS.md#effect-harness'))
        assert.ok(surfaceIds.has('provider-managed-file:effect-harness:.codex/agents/effect-worker.md'))
        assert.ok(
          manifest.lifecycleSurfaces.every(surface =>
            surface.owner === 'provider:effect-harness'
            && surface.lifecycle === 'managed'
            && !surface.path.startsWith('src/')),
          'only provider runtime assets and package/config pointers are managed',
        )
        assert.deepEqual(
          manifest.generatedUserSurfaces.map(surface => ({ path: surface.path, authority: surface.authority })),
          [
            { path: 'package.json', authority: 'none' },
            { path: 'src/index.ts', authority: 'none' },
            { path: 'tsconfig.json', authority: 'none' },
          ],
        )
        assert.deepEqual(manifest.verificationRecords, [
          {
            id: 'minimal-create-files-present',
            status: 'passed',
            checkedPaths: ['package.json', 'src/index.ts', 'tsconfig.json'],
          },
          {
            id: 'provider:effect-harness:create-contract',
            status: 'passed',
            checkedPaths: ['package.json', '.prelude/providers/effect-harness/provider.json'],
          },
        ])
      }).pipe(Effect.provide(TestLayer)),
    )
  })

  it.effect('dedupes equal structured package keys and blocks incompatible values before writes', () =>
    Effect.gen(function* () {
      const dedupedPlan = yield* materializeWritePlan([
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
      ])

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

      const conflictResult = yield* Effect.result(materializeWritePlan([
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
      ]))

      assert.equal(conflictResult._tag, 'Failure')
      if (conflictResult._tag === 'Failure') {
        assert.include(conflictResult.failure.message, 'Conflicting package-manifest:root contribution at /scripts/lint')
        assert.include(conflictResult.failure.message, 'capability:alpha-linting')
        assert.include(conflictResult.failure.message, 'capability:beta-linting')
      }
    }))

  it.effect('blocks provider artifact operations outside the provider namespace before writes', () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(materializeWritePlan([
        {
          kind: 'providerArtifact',
          surfaceId: 'provider:effect-harness',
          owner: 'provider:effect-harness',
          providerId: 'effect-harness',
          path: 'package.json',
          value: {
            id: 'effect-harness',
          },
        },
      ]))

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.include(result.failure.message, 'Provider effect-harness declared unsupported artifact path "package.json"')
        assert.include(result.failure.message, 'Provider artifacts must stay under .prelude/providers/effect-harness/')
      }
    }))

  it.effect('blocks provider-managed paths with Windows separators before writes', () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(materializeWritePlan([
        {
          kind: 'providerManagedFile',
          surfaceId: 'provider-managed-file:effect-harness:..\\outside.txt',
          operationId: 'write-effect-harness-outside',
          owner: 'provider:effect-harness',
          providerId: 'effect-harness',
          path: '..\\outside.txt',
          content: '',
        },
      ]))

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.include(result.failure.message, 'unsupported managed file path')
      }
    }))

  it.effect('blocks duplicate provider-managed targets before writes', () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(materializeWritePlan([
        {
          kind: 'providerManagedBlock',
          surfaceId: 'provider-managed-block:effect-harness:AGENTS.md#one',
          operationId: 'write-effect-harness-agents-one',
          owner: 'provider:effect-harness',
          providerId: 'effect-harness',
          path: 'AGENTS.md',
          startMarker: '<!-- effect-harness:start -->',
          endMarker: '<!-- effect-harness:end -->',
          content: '<!-- effect-harness:start -->\none\n<!-- effect-harness:end -->\n',
        },
        {
          kind: 'providerManagedBlock',
          surfaceId: 'provider-managed-block:effect-harness:AGENTS.md#two',
          operationId: 'write-effect-harness-agents-two',
          owner: 'provider:effect-harness',
          providerId: 'effect-harness',
          path: 'AGENTS.md',
          startMarker: '<!-- effect-harness:start -->',
          endMarker: '<!-- effect-harness:end -->',
          content: '<!-- effect-harness:start -->\ntwo\n<!-- effect-harness:end -->\n',
        },
      ]))

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.include(result.failure.message, 'Conflicting provider-managed contribution')
      }
    }))

  it.effect('keeps provider-managed write operations aligned with manifest lifecycle surfaces', () =>
    Effect.gen(function* () {
      const targetDir = yield* Effect.promise(makeTempProjectDir)

      const result = yield* createProjectFromSpec({
        spec: {
          topology: 'single-package',
          package: {
            id: 'worker',
            name: makePackageName('demo-worker'),
            capabilities: ['effect-package'],
          },
          rootCapabilities: ['package-manager:pnpm', 'ai-harness'],
          providers: ['effect-harness'],
          overrides: {},
        },
        targetDir: makeTargetDir(targetDir),
        preludeVersion: '0.0.0-test',
      })

      const manifest = yield* Effect.promise(() =>
        readJson<{
          lifecycleSurfaces: Array<{ id: string, operationId: string }>
        }>(path.join(targetDir, '.prelude/manifest.json')),
      )
      const managedOperations = result.writePlan.operations
        .filter(operation => operation.owner === 'provider:effect-harness')
        .map(operation => ({
          id: operation.surfaceId,
          operationId: operation.id,
        }))
        .sort((left, right) => left.id.localeCompare(right.id))
      const managedSurfaces = manifest.lifecycleSurfaces
        .filter(surface => surface.id.startsWith('provider-managed-'))
        .map(surface => ({
          id: surface.id,
          operationId: surface.operationId,
        }))
        .sort((left, right) => left.id.localeCompare(right.id))

      assert.deepEqual(managedOperations, managedSurfaces)
    }).pipe(Effect.provide(TestLayer)))

  it.effect('blocks ai-harness when the selected provider is missing', () =>
    Effect.gen(function* () {
      const targetDir = yield* Effect.promise(makeTempProjectDir)

      const result = yield* Effect.result(
        createProjectFromSpec({
          spec: {
            topology: 'single-package',
            package: {
              id: 'worker',
              name: makePackageName('demo-worker'),
              capabilities: ['effect-package'],
            },
            rootCapabilities: ['ai-harness'],
            providers: [],
            overrides: {},
          },
          targetDir: makeTargetDir(targetDir),
          preludeVersion: '0.0.0-test',
        }),
      )

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.include(result.failure.message, 'Unsupported CreateSpec for the minimal creation path')
        assert.include(result.failure.message, 'ai-harness requires provider: effect-harness')
      }
    }).pipe(Effect.provide(TestLayer)))

  it.effect('blocks package capabilities whose registry requirements are not selected', () =>
    Effect.gen(function* () {
      const targetDir = yield* Effect.promise(makeTempProjectDir)

      const result = yield* Effect.result(
        createProjectFromSpec({
          spec: {
            topology: 'single-package',
            package: {
              id: 'app',
              name: makePackageName('demo-app'),
              capabilities: ['minimal-node-package', 'state:jotai'],
            },
            rootCapabilities: [],
            providers: [],
            overrides: {},
          },
          targetDir: makeTargetDir(targetDir),
          preludeVersion: '0.0.0-test',
        }),
      )

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.include(result.failure.message, 'Unsupported CreateSpec for the minimal creation path')
        assert.include(result.failure.message, 'state:jotai requires react-app for app')
      }
    }).pipe(Effect.provide(TestLayer)))

  it.effect('blocks unsupported spec branches instead of silently dropping them', () =>
    Effect.gen(function* () {
      const targetDir = yield* Effect.promise(makeTempProjectDir)

      const result = yield* Effect.result(
        createProjectFromSpec({
          spec: {
            topology: 'workspace',
            rootCapabilities: ['unsupported-root-capability'],
            providers: ['effect-harness'],
            overrides: {},
          } as never,
          targetDir: makeTargetDir(targetDir),
          preludeVersion: '0.0.0-test',
        }),
      )

      assert.equal(result._tag, 'Failure')
      if (result._tag === 'Failure') {
        assert.include(result.failure.message, 'Unsupported CreateSpec for the minimal creation path')
        assert.include(result.failure.message, 'workspace topology requires packages')
        assert.include(result.failure.message, 'unsupported root capabilities: unsupported-root-capability')
        assert.include(result.failure.message, 'providers require root capability: ai-harness')
        assert.include(result.failure.message, 'workspace effect-harness requires at least one package scope')
      }
    }).pipe(Effect.provide(TestLayer)))
})
