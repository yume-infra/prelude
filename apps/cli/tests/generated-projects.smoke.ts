import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { execa } from 'execa'

const repoRoot = path.resolve(import.meta.dirname, '../../..')
const cliEntry = path.join(repoRoot, 'apps/cli/dist/index.js')

const spec = {
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

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8')) as T
}

const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'prelude-generated-smoke-'))

try {
  await execa('node', [
    cliEntry,
    '--spec',
    JSON.stringify(spec),
    '--name',
    spec.package.name,
    '--no-input',
  ], {
    cwd: tempRoot,
    env: {
      ...process.env,
      CI: '1',
      FORCE_COLOR: '0',
    },
    stdio: 'inherit',
    timeout: 120_000,
  })

  const generatedDir = path.join(tempRoot, spec.package.name)
  const packageJson = await readJson<{
    name: string
    scripts: Record<string, string>
    devDependencies: Record<string, string>
  }>(path.join(generatedDir, 'package.json'))
  const manifest = await readJson<{
    createSpec: typeof spec
    lifecycleProviders: Array<{ id: string }>
    generatedUserSurfaces: Array<{ path: string, authority: string }>
  }>(path.join(generatedDir, '.prelude/manifest.json'))
  const providerArtifact = await readJson<{ id: string }>(
    path.join(generatedDir, '.prelude/providers/effect-harness/provider.json'),
  )

  assert.equal(packageJson.name, spec.package.name)
  assert.equal(packageJson.scripts.build, 'tsgo --noEmit')
  assert.equal(packageJson.scripts.lint, 'eslint .')
  assert.equal(packageJson.scripts.knip, 'knip')
  assert.equal(packageJson.scripts.verify, 'pnpm build && pnpm lint && pnpm knip')
  assert.equal(packageJson.devDependencies['@effect/tsgo'], '0.14.4')
  assert.equal(manifest.createSpec.package.capabilities[0], 'effect-package')
  assert.deepEqual(manifest.lifecycleProviders.map(provider => provider.id), ['effect-harness'])
  assert.equal(providerArtifact.id, 'effect-harness')
  assert.ok(
    manifest.generatedUserSurfaces.every(surface => surface.authority === 'none'),
    'ordinary generated scaffold surfaces must be handed off',
  )
}
finally {
  await rm(tempRoot, { recursive: true, force: true })
}
