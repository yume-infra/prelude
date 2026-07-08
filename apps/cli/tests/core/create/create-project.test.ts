import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { makePackageName } from '@/brand/package-name'
import { makeTargetDir } from '@/brand/target-dir'
import { createProjectFromSpec, materializeWritePlan } from '@/core/create'
import { effectHarnessProviderDiscoveryDecodeService, EffectHarnessProviderDiscoveryService } from '@/core/create/effect-harness-discovery'
import { FsLive } from '@/core/services/fs'
import { assertPathDoesNotExist, makeTempProjectDir, pathExists, pathJoinSync, readFileString, readJson } from '../../support/effect-files'
import { effectHarnessDiscoveryFixture, EffectHarnessDiscoveryTestLayer } from '../../support/effect-harness-discovery'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

const invalidDiscoveryService = effectHarnessProviderDiscoveryDecodeService({
  schemaVersion: 1,
  provider: {
    id: 'effect-harness',
    contractVersion: '1',
    providerVersion: '0.1.0',
    defaultProfile: 'codex-effect-v4',
  },
})

function publicPackageDiscoveryMissing(
  field: 'packageArtifactIdentity' | 'semanticContributions' | 'artifactOnlyReferenceAudit',
) {
  const discovery: Record<string, unknown> = { ...effectHarnessDiscoveryFixture }
  delete discovery[field]
  return discovery
}

