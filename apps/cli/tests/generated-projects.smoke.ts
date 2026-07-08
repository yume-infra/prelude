import type { PlatformError } from 'effect'
import assert from 'node:assert/strict'
import process from 'node:process'
import { NodeFileSystem } from '@effect/platform-node'
import { Effect, FileSystem, ManagedRuntime, Schema } from 'effect'
import { execa } from 'execa'
import { pathJoin } from '@/core/path-utils'

const repoRoot = decodeURIComponent(new URL('../../..', import.meta.url).pathname).replace(/\/$/u, '')
const cliEntry = pathJoin(repoRoot, 'apps/cli/dist/index.js')
const generatedRoot = pathJoin(repoRoot, 'apps/examples/.generated')
const fsRuntime = ManagedRuntime.make(NodeFileSystem.layer)
const decodeJsonString = Schema.decodeUnknownSync(Schema.UnknownFromJsonString)
const generatedWorkspace = `packages:
  - '*'

trustPolicy: no-downgrade

trustPolicyExclude:
  - '@effect/platform-node@4.0.0-beta.92'
  - '@effect/platform-node-shared@4.0.0-beta.92'
  - '@effect/vitest@4.0.0-beta.92'
  - effect@4.0.0-beta.92

overrides:
  '@effect/platform-node@4.0.0-beta.92>@effect/platform-node-shared': 4.0.0-beta.92

catalog:
  '@antfu/eslint-config': 8.2.0
  '@types/node': 25.6.0
  eslint: ^10.3.0
  knip: ^6.12.0
  tsdown: ^0.21.10
  turbo: ^2.9.9
  typescript: 6.0.3
`

const workerSpec = {
  topology: 'single-package',
  package: {
    id: 'worker',
    name: 'canonical-worker',
    capabilities: ['effect-package'],
  },
  rootCapabilities: ['package-manager:pnpm', 'linting', 'knip', 'ai-harness'],
  providers: ['effect-harness'],
  overrides: {},
} as const

const reactSpec = {
  topology: 'single-package',
  package: {
    id: 'app',
    name: 'react-frontend-fixture',
    capabilities: ['react-app', 'css:less', 'css:tailwind', 'router:react-router', 'state:jotai'],
  },
  rootCapabilities: ['package-manager:pnpm', 'linting', 'knip'],
  providers: [],
  overrides: {},
} as const

const vueSpec = {
  topology: 'single-package',
  package: {
    id: 'app',
    name: 'vue-frontend-fixture',
    capabilities: ['vue-app', 'css:less', 'css:tailwind', 'router:vue-router', 'state:pinia'],
  },
  rootCapabilities: ['package-manager:pnpm'],
  providers: [],
  overrides: {},
} as const

const backendSpec = {
  topology: 'single-package',
  package: {
    id: 'api',
    name: 'node-backend-fixture',
    capabilities: ['node-backend'],
  },
  rootCapabilities: ['package-manager:pnpm', 'linting', 'knip'],
  providers: [],
  overrides: {},
} as const

const librarySpec = {
  topology: 'single-package',
  package: {
    id: 'lib',
    name: 'library-package-fixture',
    capabilities: ['library'],
  },
  rootCapabilities: ['package-manager:pnpm'],
  providers: [],
  overrides: {},
} as const

const cliSpec = {
  topology: 'single-package',
  package: {
    id: 'cli',
    name: 'cli-tool-fixture',
    capabilities: ['cli-tool'],
  },
  rootCapabilities: ['package-manager:pnpm'],
  providers: [],
  overrides: {},
} as const

const workspaceSpec = {
  topology: 'workspace',
  packages: [
    {
      id: 'api',
      name: '@workspace-smoke/api',
      capabilities: ['node-backend'],
      internalDependencies: [
        {
          target: { by: 'id', value: 'shared' },
          alias: '@workspace-smoke/shared-runtime',
        },
      ],
    },
    {
      id: 'tool',
      name: '@workspace-smoke/tool',
      capabilities: ['cli-tool'],
      internalDependencies: [
        {
          target: { by: 'name', value: '@workspace-smoke/shared' },
        },
      ],
    },
    {
      id: 'shared',
      name: '@workspace-smoke/shared',
      capabilities: ['library'],
      internalDependencies: [],
    },
  ],
  rootCapabilities: ['package-manager:pnpm'],
  providers: [],
  overrides: {},
} as const

type SmokeSpec = typeof workerSpec | typeof reactSpec | typeof vueSpec | typeof backendSpec | typeof librarySpec | typeof cliSpec | typeof workspaceSpec

type SmokeIntentArea
  = | 'react'
    | 'vue'
    | 'node-backend'
    | 'cli'
    | 'library'
    | 'workspace'
    | 'internal-workspace-dependencies'
    | 'engineering-baseline'
    | 'harness'
    | 'renderable-app'

