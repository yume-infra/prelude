import assert from 'node:assert/strict'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
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
  - '@effect/platform-node@4.0.0-beta.90'
  - '@effect/platform-node-shared@4.0.0-beta.90'
  - '@effect/vitest@4.0.0-beta.90'
  - effect@4.0.0-beta.90

overrides:
  '@effect/platform-node@4.0.0-beta.90>@effect/platform-node-shared': 4.0.0-beta.90

catalog:
  '@antfu/eslint-config': 8.2.0
  '@types/node': 25.6.0
  eslint: ^10.3.0
  knip: ^6.12.0
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
    name: 'react-counter-app',
    capabilities: ['react-app', 'react-counter'],
  },
  rootCapabilities: ['package-manager:pnpm', 'linting', 'knip'],
  providers: [],
  overrides: {},
} as const

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

async function createFromSpec(spec: typeof workerSpec | typeof reactSpec) {
  const generatedDir = path.join(generatedRoot, spec.package.name)

  await rm(generatedDir, { recursive: true, force: true })

  await execa('node', [
    cliEntry,
    '--spec',
    JSON.stringify(spec),
    '--name',
    spec.package.name,
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

await mkdir(generatedRoot, { recursive: true })
await writeFile(path.join(generatedRoot, 'pnpm-workspace.yaml'), generatedWorkspace)

const workerDir = await createFromSpec(workerSpec)
const workerPackageJson = await readJson<{
  name: string
  scripts: Record<string, string>
  devDependencies: Record<string, string>
}>(path.join(workerDir, 'package.json'))
const workerSource = await readFile(path.join(workerDir, 'src/index.ts'), 'utf8')
const workerTsconfig = await readJson<{
  compilerOptions: { types: readonly string[] }
  include: readonly string[]
}>(path.join(workerDir, 'tsconfig.json'))
const workerManifest = await readJson<{
  createSpec: typeof workerSpec
  lifecycleProviders: Array<{ id: string }>
  generatedUserSurfaces: Array<{ path: string, authority: string }>
}>(path.join(workerDir, '.prelude/manifest.json'))
const providerArtifact = await readJson<{ id: string }>(
  path.join(workerDir, '.prelude/providers/effect-harness/provider.json'),
)

assert.equal(workerPackageJson.name, workerSpec.package.name)
assert.equal(workerPackageJson.scripts.build, 'tsgo --noEmit --project tsconfig.json')
assert.equal(workerPackageJson.scripts.lint, 'eslint .')
assert.equal(workerPackageJson.scripts.knip, 'knip')
assert.equal(workerPackageJson.scripts.verify, 'pnpm build && pnpm lint && pnpm knip')
assert.equal(workerPackageJson.devDependencies['@effect/tsgo'], '0.14.6')
assert.match(workerSource, /NodeRuntime\.runMain\(program\)/u)
assert.match(workerSource, /canonical-worker ready/u)
assert.deepEqual(workerTsconfig.compilerOptions.types, ['node'])
assert.deepEqual(workerTsconfig.include, ['src/**/*.ts'])
assert.equal(workerManifest.createSpec.package.capabilities[0], 'effect-package')
assert.deepEqual(workerManifest.lifecycleProviders.map(provider => provider.id), ['effect-harness'])
assert.equal(providerArtifact.id, 'effect-harness')
assert.ok(
  workerManifest.generatedUserSurfaces.every(surface => surface.authority === 'none'),
  'ordinary generated scaffold surfaces must be handed off',
)

const reactDir = await createFromSpec(reactSpec)
const reactPackageJson = await readJson<{
  name: string
  scripts: Record<string, string>
  dependencies: Record<string, string>
}>(path.join(reactDir, 'package.json'))
const reactIndex = await readFile(path.join(reactDir, 'index.html'), 'utf8')
const reactMain = await readFile(path.join(reactDir, 'src/main.tsx'), 'utf8')
const reactApp = await readFile(path.join(reactDir, 'src/App.tsx'), 'utf8')
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
assert.match(reactIndex, /<div id="root"><\/div>/u)
assert.match(reactMain, /createRoot\(document\.getElementById\('root'\)!\)/u)
assert.match(reactApp, /<h1>react-counter-app<\/h1>/u)
assert.match(reactApp, /Count: \{count\}/u)
assert.deepEqual(reactManifest.createSpec.package.capabilities, ['react-app', 'react-counter'])
assert.ok(
  reactManifest.generatedUserSurfaces.every(surface => surface.authority === 'none'),
  'react generated scaffold surfaces must be handed off',
)

await execa('pnpm', ['install'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', workerSpec.package.name, 'build'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
await execa('pnpm', ['--filter', reactSpec.package.name, 'build'], {
  cwd: generatedRoot,
  stdio: 'inherit',
  timeout: 120_000,
})
