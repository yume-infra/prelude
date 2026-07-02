import assert from 'node:assert/strict'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { execa } from 'execa'

const repoRoot = path.resolve(import.meta.dirname, '../../..')
const cliEntry = path.join(repoRoot, 'apps/cli/dist/index.js')
const generatedRoot = path.join(repoRoot, 'apps/examples/.generated')
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

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

function smokeTargetName(spec: SmokeSpec) {
  return 'package' in spec ? spec.package.name : 'workspace-graph-fixture'
}

function assertSmokeCoverageContract() {
  assert.equal(generatedRoot, path.join(repoRoot, 'apps/examples/.generated'))

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

async function assertGeneratedSmokeTargetsRemainInspectable() {
  for (const smokeCase of smokeCoverageCases) {
    const target = await stat(path.join(generatedRoot, smokeCase.targetName))
    assert.ok(target.isDirectory(), `${smokeCase.targetName} should remain inspectable after smoke assertions`)
  }
}

async function assertPathDoesNotExist(filePath: string) {
  try {
    await stat(filePath)
  }
  catch {
    return
  }

  assert.fail(`${filePath} should not be written during dry-run smoke`)
}

async function assertDryRunDoesNotWrite(spec: SmokeSpec) {
  const targetName = 'dry-run-no-write'
  const dryRunDir = path.join(generatedRoot, targetName)

  await rm(dryRunDir, { recursive: true, force: true })

  const result = await execa('node', [
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
  })
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
  await assertPathDoesNotExist(dryRunDir)
  await assertPathDoesNotExist(path.join(dryRunDir, 'package.json'))
  await assertPathDoesNotExist(path.join(dryRunDir, '.prelude/manifest.json'))

  console.log(`Generated dry-run smoke target (not written): ${dryRunDir}`)
}

async function createFromSpec(spec: SmokeSpec) {
  const targetName = smokeTargetName(spec)
  const generatedDir = path.join(generatedRoot, targetName)

  await rm(generatedDir, { recursive: true, force: true })

  await execa('node', [
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
  })

  console.log(`Generated smoke target: ${generatedDir}`)
  return generatedDir
}

assertSmokeCoverageContract()
await mkdir(generatedRoot, { recursive: true })
await writeFile(path.join(generatedRoot, 'pnpm-workspace.yaml'), generatedWorkspace)
await assertDryRunDoesNotWrite(workerSpec)

const workerDir = await createFromSpec(workerSpec)
const workerPackageJson = await readJson<{
  name: string
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}>(path.join(workerDir, 'package.json'))
const workerKnipConfig = await readJson<{
  ignoreDependencies?: readonly string[]
}>(path.join(workerDir, 'knip.json'))
const workerSource = await readFile(path.join(workerDir, 'src/index.ts'), 'utf8')
const workerTsconfig = await readJson<{
  compilerOptions: { types: readonly string[], plugins: readonly { name: string }[] }
  include: readonly string[]
}>(path.join(workerDir, 'tsconfig.json'))
const workerManifest = await readJson<{
  createSpec: typeof workerSpec
  maintainProviders: Array<{ id: string, recordPath: string }>
  generatedUserSurfaces: Array<{ path: string, authority: string }>
  verificationRecords: Array<{ id: string, checkedPaths: readonly string[] }>
}>(path.join(workerDir, '.prelude/manifest.json'))
const providerRecord = await readJson<{ id: string, surfaces: Array<{ id: string, owner: string, lifecycle: string, path: string }> }>(
  path.join(workerDir, '.prelude/providers/effect-harness/provider.json'),
)

assert.equal(workerPackageJson.name, workerSpec.package.name)
assert.equal(workerPackageJson.scripts.build, 'tsgo --noEmit')
assert.equal(workerPackageJson.scripts.lint, 'eslint .')
assert.equal(workerPackageJson.scripts.knip, 'knip')
assert.equal(workerPackageJson.scripts.prepare, 'effect-tsgo patch')
assert.equal(workerPackageJson.scripts.typecheck, 'tsgo --noEmit')
assert.equal(workerPackageJson.scripts.verify, 'pnpm build && pnpm typecheck && pnpm lint --max-warnings 0 && pnpm knip')
assert.equal(workerPackageJson.scripts['effect:verify'], undefined)
assert.equal(workerPackageJson.devDependencies['@effect/tsgo'], '0.15.0')
assert.deepEqual(workerKnipConfig.ignoreDependencies, ['@effect/tsgo', '@effect/vitest'])
assert.match(workerSource, /Effect\.fn\('main'\)/u)
assert.match(workerSource, /NodeRuntime\.runMain\(main\(\)\)/u)
assert.match(workerSource, /canonical-worker ready/u)
assert.deepEqual(workerTsconfig.compilerOptions.types, ['node'])
assert.equal(workerTsconfig.compilerOptions.plugins[0]?.name, '@effect/language-service')
assert.deepEqual(workerTsconfig.include, ['src/**/*.ts'])
assert.equal(workerManifest.createSpec.package.capabilities[0], 'effect-package')
assert.deepEqual(workerManifest.maintainProviders.map(provider => provider.id), ['effect-harness'])
assert.equal(workerManifest.maintainProviders[0]?.recordPath, '.prelude/providers/effect-harness/provider.json')
assert.equal(providerRecord.id, 'effect-harness')
const providerSurfaceIds = new Set(providerRecord.surfaces.map(surface => surface.id))
assert.ok(providerSurfaceIds.has('tsconfig:root:/compilerOptions/plugins'))
assert.ok(providerSurfaceIds.has('provider-managed-file:effect-harness:.prelude/providers/effect-harness/docs/discovery.md'))
assert.ok(providerSurfaceIds.has('provider-managed-file:effect-harness:.prelude/providers/effect-harness/snippets/agents.md'))
assert.ok(
  providerRecord.surfaces.every(surface =>
    surface.owner === 'provider:effect-harness'
    && surface.lifecycle === 'managed'
    && !surface.path.startsWith('src/')),
  'effect-harness must not manage target source files',
)
assert.ok(
  workerManifest.generatedUserSurfaces.every(surface => surface.authority === 'none'),
  'ordinary generated scaffold surfaces must be handed off',
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
}>(path.join(reactDir, 'package.json'))
const reactIndex = await readFile(path.join(reactDir, 'index.html'), 'utf8')
const reactMain = await readFile(path.join(reactDir, 'src/main.tsx'), 'utf8')
const reactApp = await readFile(path.join(reactDir, 'src/App.tsx'), 'utf8')
const reactViteConfig = await readFile(path.join(reactDir, 'vite.config.ts'), 'utf8')
const reactLessStyles = await readFile(path.join(reactDir, 'src/styles.less'), 'utf8')
const reactTailwindStyles = await readFile(path.join(reactDir, 'src/styles.css'), 'utf8')
const reactTsconfig = await readJson<{
  compilerOptions: { jsx: string, types: readonly string[] }
  include: readonly string[]
}>(path.join(reactDir, 'tsconfig.json'))
const reactManifest = await readJson<{
  createSpec: typeof reactSpec
  generatedUserSurfaces: Array<{ path: string, authority: string }>
}>(path.join(reactDir, '.prelude/manifest.json'))

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
assert.deepEqual(reactManifest.createSpec.package.capabilities, ['react-app', 'css:less', 'css:tailwind', 'router:react-router', 'state:jotai'])
assert.deepEqual(
  reactManifest.generatedUserSurfaces.map(surface => ({ path: surface.path, authority: surface.authority })),
  [
    { path: 'package.json', authority: 'none' },
    { path: 'eslint.config.mjs', authority: 'none' },
    { path: 'knip.json', authority: 'none' },
    { path: 'index.html', authority: 'none' },
    { path: 'src/main.tsx', authority: 'none' },
    { path: 'vite.config.ts', authority: 'none' },
    { path: 'src/styles.less', authority: 'none' },
    { path: 'src/styles.css', authority: 'none' },
    { path: 'tsconfig.json', authority: 'none' },
    { path: 'src/App.tsx', authority: 'none' },
  ],
)
assert.ok(
  reactManifest.generatedUserSurfaces.every(surface => surface.authority === 'none'),
  'react generated scaffold surfaces must be handed off',
)

const vueDir = await createFromSpec(vueSpec)
const vuePackageJson = await readJson<{
  name: string
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}>(path.join(vueDir, 'package.json'))
const vueIndex = await readFile(path.join(vueDir, 'index.html'), 'utf8')
const vueMain = await readFile(path.join(vueDir, 'src/main.ts'), 'utf8')
const vueApp = await readFile(path.join(vueDir, 'src/App.vue'), 'utf8')
const vueViteConfig = await readFile(path.join(vueDir, 'vite.config.ts'), 'utf8')
const vueLessStyles = await readFile(path.join(vueDir, 'src/styles.less'), 'utf8')
const vueTailwindStyles = await readFile(path.join(vueDir, 'src/styles.css'), 'utf8')
const vueTsconfig = await readJson<{
  compilerOptions: { types: readonly string[] }
  include: readonly string[]
}>(path.join(vueDir, 'tsconfig.json'))
const vueManifest = await readJson<{
  createSpec: typeof vueSpec
  maintainProviders: readonly unknown[]
  generatedUserSurfaces: Array<{ path: string, authority: string }>
}>(path.join(vueDir, '.prelude/manifest.json'))

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
assert.deepEqual(vueManifest.createSpec.package.capabilities, ['vue-app', 'css:less', 'css:tailwind', 'router:vue-router', 'state:pinia'])
assert.deepEqual(vueManifest.maintainProviders, [])
assert.ok(
  vueManifest.generatedUserSurfaces.every(surface => surface.authority === 'none'),
  'vue generated scaffold surfaces must be handed off',
)

const backendDir = await createFromSpec(backendSpec)
const backendPackageJson = await readJson<{
  name: string
  main: string
  types: string
  exports: { '.': { import: string, types: string } }
  files: readonly string[]
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}>(path.join(backendDir, 'package.json'))
const backendSource = await readFile(path.join(backendDir, 'src/index.ts'), 'utf8')
const backendManifest = await readJson<{
  createSpec: typeof backendSpec
  maintainProviders: readonly unknown[]
  generatedUserSurfaces: Array<{ path: string, authority: string }>
}>(path.join(backendDir, '.prelude/manifest.json'))

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
assert.deepEqual(backendManifest.createSpec.package.capabilities, ['node-backend'])
assert.deepEqual(backendManifest.maintainProviders, [])
assert.ok(
  backendManifest.generatedUserSurfaces.every(surface => surface.authority === 'none'),
  'backend generated scaffold surfaces must be handed off',
)

const libraryDir = await createFromSpec(librarySpec)
const libraryPackageJson = await readJson<{
  name: string
  main: string
  types: string
  exports: { '.': { import: string, types: string } }
  files: readonly string[]
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}>(path.join(libraryDir, 'package.json'))
const librarySource = await readFile(path.join(libraryDir, 'src/index.ts'), 'utf8')
const libraryManifest = await readJson<{
  createSpec: typeof librarySpec
  maintainProviders: readonly unknown[]
  generatedUserSurfaces: Array<{ path: string, authority: string }>
}>(path.join(libraryDir, '.prelude/manifest.json'))

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
assert.deepEqual(libraryManifest.createSpec.package.capabilities, ['library'])
assert.deepEqual(libraryManifest.maintainProviders, [])
assert.ok(
  libraryManifest.generatedUserSurfaces.every(surface => surface.authority === 'none'),
  'library generated scaffold surfaces must be handed off',
)

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
}>(path.join(cliDir, 'package.json'))
const cliSource = await readFile(path.join(cliDir, 'src/index.ts'), 'utf8')
const cliEnsureShebang = await readFile(path.join(cliDir, 'scripts/ensure-shebang.mjs'), 'utf8')
const cliManifest = await readJson<{
  createSpec: typeof cliSpec
  maintainProviders: readonly unknown[]
  generatedUserSurfaces: Array<{ path: string, authority: string }>
}>(path.join(cliDir, '.prelude/manifest.json'))

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
assert.deepEqual(cliManifest.createSpec.package.capabilities, ['cli-tool'])
assert.deepEqual(cliManifest.maintainProviders, [])
assert.ok(
  cliManifest.generatedUserSurfaces.every(surface => surface.authority === 'none'),
  'cli generated scaffold surfaces must be handed off',
)

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
}>(path.join(workspaceDir, 'package.json'))
const workspaceYaml = await readFile(path.join(workspaceDir, 'pnpm-workspace.yaml'), 'utf8')
const workspaceApiPackageJson = await readJson<{
  name: string
  dependencies: Record<string, string>
  scripts: Record<string, string>
}>(path.join(workspaceDir, 'apps/api/package.json'))
const workspaceToolPackageJson = await readJson<{
  name: string
  dependencies: Record<string, string>
  scripts: Record<string, string>
}>(path.join(workspaceDir, 'apps/tool/package.json'))
const workspaceSharedPackageJson = await readJson<{
  name: string
  scripts: Record<string, string>
}>(path.join(workspaceDir, 'libs/shared/package.json'))
const workspaceManifest = await readJson<{
  resolvedGraph: {
    topology: string
    packages: Array<{ id: string, path: string }>
    packageCapabilities: Record<string, readonly string[]>
  }
  generatedUserSurfaces: Array<{ path: string, authority: string }>
  verificationRecords: Array<{ id: string }>
}>(path.join(workspaceDir, '.prelude/manifest.json'))

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
assert.equal(workspaceManifest.resolvedGraph.topology, 'workspace')
assert.deepEqual(workspaceManifest.resolvedGraph.packages.map(pkg => ({ id: pkg.id, path: pkg.path })), [
  { id: 'api', path: 'apps/api' },
  { id: 'tool', path: 'apps/tool' },
  { id: 'shared', path: 'libs/shared' },
])
assert.deepEqual(workspaceManifest.resolvedGraph.packageCapabilities, {
  api: ['node-backend'],
  tool: ['cli-tool'],
  shared: ['library'],
})
assert.ok(workspaceManifest.generatedUserSurfaces.every(surface => surface.authority === 'none'))
assert.deepEqual(workspaceManifest.verificationRecords.map(record => record.id), [
  'workspace-root-files-present',
  'workspace-package-files-present',
])

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