type SmokeExternalCheck
  = | 'install'
    | 'build'
    | 'typecheck'
    | 'lint'
    | 'run'
    | 'verify'
    | 'provider-contract'

const requiredSmokeIntentAreas = [
  'react',
  'vue',
  'node-backend',
  'cli',
  'library',
  'workspace',
  'internal-workspace-dependencies',
  'engineering-baseline',
  'harness',
  'renderable-app',
] as const satisfies readonly SmokeIntentArea[]

const requiredSmokeExternalChecks = [
  'install',
  'build',
  'typecheck',
  'lint',
  'run',
  'verify',
  'provider-contract',
] as const satisfies readonly SmokeExternalCheck[]

const smokeCoverageCases = [
  {
    targetName: smokeTargetName(workerSpec),
    spec: workerSpec,
    intentAreas: ['harness', 'engineering-baseline'],
    externalChecks: ['install', 'build', 'verify', 'provider-contract'],
  },
  {
    targetName: smokeTargetName(reactSpec),
    spec: reactSpec,
    intentAreas: ['react', 'renderable-app', 'engineering-baseline'],
    externalChecks: ['install', 'build', 'lint', 'verify'],
  },
  {
    targetName: smokeTargetName(vueSpec),
    spec: vueSpec,
    intentAreas: ['vue', 'renderable-app'],
    externalChecks: ['install', 'build'],
  },
  {
    targetName: smokeTargetName(backendSpec),
    spec: backendSpec,
    intentAreas: ['node-backend', 'engineering-baseline'],
    externalChecks: ['install', 'build', 'typecheck', 'lint', 'run', 'verify'],
  },
  {
    targetName: smokeTargetName(librarySpec),
    spec: librarySpec,
    intentAreas: ['library'],
    externalChecks: ['install', 'build', 'typecheck'],
  },
  {
    targetName: smokeTargetName(cliSpec),
    spec: cliSpec,
    intentAreas: ['cli'],
    externalChecks: ['install', 'build', 'typecheck', 'run'],
  },
  {
    targetName: smokeTargetName(workspaceSpec),
    spec: workspaceSpec,
    intentAreas: ['workspace', 'internal-workspace-dependencies', 'node-backend', 'cli', 'library'],
    externalChecks: ['install', 'build', 'typecheck'],
  },
] as const satisfies readonly {
  readonly targetName: string
  readonly spec: SmokeSpec
  readonly intentAreas: readonly SmokeIntentArea[]
  readonly externalChecks: readonly SmokeExternalCheck[]
}[]

function runFileEffect<A>(effect: Effect.Effect<A, PlatformError.PlatformError, FileSystem.FileSystem>) {
  return fsRuntime.runPromise(effect)
}

function withFileSystem<A>(f: (fs: FileSystem.FileSystem) => Effect.Effect<A, PlatformError.PlatformError>) {
  return runFileEffect(Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    return yield* f(fs)
  }))
}

function readFile(filePath: string, _encoding?: string) {
  return withFileSystem(fs => fs.readFileString(filePath))
}

function writeFile(filePath: string, content: string) {
  return withFileSystem(fs => fs.writeFileString(filePath, content))
}

function mkdir(filePath: string, options?: { readonly recursive?: boolean }) {
  return withFileSystem(fs => fs.makeDirectory(filePath, options))
}

function rm(filePath: string, options?: { readonly recursive?: boolean, readonly force?: boolean }) {
  return withFileSystem(fs => fs.remove(filePath, options))
}

function stat(filePath: string) {
  return withFileSystem(fs => fs.stat(filePath))
}

function readJson<T>(filePath: string) {
  return readFile(filePath, 'utf8').then(content => decodeJsonString(content) as T)
}

function smokeTargetName(spec: SmokeSpec) {
  return 'package' in spec ? spec.package.name : 'workspace-graph-fixture'
}