describe('create spec creation path', () => {
  it.layer(TestLayer)((it) => {
    it.effect('creates a minimal single-package project without a create manifest ledger', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-')

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

      const packageJson = yield* readJson(pathJoinSync(targetDir, 'package.json'))
      assert.deepEqual(packageJson, {
        name: 'demo-app',
        type: 'module',
        version: '0.0.0',
        scripts: {
          build: 'tsc --noEmit',
        },
      })

      const source = yield* readFileString(pathJoinSync(targetDir, 'src/index.ts'))
      assert.equal(source, 'export {}\n')

      yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('materializes root engineering capabilities through logical surfaces', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-')

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

      const packageJson = yield* readJson(pathJoinSync(targetDir, 'package.json'))
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

      const eslintConfig = yield* readFileString(pathJoinSync(targetDir, 'eslint.config.mjs'))
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

      const knipConfig = yield* readJson(pathJoinSync(targetDir, 'knip.json'))
      assert.deepEqual(knipConfig, {
        $schema: 'https://unpkg.com/knip@6/schema.json',
      })

      yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('creates a React package runtime through package manifest and app shell surfaces', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-')

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

      const packageJson = yield* readJson(pathJoinSync(targetDir, 'package.json'))
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

      const appShell = yield* readFileString(pathJoinSync(targetDir, 'src/App.tsx'))
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

      const mainSource = yield* readFileString(pathJoinSync(targetDir, 'src/main.tsx'))
      assert.equal(mainSource, `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`)

      const viteConfig = yield* readFileString(pathJoinSync(targetDir, 'vite.config.ts'))
      assert.equal(viteConfig, `import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
})
`)

      const tsconfig = yield* readJson<{
        compilerOptions: { jsx: string, types: readonly string[] }
        include: readonly string[]
      }>(pathJoinSync(targetDir, 'tsconfig.json'))
      assert.equal(tsconfig.compilerOptions.jsx, 'react-jsx')
      assert.deepEqual(tsconfig.compilerOptions.types, ['vite/client'])
      assert.deepEqual(tsconfig.include, ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts'])

      yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('combines React package runtime output with root engineering surfaces', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-')

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

      const packageJson = yield* readJson(pathJoinSync(targetDir, 'package.json'))
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

      yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('integrates effect-harness as the ai-harness provider under .prelude', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-')

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
      assert.includeDeepMembers(writeOperations, [
        {
          id: 'write-package-json',
          kind: 'writeStructuredFile',
          owner: 'materializer:package-json',
          path: 'package.json',
          authority: 'none',
        },
        {
          id: 'write-eslint-config',
          kind: 'writeGeneratedUserFile',
          owner: 'materializer:eslint-config',
          path: 'eslint.config.mjs',
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
      assert.isFalse(writeOperations.some(operation => operation.path === 'AGENTS.md'))
      assert.isFalse(writeOperations.some(operation => operation.path.startsWith('.codex/')))

      const packageJson = yield* readJson(pathJoinSync(targetDir, 'package.json'))
      assert.deepEqual(packageJson, {
        name: 'demo-worker',
        type: 'module',
        version: '0.0.0',
        packageManager: 'pnpm@10.33.4',
        scripts: {
          build: 'tsgo --noEmit',
          lint: 'eslint',
          prepare: 'effect-tsgo patch',
          test: 'vitest run',
          typecheck: 'tsgo --noEmit',
          verify: 'pnpm build && pnpm typecheck && pnpm test && pnpm lint --max-warnings 0',
        },
        dependencies: {
          '@effect/platform-node': '4.0.0-beta.92',
          'effect': '4.0.0-beta.92',
        },
        devDependencies: {
          '@effect/language-service': '0.86.2',
          '@effect/tsgo': '0.15.0',
          '@effect/vitest': '4.0.0-beta.92',
          '@antfu/eslint-config': '^9.0.0',
          '@types/node': 'catalog:',
          '@typescript/native-preview': '7.0.0-dev.20260630.1',
          'eslint': '^10.3.0',
          'typescript': 'catalog:',
          'vitest': '^4.1.8',
        },
      })

      const source = yield* readFileString(pathJoinSync(targetDir, 'src/index.ts'))
      assert.equal(source, `import { NodeRuntime } from '@effect/platform-node'
import { Console, Effect } from 'effect'

const main = Effect.fn('main')(function* () {
  yield* Console.log("demo-worker ready")
})

NodeRuntime.runMain(main())
`)

      const tsconfig = yield* readJson(pathJoinSync(targetDir, 'tsconfig.json'))
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
              diagnostics: true,
              includeSuggestionsInTsc: true,
              ignoreEffectSuggestionsInTscExitCode: false,
              ignoreEffectWarningsInTscExitCode: false,
              ignoreEffectErrorsInTscExitCode: false,
              diagnosticSeverity: {
                floatingEffect: 'error',
                missingEffectError: 'error',
              },
              barrelImportPackages: ['effect'],
            },
          ],
        },
        include: ['src/**/*.ts'],
      })

      const providerRecord = yield* readJson<{
        id: string
        projectedContext: unknown
        options: { effect: { packageBaseline: Record<string, string> }, policies: Record<string, unknown> }
        runtime: { targetManagedSurfaces: { contributions: Record<string, unknown> } }
        surfaces: Array<{ id: string, owner: string, lifecycle: string, kind: string, path: string, pointer?: string }>
      }>(pathJoinSync(targetDir, '.prelude/providers/effect-harness/provider.json'))
      assert.equal(providerRecord.id, 'effect-harness')
      assert.deepEqual(providerRecord.projectedContext, {
        topology: 'single-package',
        packageScopes: ['worker'],
        packagePaths: {},
        rootCapabilities: ['package-manager:pnpm', 'ai-harness'],
        packageCapabilities: {
          worker: ['effect-package'],
        },
      })
      const providerSurfaceIds = new Set(providerRecord.surfaces.map(surface => surface.id))
      assert.ok(providerSurfaceIds.has('package-manifest:root:/dependencies/effect'))
      assert.ok(providerSurfaceIds.has('package-manifest:root:/scripts/prepare'))
      assert.ok(providerSurfaceIds.has('package-manifest:root:/scripts/typecheck'))
      assert.ok(providerSurfaceIds.has('package-manifest:root:/scripts/test'))
      assert.ok(providerSurfaceIds.has('package-manifest:root:/scripts/lint'))
      assert.isFalse(providerSurfaceIds.has('package-manifest:root:/scripts/effect:verify'))
      assert.ok(providerSurfaceIds.has('tsconfig:root:/compilerOptions/plugins'))
      assert.ok(providerSurfaceIds.has('provider-managed-file:effect-harness:.prelude/providers/effect-harness/eslint.config.mjs'))
      assert.ok(providerSurfaceIds.has('provider-managed-file:effect-harness:.prelude/providers/effect-harness/docs/discovery.md'))
      assert.ok(providerSurfaceIds.has('provider-managed-file:effect-harness:.prelude/providers/effect-harness/snippets/agents.md'))
      assert.isFalse([...providerSurfaceIds].some(surfaceId => surfaceId.includes('.codex/')))
      assert.isFalse([...providerSurfaceIds].some(surfaceId => surfaceId.includes('AGENTS.md#effect-harness')))
      assert.deepEqual(providerRecord.options.effect.packageBaseline, {
        'effect': '4.0.0-beta.92',
        '@effect/platform-node': '4.0.0-beta.92',
        '@effect/vitest': '4.0.0-beta.92',
        '@effect/tsgo': '0.15.0',
        '@effect/language-service': '0.86.2',
        '@typescript/native-preview': '7.0.0-dev.20260630.1',
        '@antfu/eslint-config': '^9.0.0',
        'eslint': '^10.3.0',
        'vitest': '^4.1.8',
      })
      assert.deepEqual(Object.keys(providerRecord.options.policies).sort(), [
        'editorPolicy',
        'lintGuardrails',
        'testPolicy',
        'verificationPolicy',
      ])
      assert.deepEqual(Object.keys(providerRecord.runtime.targetManagedSurfaces.contributions).sort(), [
        'editorPolicy',
        'lintGuardrails',
        'packageJson',
        'testPolicy',
        'tsconfig',
        'verificationPolicy',
      ])
      const manifest = yield* readJson<{
        maintainProviders: Array<{
          id: string
          contractVersion: string
          providerVersion: string
          profile: string
          recordPath: string
        }>
        verificationRecords: unknown
      }>(pathJoinSync(targetDir, '.prelude/manifest.json'))
      assert.deepEqual(Object.keys(manifest).sort(), [
        'maintainProviders',
        'preludeVersion',
        'schemaVersion',
        'verificationRecords',
      ])
      assert.deepEqual(manifest.maintainProviders, [
        {
          id: 'effect-harness',
          contractVersion: '1',
          providerVersion: '0.1.0',
          profile: 'codex-effect-v4',
          recordPath: '.prelude/providers/effect-harness/provider.json',
        },
      ])
      assert.ok(
        providerRecord.surfaces.every(surface =>
          surface.owner === 'provider:effect-harness'
          && surface.lifecycle === 'managed'
          && !surface.path.startsWith('src/')),
        'provider-managed surfaces must not include target source files',
      )
      const discoveryDoc = yield* readFileString(pathJoinSync(targetDir, '.prelude/providers/effect-harness/docs/discovery.md'))
      const agentsSnippet = yield* readFileString(pathJoinSync(targetDir, '.prelude/providers/effect-harness/snippets/agents.md'))
      assert.include(discoveryDoc, 'provider-discover exposes target-managed surfaces')
      assert.include(agentsSnippet, 'Manual include snippet for target agents')
      assert.isFalse(yield* pathExists(pathJoinSync(targetDir, '.codex/skills/effect-code/SKILL.md')))
      assert.isFalse(yield* pathExists(pathJoinSync(targetDir, '.codex/agents/effect-worker.md')))
      assert.isFalse(yield* pathExists(pathJoinSync(targetDir, 'AGENTS.md')))
      assert.isFalse(yield* pathExists(pathJoinSync(targetDir, 'repos/effect/LLMS.md')))
      assert.isFalse(yield* pathExists(pathJoinSync(targetDir, 'harness/effect-routes.md')))
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
    }))

    it.effect('derives effect-harness provider identity from discovery output', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-create-')
      const discovery = {
        ...effectHarnessDiscoveryFixture,
        packageArtifactIdentity: {
          ...effectHarnessDiscoveryFixture.packageArtifactIdentity,
          packageVersion: '9.9.9-test',
          npmSelector: '@sayoriqwq/effect-harness@9.9.9-test',
          neutralDiscoveryCommand: 'npx --yes --package @sayoriqwq/effect-harness@9.9.9-test effect-harness provider-discover',
        },
        packageLocator: {
          ...effectHarnessDiscoveryFixture.packageLocator,
          packageName: '@sayoriqwq/effect-harness',
          packageVersion: '9.9.9-test',
          binName: 'effect-harness',
          binPath: 'dist/bin/effect-harness.js',
          discoveryCommand: 'npx --yes --package @sayoriqwq/effect-harness@9.9.9-test effect-harness provider-discover',
          packageFiles: ['dist', 'provider', 'harness', 'repos'],
        },
        provider: {
          ...effectHarnessDiscoveryFixture.provider,
          id: 'effect-harness',
          contractVersion: '7-test',
          providerVersion: '9.9.9-test',
          defaultProfile: 'codex-effect-v4',
        },
        artifactOnlyReferences: {
          ...effectHarnessDiscoveryFixture.artifactOnlyReferences,
          mode: 'provider-artifact-reference',
          targetDelivery: 'identity-only',
          packageSurface: ['dist', 'provider', 'harness', 'repos'],
          references: {
            'effect-source-tree': {
              sourceEntry: 'effect-official-source',
              path: 'repos/effect',
              targetDelivery: 'artifact-only',
            },
          },
        },
        sourceIdentities: {
          ...effectHarnessDiscoveryFixture.sourceIdentities,
          defaultSourceEntry: 'effect-official-source',
          sourceEntries: ['effect-official-source'],
          sourceBoundary: {
            providerRepoInternal: true,
            targetDelivery: 'identity-only',
            targetMustNotReceive: ['repos/effect'],
            allowedTargetSourceIdentity: ['artifact.sourceIdentities'],
          },
          providerSourceEntries: {},
          artifactReferences: {},
        },
      } as const

      yield* createProjectFromSpec({
        spec: {
          topology: 'single-package',
          package: {
            id: 'worker',
            name: makePackageName('discovered-worker'),
            capabilities: ['effect-package'],
          },
          rootCapabilities: ['package-manager:pnpm', 'ai-harness'],
          providers: ['effect-harness'],
          overrides: {},
        },
        targetDir: makeTargetDir(targetDir),
        preludeVersion: '0.0.0-test',
        providerDiscoveries: {
          effectHarness: discovery,
        },
      })

      const providerRecord = yield* readJson<{
        contractVersion: string
        providerVersion: string
        artifact: {
          packageLocator: { packageVersion: string, discoveryCommand: string }
          providerProfileRelativePath: string
          artifactOnlyReferences: { references: Record<string, unknown> }
          sourceIdentities: { defaultSourceEntry: string }
        }
      }>(pathJoinSync(targetDir, '.prelude/providers/effect-harness/provider.json'))
      assert.equal(providerRecord.contractVersion, '7-test')
      assert.equal(providerRecord.providerVersion, '9.9.9-test')
      assert.equal(providerRecord.artifact.packageLocator.packageVersion, '9.9.9-test')
      assert.equal(providerRecord.artifact.packageLocator.discoveryCommand, 'npx --yes --package @sayoriqwq/effect-harness@9.9.9-test effect-harness provider-discover')
      assert.equal(providerRecord.artifact.providerProfileRelativePath, 'provider/effect-harness.provider.json')
      assert.deepEqual(Object.keys(providerRecord.artifact.artifactOnlyReferences.references), ['effect-source-tree'])
      assert.equal(providerRecord.artifact.sourceIdentities.defaultSourceEntry, 'effect-official-source')
      assert.equal(Object.hasOwn(providerRecord.artifact, 'artifactRoot'), false)
      assert.equal(Object.hasOwn(providerRecord.artifact, 'providerProfilePath'), false)
    }))

    it.effect('reports invalid provider discovery output at the public create seam', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-create-')

        const result = yield* Effect.result(
          createProjectFromSpec({
            spec: {
              topology: 'single-package',
              package: {
                id: 'worker',
                name: makePackageName('invalid-discovery-worker'),
                capabilities: ['effect-package'],
              },
              rootCapabilities: ['package-manager:pnpm', 'ai-harness'],
              providers: ['effect-harness'],
              overrides: {},
            },
            targetDir: makeTargetDir(targetDir),
            preludeVersion: '0.0.0-test',
          }),
        )

        assert.equal(result._tag, 'Failure')
        if (result._tag === 'Failure') {
          assert.equal(result.failure._tag, 'SchemaContractError')
          if (!('schema' in result.failure)) {
            assert.fail('expected discovery failures to surface as SchemaContractError')
          }
          assert.equal(result.failure.schema, 'EffectHarnessProviderDiscovery')
          assert.include(result.failure.message, 'Invalid effect-harness provider discovery output')
          assert.include(result.failure.message, 'provider artifact discovery contract missing')
          assert.include(result.failure.message, 'expected object field packageArtifactIdentity')
        }
      }).pipe(Effect.provideService(EffectHarnessProviderDiscoveryService, invalidDiscoveryService)))

    it.effect('blocks effect-harness discovery without the public package artifact envelope instead of using old discovery fallback', () =>
      Effect.gen(function* () {
        const cases = [
          {
            field: 'packageArtifactIdentity',
            targetName: 'missing-package-artifact-identity-worker',
          },
          {
            field: 'semanticContributions',
            targetName: 'missing-semantic-contributions-worker',
          },
          {
            field: 'artifactOnlyReferenceAudit',
            targetName: 'missing-artifact-reference-audit-worker',
          },
        ] as const

        for (const testCase of cases) {
          const targetDir = yield* makeTempProjectDir('prelude-create-')
          const result = yield* Effect.result(
            createProjectFromSpec({
              spec: {
                topology: 'single-package',
                package: {
                  id: 'worker',
                  name: makePackageName(testCase.targetName),
                  capabilities: ['effect-package'],
                },
                rootCapabilities: ['package-manager:pnpm', 'ai-harness'],
                providers: ['effect-harness'],
                overrides: {},
              },
              targetDir: makeTargetDir(targetDir),
              preludeVersion: '0.0.0-test',
            }).pipe(
              Effect.provideService(
                EffectHarnessProviderDiscoveryService,
                effectHarnessProviderDiscoveryDecodeService(publicPackageDiscoveryMissing(testCase.field)),
              ),
            ),
          )

          assert.equal(result._tag, 'Failure', `${testCase.field} should block provider artifact discovery`)
          if (result._tag === 'Failure') {
            assert.equal(result.failure._tag, 'SchemaContractError')
            assert.include(result.failure.message, 'provider artifact')
            assert.include(result.failure.message, testCase.field)
          }
        }
      }))

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
            surfaceId: 'provider-managed-block:example-provider:NOTES.md#one',
            operationId: 'write-example-provider-notes-one',
            owner: 'provider:example-provider',
            providerId: 'example-provider',
            path: 'NOTES.md',
            startMarker: '<!-- example:start -->',
            endMarker: '<!-- example:end -->',
            content: '<!-- example:start -->\none\n<!-- example:end -->\n',
          },
          {
            kind: 'providerManagedBlock',
            surfaceId: 'provider-managed-block:example-provider:NOTES.md#two',
            operationId: 'write-example-provider-notes-two',
            owner: 'provider:example-provider',
            providerId: 'example-provider',
            path: 'NOTES.md',
            startMarker: '<!-- example:start -->',
            endMarker: '<!-- example:end -->',
            content: '<!-- example:start -->\ntwo\n<!-- example:end -->\n',
          },
        ]))

        assert.equal(result._tag, 'Failure')
        if (result._tag === 'Failure') {
          assert.include(result.failure.message, 'Conflicting provider-managed contribution')
        }
      }))

    it.effect('keeps provider-managed write operations aligned with provider record surfaces', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-create-')

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

        const providerRecord = yield* readJson<{
          surfaces: Array<{ id: string, kind: string, operationId: string }>
        }>(pathJoinSync(targetDir, '.prelude/providers/effect-harness/provider.json'))
        const managedOperations = result.writePlan.operations
          .filter(operation => operation.owner === 'provider:effect-harness')
          .map(operation => ({
            id: operation.surfaceId,
            operationId: operation.id,
          }))
          .sort((left, right) => left.id.localeCompare(right.id))
        const managedSurfaces = providerRecord.surfaces
          .filter(surface => surface.kind === 'ownedFile' && surface.id.startsWith('provider-managed-file:'))
          .map(surface => ({
            id: surface.id,
            operationId: surface.operationId,
          }))
          .sort((left, right) => left.id.localeCompare(right.id))

        assert.deepEqual(managedOperations, managedSurfaces)
        assert.ok(providerRecord.surfaces.some(surface =>
          surface.kind === 'managedBlock'
          && surface.id === 'provider-managed-block:effect-harness:eslint.config.mjs#provider-config'
          && surface.operationId === 'write-eslint-config'))
      }))

    it.effect('blocks ai-harness when the selected provider is missing', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-create-')

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
      }))

    it.effect('blocks package capabilities whose registry requirements are not selected', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-create-')

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
      }))

    it.effect('blocks unsupported spec branches instead of silently dropping them', () =>
      Effect.gen(function* () {
        const targetDir = yield* makeTempProjectDir('prelude-create-')

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
      }))
  })
})