function assertSmokeCoverageContract() {
  assert.equal(generatedRoot, pathJoin(repoRoot, 'apps/examples/.generated'))

  const targetNames = new Set<string>()
  const coveredIntentAreas = new Set<SmokeIntentArea>()
  const coveredExternalChecks = new Set<SmokeExternalCheck>()
  const forbiddenSerializedSpecTerms = [
    'ProjectConfig',
    'PlanSpec',
    'Handlebars',
    'preset registry',
    'Trellis',
  ]

  for (const smokeCase of smokeCoverageCases) {
    assert.equal(smokeCase.targetName, smokeTargetName(smokeCase.spec))
    assert.equal(typeof smokeCase.spec.topology, 'string')
    assert.ok(Array.isArray(smokeCase.spec.rootCapabilities))
    assert.ok(Array.isArray(smokeCase.spec.providers))
    assert.equal(targetNames.has(smokeCase.targetName), false, `${smokeCase.targetName} is duplicated`)

    targetNames.add(smokeCase.targetName)
    for (const intentArea of smokeCase.intentAreas) {
      coveredIntentAreas.add(intentArea)
    }
    for (const externalCheck of smokeCase.externalChecks) {
      coveredExternalChecks.add(externalCheck)
    }

    const serializedSpec = JSON.stringify(smokeCase.spec)
    for (const forbiddenTerm of forbiddenSerializedSpecTerms) {
      assert.equal(
        serializedSpec.includes(forbiddenTerm),
        false,
        `smoke specs must stay CreateSpec-driven and not assert ${forbiddenTerm}`,
      )
    }
  }

  for (const requiredIntentArea of requiredSmokeIntentAreas) {
    assert.ok(coveredIntentAreas.has(requiredIntentArea), `smoke coverage is missing ${requiredIntentArea}`)
  }

  for (const requiredExternalCheck of requiredSmokeExternalChecks) {
    assert.ok(coveredExternalChecks.has(requiredExternalCheck), `smoke coverage is missing ${requiredExternalCheck}`)
  }

  assert.ok(
    smokeCoverageCases.some(smokeCase =>
      (smokeCase.intentAreas as readonly SmokeIntentArea[]).includes('harness')
      && (smokeCase.spec.providers as readonly string[]).includes('effect-harness'),
    ),
    'smoke coverage must include a provider/harness target',
  )
  assert.ok(
    smokeCoverageCases.some(smokeCase =>
      (smokeCase.intentAreas as readonly SmokeIntentArea[]).includes('renderable-app')),
    'smoke coverage must include a renderable app target',
  )
}

function assertGeneratedSmokeTargetsRemainInspectable() {
  return Promise.all(
    smokeCoverageCases.map(smokeCase =>
      stat(pathJoin(generatedRoot, smokeCase.targetName)).then((target) => {
        assert.equal(target.type, 'Directory', `${smokeCase.targetName} should remain inspectable after smoke assertions`)
      }),
    ),
  )
}

function assertPathDoesNotExist(filePath: string) {
  return stat(filePath).then(
    () => assert.fail(`${filePath} should not be written during dry-run smoke`),
    () => undefined,
  )
}

function assertDryRunDoesNotWrite(spec: SmokeSpec) {
  const targetName = 'dry-run-no-write'
  const dryRunDir = pathJoin(generatedRoot, targetName)

  return rm(dryRunDir, { recursive: true, force: true }).then(() =>
    execa('node', [
      cliEntry,
      '--spec',
      JSON.stringify(spec),
      '--name',
      targetName,
      '--no-input',
      '--dry-run',
    ], {
      cwd: generatedRoot,
      env: {
        ...process.env,
        CI: '1',
        FORCE_COLOR: '0',
      },
      timeout: 120_000,
    }),
  ).then((result) => {
    const output = JSON.parse(result.stdout) as {
      readonly operations: readonly { readonly path: string, readonly kind: string }[]
      readonly blockers: readonly unknown[]
    }

    assert.deepEqual(output.blockers, [])
    assert.ok(output.operations.some(operation => operation.path === 'package.json' && operation.kind === 'writeStructuredFile'))
    assert.ok(output.operations.some(operation => operation.path === 'src/index.ts' && operation.kind === 'writeGeneratedUserFile'))
    assert.match(result.stdout, /"operations"/u)
    assert.match(result.stdout, /"blockers"/u)
    assert.match(result.stdout, /package\.json/u)

    return Promise.all([
      assertPathDoesNotExist(dryRunDir),
      assertPathDoesNotExist(pathJoin(dryRunDir, 'package.json')),
      assertPathDoesNotExist(pathJoin(dryRunDir, '.prelude/manifest.json')),
    ])
  }).then(() => {
    process.stdout.write(`Generated dry-run smoke target (not written): ${dryRunDir}\n`)
  })
}

function createFromSpec(spec: SmokeSpec) {
  const targetName = smokeTargetName(spec)
  const generatedDir = pathJoin(generatedRoot, targetName)

  return rm(generatedDir, { recursive: true, force: true }).then(() =>
    execa('node', [
      cliEntry,
      '--spec',
      JSON.stringify(spec),
      '--name',
      targetName,
      '--no-input',
    ], {
      cwd: generatedRoot,
      env: {
        ...process.env,
        CI: '1',
        FORCE_COLOR: '0',
      },
      stdio: 'inherit',
      timeout: 120_000,
    }),
  ).then(() => {
    process.stdout.write(`Generated smoke target: ${generatedDir}\n`)
    return generatedDir
  })
}

assertSmokeCoverageContract()
await rm(generatedRoot, { recursive: true, force: true })
await mkdir(generatedRoot, { recursive: true })
await writeFile(pathJoin(generatedRoot, 'pnpm-workspace.yaml'), generatedWorkspace)
await assertDryRunDoesNotWrite(workerSpec)

const workerDir = await createFromSpec(workerSpec)
const workerPackageJson = await readJson<{
  name: string
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}>(pathJoin(workerDir, 'package.json'))
const workerKnipConfig = await readJson<{
  ignoreDependencies?: readonly string[]
}>(pathJoin(workerDir, 'knip.json'))
const workerSource = await readFile(pathJoin(workerDir, 'src/index.ts'), 'utf8')
const workerTsconfig = await readJson<{
  compilerOptions: { types: readonly string[], plugins: readonly { name: string }[] }
  include: readonly string[]
}>(pathJoin(workerDir, 'tsconfig.json'))
const workerVscodeSettings = await readJson<{
  'typescript.preferences.autoImportFileExcludePatterns'?: readonly string[]
  'javascript.preferences.autoImportFileExcludePatterns'?: readonly string[]
  'files.watcherExclude'?: Record<string, boolean>
  'search.exclude'?: Record<string, boolean>
  'files.exclude'?: Record<string, boolean>
}>(pathJoin(workerDir, '.vscode/settings.json'))
const workerZedSettings = await readJson<{
  lsp?: {
    'typescript-language-server'?: {
      initialization_options?: {
        preferences?: {
          autoImportFileExcludePatterns?: readonly string[]
        }
      }
    }
  }
  file_scan_exclusions?: readonly string[]
}>(pathJoin(workerDir, '.zed/settings.json'))
const workerManifest = await readJson<{
  maintainProviders: Array<{ id: string, recordPath: string }>
  verificationRecords: Array<{ id: string, checkedPaths: readonly string[] }>
}>(pathJoin(workerDir, '.prelude/manifest.json'))
const providerRecord = await readJson<{ id: string, surfaces: Array<{ id: string, owner: string, lifecycle: string, path: string }> }>(
  pathJoin(workerDir, '.prelude/providers/effect-harness/provider.json'),
)

assert.equal(workerPackageJson.name, workerSpec.package.name)
assert.equal(workerPackageJson.scripts.build, 'tsgo --noEmit')
assert.equal(workerPackageJson.scripts.lint, 'eslint')
assert.equal(workerPackageJson.scripts.knip, 'knip')
assert.equal(workerPackageJson.scripts.prepare, 'effect-tsgo patch')
assert.equal(workerPackageJson.scripts.typecheck, 'tsgo --noEmit')
assert.equal(workerPackageJson.scripts.verify, 'pnpm build && pnpm typecheck && pnpm test && pnpm lint --max-warnings 0 && pnpm knip')
assert.equal(workerPackageJson.scripts['effect:verify'], undefined)
assert.equal(workerPackageJson.devDependencies['@effect/tsgo'], '0.15.0')
assert.deepEqual(workerKnipConfig.ignoreDependencies, ['@effect/tsgo', '@effect/vitest'])
assert.match(workerSource, /Effect\.fn\('main'\)/u)
assert.match(workerSource, /NodeRuntime\.runMain\(main\(\)\)/u)
assert.match(workerSource, /canonical-worker ready/u)
assert.deepEqual(workerTsconfig.compilerOptions.types, ['node'])
assert.equal(workerTsconfig.compilerOptions.plugins[0]?.name, '@effect/language-service')
assert.deepEqual(workerTsconfig.include, ['src/**/*.ts'])
assert.deepEqual(workerVscodeSettings['typescript.preferences.autoImportFileExcludePatterns'], ['repos/**'])
assert.deepEqual(workerVscodeSettings['javascript.preferences.autoImportFileExcludePatterns'], ['repos/**'])
assert.deepEqual(workerVscodeSettings['files.watcherExclude'], { 'repos/**': true })
assert.deepEqual(workerVscodeSettings['search.exclude'], { 'repos/**': true })
assert.equal(workerVscodeSettings['files.exclude'], undefined)
assert.deepEqual(
  workerZedSettings.lsp?.['typescript-language-server']?.initialization_options?.preferences?.autoImportFileExcludePatterns,
  ['repos/**'],
)
assert.deepEqual(workerZedSettings.file_scan_exclusions, ['repos/**'])
assert.deepEqual(Object.keys(workerManifest).sort(), [
  'maintainProviders',
  'preludeVersion',
  'schemaVersion',
  'verificationRecords',
])
assert.deepEqual(workerManifest.maintainProviders.map(provider => provider.id), ['effect-harness'])
assert.equal(workerManifest.maintainProviders[0]?.recordPath, '.prelude/providers/effect-harness/provider.json')
assert.equal(providerRecord.id, 'effect-harness')
const providerSurfaceIds = new Set(providerRecord.surfaces.map(surface => surface.id))
assert.ok(providerSurfaceIds.has('tsconfig:root:/compilerOptions/plugins'))
assert.ok(providerSurfaceIds.has('provider-managed-block:effect-harness:eslint.config.mjs#provider-config'))
assert.ok(providerSurfaceIds.has('editor-settings:.vscode/settings.json:/typescript.preferences.autoImportFileExcludePatterns'))
assert.ok(providerSurfaceIds.has('editor-settings:.vscode/settings.json:/javascript.preferences.autoImportFileExcludePatterns'))
assert.ok(providerSurfaceIds.has('editor-settings:.vscode/settings.json:/files.watcherExclude'))
assert.ok(providerSurfaceIds.has('editor-settings:.vscode/settings.json:/search.exclude'))
assert.ok(providerSurfaceIds.has('editor-settings:.zed/settings.json:/lsp/typescript-language-server/initialization_options/preferences/autoImportFileExcludePatterns'))
assert.ok(providerSurfaceIds.has('editor-settings:.zed/settings.json:/file_scan_exclusions'))
assert.ok(providerSurfaceIds.has('provider-managed-file:effect-harness:.prelude/providers/effect-harness/docs/discovery.md'))
assert.ok(providerSurfaceIds.has('provider-managed-file:effect-harness:.prelude/providers/effect-harness/snippets/agents.md'))
assert.equal([...providerSurfaceIds].some(surfaceId => surfaceId.includes('/files.exclude')), false)
assert.equal(providerRecord.surfaces.some(surface => surface.path.startsWith('.codex/')), false)
assert.equal(providerRecord.surfaces.some(surface => surface.path === '.effect-harness.json'), false)
assert.equal(providerRecord.surfaces.some(surface => surface.path === 'AGENTS.md'), false)
assert.equal(providerRecord.surfaces.some(surface => surface.path.startsWith('repos/')), false)
assert.equal(providerRecord.surfaces.some(surface => surface.path.startsWith('harness/')), false)
assert.equal([...providerSurfaceIds].some(surfaceId => surfaceId.includes('AGENTS.md#effect-harness')), false)
await assertPathDoesNotExist(pathJoin(workerDir, '.codex'))
await assertPathDoesNotExist(pathJoin(workerDir, 'AGENTS.md'))
await assertPathDoesNotExist(pathJoin(workerDir, '.effect-harness.json'))
await assertPathDoesNotExist(pathJoin(workerDir, 'repos/effect/LLMS.md'))
await assertPathDoesNotExist(pathJoin(workerDir, 'harness/effect-routes.md'))
await assertPathDoesNotExist(pathJoin(workerDir, 'harness/tsgo-routes.md'))
assert.ok(
  providerRecord.surfaces.every(surface =>
    surface.owner === 'provider:effect-harness'
    && surface.lifecycle === 'managed'
    && !surface.path.startsWith('src/')),
  'effect-harness must not manage target source files',
)
assert.deepEqual(workerManifest.verificationRecords.map(record => record.id), [
  'minimal-create-files-present',
  'root-engineering-files-present',
  'provider:effect-harness:create-contract',
])

const reactDir = await createFromSpec(reactSpec)
const reactPackageJson = await readJson<{
  name: string
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}>(pathJoin(reactDir, 'package.json'))
const reactIndex = await readFile(pathJoin(reactDir, 'index.html'), 'utf8')
const reactMain = await readFile(pathJoin(reactDir, 'src/main.tsx'), 'utf8')
const reactApp = await readFile(pathJoin(reactDir, 'src/App.tsx'), 'utf8')
const reactViteConfig = await readFile(pathJoin(reactDir, 'vite.config.ts'), 'utf8')
const reactLessStyles = await readFile(pathJoin(reactDir, 'src/styles.less'), 'utf8')
const reactTailwindStyles = await readFile(pathJoin(reactDir, 'src/styles.css'), 'utf8')
const reactTsconfig = await readJson<{
  compilerOptions: { jsx: string, types: readonly string[] }
  include: readonly string[]
}>(pathJoin(reactDir, 'tsconfig.json'))
assert.equal(reactPackageJson.name, reactSpec.package.name)
assert.equal(reactPackageJson.scripts.dev, 'vite')
assert.equal(reactPackageJson.scripts.build, 'vite build')
assert.equal(reactPackageJson.scripts.lint, 'eslint .')
assert.equal(reactPackageJson.scripts.knip, 'knip')
assert.equal(reactPackageJson.dependencies.react, '^19.2.6')
assert.equal(reactPackageJson.dependencies['react-router'], '^8.0.1')
assert.equal(reactPackageJson.dependencies.jotai, '^2.20.1')
assert.equal(reactPackageJson.devDependencies['@vitejs/plugin-react'], '^6.0.1')
assert.equal(reactPackageJson.devDependencies['@tailwindcss/vite'], '^4.3.1')
assert.equal(reactPackageJson.devDependencies.less, '^4.6.7')
assert.equal(reactPackageJson.devDependencies.tailwindcss, '^4.3.1')
assert.equal(reactPackageJson.devDependencies.typescript, 'catalog:')
assert.equal(reactPackageJson.devDependencies.vite, '^8.0.9')
assert.match(reactIndex, /<div id="root"><\/div>/u)
assert.match(reactMain, /createRoot\(document\.getElementById\('root'\)!\)/u)
assert.match(reactMain, /import '\.\/styles\.less'/u)
assert.match(reactMain, /import '\.\/styles\.css'/u)
assert.match(reactApp, /BrowserRouter/u)
assert.match(reactApp, /Jotai count: \{readyCount\}/u)
assert.match(reactApp, /className="min-h-screen grid place-content-center gap-4 bg-slate-50 text-slate-900"/u)
assert.match(reactViteConfig, /@vitejs\/plugin-react/u)
assert.match(reactViteConfig, /@tailwindcss\/vite/u)
assert.match(reactLessStyles, /@surface-bg/u)
assert.match(reactTailwindStyles, /@import "tailwindcss";/u)
assert.deepEqual(reactTsconfig.compilerOptions.types, ['vite/client'])
assert.equal(reactTsconfig.compilerOptions.jsx, 'react-jsx')
assert.deepEqual(reactTsconfig.include, ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts'])
await assertPathDoesNotExist(pathJoin(reactDir, '.prelude/manifest.json'))

const vueDir = await createFromSpec(vueSpec)
const vuePackageJson = await readJson<{
  name: string
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}>(pathJoin(vueDir, 'package.json'))
const vueIndex = await readFile(pathJoin(vueDir, 'index.html'), 'utf8')
const vueMain = await readFile(pathJoin(vueDir, 'src/main.ts'), 'utf8')
const vueApp = await readFile(pathJoin(vueDir, 'src/App.vue'), 'utf8')
const vueViteConfig = await readFile(pathJoin(vueDir, 'vite.config.ts'), 'utf8')
const vueLessStyles = await readFile(pathJoin(vueDir, 'src/styles.less'), 'utf8')
const vueTailwindStyles = await readFile(pathJoin(vueDir, 'src/styles.css'), 'utf8')
const vueTsconfig = await readJson<{
  compilerOptions: { types: readonly string[] }
  include: readonly string[]
}>(pathJoin(vueDir, 'tsconfig.json'))
assert.equal(vuePackageJson.name, vueSpec.package.name)
assert.equal(vuePackageJson.scripts.dev, 'vite')
assert.equal(vuePackageJson.scripts.build, 'vite build')
assert.equal(vuePackageJson.scripts.preview, 'vite preview')
assert.equal(vuePackageJson.dependencies.vue, '^3.5.39')
assert.equal(vuePackageJson.dependencies['vue-router'], '^5.1.0')
assert.equal(vuePackageJson.dependencies.pinia, '^3.0.4')
assert.equal(vuePackageJson.devDependencies['@vitejs/plugin-vue'], '^6.0.7')
assert.equal(vuePackageJson.devDependencies['@tailwindcss/vite'], '^4.3.1')
assert.equal(vuePackageJson.devDependencies.less, '^4.6.7')
assert.equal(vuePackageJson.devDependencies.tailwindcss, '^4.3.1')
assert.equal(vuePackageJson.devDependencies.typescript, 'catalog:')
assert.equal(vuePackageJson.devDependencies.vite, '^8.0.9')
assert.match(vueIndex, /<div id="app"><\/div>/u)
assert.match(vueMain, /createRouter/u)
assert.match(vueMain, /createPinia/u)
assert.match(vueMain, /createApp\(App\)\.use\(router\)\.use\(pinia\)\.mount\('#app'\)/u)
assert.match(vueMain, /import '\.\/styles\.less'/u)
assert.match(vueMain, /import '\.\/styles\.css'/u)
assert.match(vueApp, /const appName = "vue-frontend-fixture"/u)
assert.match(vueApp, /<RouterLink to="\/">Home<\/RouterLink>/u)
assert.match(vueApp, /<RouterView \/>/u)
assert.match(vueApp, /Pinia count: \{\{ count \}\}/u)
assert.match(vueApp, /class="min-h-screen grid place-content-center gap-4 bg-slate-50 text-slate-900"/u)
assert.match(vueViteConfig, /@vitejs\/plugin-vue/u)
assert.match(vueViteConfig, /@tailwindcss\/vite/u)
assert.match(vueLessStyles, /@surface-bg/u)
assert.match(vueTailwindStyles, /@import "tailwindcss";/u)
assert.deepEqual(vueTsconfig.compilerOptions.types, ['vite/client'])
assert.deepEqual(vueTsconfig.include, ['src/**/*.ts', 'src/**/*.vue', 'vite.config.ts'])
await assertPathDoesNotExist(pathJoin(vueDir, '.prelude/manifest.json'))

const backendDir = await createFromSpec(backendSpec)
const backendPackageJson = await readJson<{
  name: string
  main: string
  types: string
  exports: { '.': { import: string, types: string } }
  files: readonly string[]
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}>(pathJoin(backendDir, 'package.json'))
const backendSource = await readFile(pathJoin(backendDir, 'src/index.ts'), 'utf8')
assert.equal(backendPackageJson.name, backendSpec.package.name)
assert.equal(backendPackageJson.main, 'dist/index.js')
assert.equal(backendPackageJson.types, 'dist/index.d.ts')
assert.deepEqual(backendPackageJson.exports['.'], {
  import: './dist/index.js',
  types: './dist/index.d.ts',
})
assert.deepEqual(backendPackageJson.files, ['dist'])
assert.equal(backendPackageJson.scripts.build, 'tsdown --config tsdown.config.ts')
assert.equal(backendPackageJson.scripts.typecheck, 'tsc --noEmit --project tsconfig.json')
assert.equal(backendPackageJson.scripts.start, 'node dist/index.js')
assert.equal(backendPackageJson.scripts.lint, 'eslint .')
assert.equal(backendPackageJson.scripts.knip, 'knip')
assert.equal(backendPackageJson.scripts.verify, 'pnpm build && pnpm lint && pnpm knip')
assert.equal(backendPackageJson.scripts.prepack, 'pnpm build')
assert.equal(backendPackageJson.devDependencies['@antfu/eslint-config'], 'catalog:')
assert.equal(backendPackageJson.devDependencies['@types/node'], 'catalog:')
assert.equal(backendPackageJson.devDependencies.eslint, 'catalog:')
assert.equal(backendPackageJson.devDependencies.knip, 'catalog:')
assert.equal(backendPackageJson.devDependencies.tsdown, 'catalog:')
assert.match(backendSource, /fileURLToPath\(import\.meta\.url\)/u)
assert.match(backendSource, /node-backend-fixture/u)
await assertPathDoesNotExist(pathJoin(backendDir, '.prelude/manifest.json'))

const libraryDir = await createFromSpec(librarySpec)
const libraryPackageJson = await readJson<{
  name: string
  main: string
  types: string
  exports: { '.': { import: string, types: string } }
  files: readonly string[]
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}>(pathJoin(libraryDir, 'package.json'))
const librarySource = await readFile(pathJoin(libraryDir, 'src/index.ts'), 'utf8')
assert.equal(libraryPackageJson.name, librarySpec.package.name)
assert.equal(libraryPackageJson.main, 'dist/index.js')
assert.equal(libraryPackageJson.types, 'dist/index.d.ts')
assert.deepEqual(libraryPackageJson.exports['.'], {
  import: './dist/index.js',
  types: './dist/index.d.ts',
})
assert.deepEqual(libraryPackageJson.files, ['dist'])
assert.equal(libraryPackageJson.scripts.build, 'tsdown --config tsdown.config.ts')
assert.equal(libraryPackageJson.scripts.typecheck, 'tsc --noEmit --project tsconfig.json')
assert.equal(libraryPackageJson.scripts.prepack, 'pnpm build')
assert.equal(libraryPackageJson.devDependencies.tsdown, 'catalog:')
assert.equal(libraryPackageJson.devDependencies.typescript, 'catalog:')
assert.match(librarySource, /export function createGreeting/u)
assert.match(librarySource, /library-package-fixture/u)
await assertPathDoesNotExist(pathJoin(libraryDir, '.prelude/manifest.json'))

const cliDir = await createFromSpec(cliSpec)
const cliPackageJson = await readJson<{
  name: string
  main: string
  types: string
  exports: { '.': { import: string, types: string } }
  files: readonly string[]
  bin: Record<string, string>
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}>(pathJoin(cliDir, 'package.json'))
const cliSource = await readFile(pathJoin(cliDir, 'src/index.ts'), 'utf8')
const cliEnsureShebang = await readFile(pathJoin(cliDir, 'scripts/ensure-shebang.mjs'), 'utf8')
assert.equal(cliPackageJson.name, cliSpec.package.name)
assert.equal(cliPackageJson.main, 'dist/index.js')
assert.equal(cliPackageJson.types, 'dist/index.d.ts')
assert.deepEqual(cliPackageJson.exports['.'], {
  import: './dist/index.js',
  types: './dist/index.d.ts',
})
assert.deepEqual(cliPackageJson.files, ['dist'])
assert.deepEqual(cliPackageJson.bin, {
  'cli-tool-fixture': 'dist/index.js',
})
assert.equal(cliPackageJson.scripts.build, 'tsdown --config tsdown.config.ts && node scripts/ensure-shebang.mjs')
assert.equal(cliPackageJson.scripts.typecheck, 'tsc --noEmit --project tsconfig.json')
assert.equal(cliPackageJson.scripts['smoke:bin'], 'pnpm build && ./dist/index.js --help')
assert.equal(cliPackageJson.scripts.prepack, 'pnpm build')
assert.equal(cliPackageJson.devDependencies['@types/node'], 'catalog:')
assert.equal(cliPackageJson.devDependencies.tsdown, 'catalog:')
assert.equal(cliPackageJson.devDependencies.typescript, 'catalog:')
assert.match(cliSource, /^#!\/usr\/bin\/env node/u)
assert.match(cliSource, /Usage: cli-tool-fixture/u)
assert.match(cliEnsureShebang, /chmod\(binPath, 0o755\)/u)
await assertPathDoesNotExist(pathJoin(cliDir, '.prelude/manifest.json'))

await execa('pnpm', ['install', '--ignore-scripts'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', workerSpec.package.name, 'build'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', workerSpec.package.name, 'typecheck'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', workerSpec.package.name, 'lint'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', workerSpec.package.name, 'knip'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
const workerProviderVerify = await execa('node', [cliEntry, 'verify', '--provider', 'effect-harness'], {
  cwd: workerDir,
  timeout: 120_000,
})
assert.deepEqual(JSON.parse(workerProviderVerify.stdout), {
  command: 'verify',
  status: 'completed',
  providers: [
    {
      providerId: 'effect-harness',
      status: 'passed',
    },
  ],
})
await execa('pnpm', ['--filter', reactSpec.package.name, 'verify'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', vueSpec.package.name, 'build'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', backendSpec.package.name, 'typecheck'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', backendSpec.package.name, 'verify'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
const backendStart = await execa('pnpm', ['--filter', backendSpec.package.name, 'start'], {
  cwd: generatedRoot,
  timeout: 120_000,
})
assert.match(backendStart.stdout, /node-backend-fixture ready/u)
await execa('pnpm', ['--filter', librarySpec.package.name, 'typecheck'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', librarySpec.package.name, 'build'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', cliSpec.package.name, 'typecheck'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
const cliSmoke = await execa('pnpm', ['--filter', cliSpec.package.name, 'smoke:bin'], {
  cwd: generatedRoot,
  timeout: 120_000,
})
assert.match(cliSmoke.stdout, /Usage: cli-tool-fixture \[--help\]/u)

const workspaceDir = await createFromSpec(workspaceSpec)
const workspaceRootPackageJson = await readJson<{
  private: boolean
  packageManager: string
  scripts: Record<string, string>
}>(pathJoin(workspaceDir, 'package.json'))
const workspaceYaml = await readFile(pathJoin(workspaceDir, 'pnpm-workspace.yaml'), 'utf8')
const workspaceApiPackageJson = await readJson<{
  name: string
  dependencies: Record<string, string>
  scripts: Record<string, string>
}>(pathJoin(workspaceDir, 'apps/api/package.json'))
const workspaceToolPackageJson = await readJson<{
  name: string
  dependencies: Record<string, string>
  scripts: Record<string, string>
}>(pathJoin(workspaceDir, 'apps/tool/package.json'))
const workspaceSharedPackageJson = await readJson<{
  name: string
  scripts: Record<string, string>
}>(pathJoin(workspaceDir, 'libs/shared/package.json'))
assert.equal(workspaceRootPackageJson.private, true)
assert.equal(workspaceRootPackageJson.packageManager, 'pnpm@10.33.4')
assert.equal(workspaceRootPackageJson.scripts.build, 'pnpm -r --if-present build')
assert.match(workspaceYaml, / {2}- apps\/\*/u)
assert.match(workspaceYaml, / {2}- libs\/\*/u)
assert.equal(workspaceApiPackageJson.name, '@workspace-smoke/api')
assert.equal(workspaceApiPackageJson.dependencies['@workspace-smoke/shared-runtime'], 'workspace:@workspace-smoke/shared@*')
assert.equal(workspaceApiPackageJson.scripts.typecheck, 'tsc --noEmit --project tsconfig.json')
assert.equal(workspaceToolPackageJson.name, '@workspace-smoke/tool')
assert.equal(workspaceToolPackageJson.dependencies['@workspace-smoke/shared'], 'workspace:*')
assert.equal(workspaceToolPackageJson.scripts['smoke:bin'], 'pnpm build && ./dist/index.js --help')
assert.equal(workspaceSharedPackageJson.name, '@workspace-smoke/shared')
assert.equal(workspaceSharedPackageJson.scripts.build, 'tsdown --config tsdown.config.ts')
await assertPathDoesNotExist(pathJoin(workspaceDir, '.prelude/manifest.json'))

await execa('pnpm', ['install', '--ignore-scripts'], {
  cwd: workspaceDir,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', workspaceSpec.packages[0].name, 'typecheck'], {
  cwd: workspaceDir,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', workspaceSpec.packages[1].name, 'typecheck'], {
  cwd: workspaceDir,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', workspaceSpec.packages[2].name, 'build'], {
  cwd: workspaceDir,
  stdio: 'inherit',
  timeout: 120_000,
})

await assertGeneratedSmokeTargetsRemainInspectable()
await fsRuntime.dispose()
