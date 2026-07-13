/* eslint-disable style/max-statements-per-line */
import { strict as assert } from 'node:assert'
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'

import { execa } from 'execa'

const EFFECT_DIGEST = 'd797515e8ecb2e164deef65b6b7abde6445201ce9d1e9e584f39d634c2469e95'
const TSGO_DIGEST = 'c3d01ada0e3e5a404c819499037885947ab46d1eae313432d71bfbbb60ab4e2a'
const workspaceRoot = join(import.meta.dirname, '../../..')
const gateInput = join(workspaceRoot, 'tmp/gate-input')
const harnessTar = process.env.EFFECT_HARNESS_TARBALL ?? join(gateInput, 'sayoriqwq-effect-harness-0.2.0.tgz')
const contractTar = process.env.PRELUDE_CONTRACT_TARBALL ?? join(gateInput, 'sayoriqwq-prelude-contract-0.2.0.tgz')
const cliTar = process.env.PRELUDE_CLI_TARBALL ?? join(gateInput, 'sayoriqwq-prelude-0.3.0.tgz')
const fixtureRoot = join(workspaceRoot, 'tmp')
await mkdir(fixtureRoot, { recursive: true })
const requestedRunRoot = process.env.PRELUDE_GATE_ROOT
const prepareOnly = process.env.PRELUDE_GATE_PREPARE_ONLY === '1'
const runRoot = requestedRunRoot ?? await mkdtemp(join(fixtureRoot, 'packed-effect-gate-'))
if (requestedRunRoot !== undefined)
  await mkdir(runRoot, { recursive: true })

type Json = Record<string, unknown>

async function json(path: string, value: unknown) { await writeFile(path, `${JSON.stringify(value, null, 2)}\n`) }

const selectedDependencies = {
  'effect': '4.0.0-beta.97',
  '@effect/platform-node': '4.0.0-beta.97',
}

const selectedDevDependencies = {
  '@effect/vitest': '4.0.0-beta.97',
  '@effect/tsgo': '0.19.0',
  '@typescript/native': 'npm:typescript@7.0.2',
  'eslint': '^10.3.0',
  '@antfu/eslint-config': '^9.0.0',
  'vitest': '^4.1.8',
  'typescript': 'npm:@typescript/typescript6@6.0.2',
}

const scripts = {
  typecheck: 'tsgo --noEmit --project tsconfig.json',
  lint: 'eslint src',
  verify: `node -e "const c=JSON.parse(require('node:fs').readFileSync('tsconfig.json','utf8'));if(!c.compilerOptions.plugins.some(p=>p.name==='@effect/language-service'))throw new Error('managed policy missing')"`,
}

const eslintConfig = `import antfu from '@antfu/eslint-config'\nimport effectHarness from '@sayoriqwq/effect-harness/eslint'\n\nexport default antfu().append(...effectHarness)\n`

const source = `import { Effect } from 'effect'\n\nexport const program = Effect.succeed('gate')\n`

function targetRootManifest(name: string, selected: boolean): Json {
  return {
    name,
    private: true,
    type: 'module',
    scripts: selected ? scripts : undefined,
    dependencies: selected ? selectedDependencies : undefined,
    devDependencies: {
      '@sayoriqwq/prelude': `file:${cliTar}`,
      '@sayoriqwq/effect-harness': `file:${harnessTar}`,
      '@antfu/eslint-config': '^9.0.0',
      'eslint': '^10.3.0',
      ...(selected ? {} : { typescript: 'npm:@typescript/typescript6@6.0.2' }),
      ...(selected ? selectedDevDependencies : {}),
    },
  }
}

async function writeSelectedPackage(root: string, name: string) {
  const packageRelative = root.slice(root.lastIndexOf('/packages/') + '/packages/'.length)
  const packageScripts = { ...scripts, lint: `cd ../.. && eslint packages/${packageRelative}/src` }
  await mkdir(join(root, 'src'), { recursive: true })
  await json(join(root, 'package.json'), { name, private: true, type: 'module', scripts: packageScripts, dependencies: selectedDependencies, devDependencies: selectedDevDependencies })
  await json(join(root, 'tsconfig.json'), { compilerOptions: { target: 'ES2024', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, skipLibCheck: true }, include: ['src/**/*.ts'] })
  await writeFile(join(root, 'src/index.ts'), source)
}

async function installTarget(root: string) {
  await execa('pnpm', ['install', '--offline', '--store-dir', join(workspaceRoot, '.pnpm-store'), '--reporter', 'append-only'], {
    cwd: root,
    env: { ...process.env, CI: '1', INIT_CWD: root, PNPM_PACKAGE_NAME: undefined, npm_command: undefined, npm_config_dir: undefined, npm_config_filter: undefined, npm_config_recursive: undefined, npm_config_workspace_dir: undefined },
    timeout: 120_000,
    stdout: 'inherit',
    stderr: 'inherit',
  })
}

async function assertAbsent(path: string) {
  await assert.rejects(access(path), (error: unknown) => error instanceof Error && 'code' in error && error.code === 'ENOENT')
}

async function runGate(name: 'single' | 'monorepo', packageRoots: ReadonlyArray<string>, integrationId: string) {
  const target = join(runRoot, name)
  await mkdir(join(target, '.prelude', `i-${encodeURIComponent(integrationId)}`, 'feedback'), { recursive: true })
  const integrationWorkspacePath = join(target, '.prelude', `i-${encodeURIComponent(integrationId)}`)
  await rm(join(integrationWorkspacePath, 'managed'), { recursive: true, force: true })
  await rm(join(integrationWorkspacePath, 'repos'), { recursive: true, force: true })
  for (const entry of await readdir(integrationWorkspacePath)) {
    if (entry.startsWith('.managed.prelude-') || entry.startsWith('.effect.prelude-') || entry.startsWith('.tsgo.prelude-')) {
      await rm(join(integrationWorkspacePath, entry), { recursive: true, force: true })
    }
  }
  await json(join(target, 'package.json'), targetRootManifest(`effect-gate-${name}`, packageRoots.includes('.')))
  await writeFile(join(target, 'pnpm-workspace.yaml'), `packages:\n  - packages/*\npackageImportMethod: copy\noverrides:\n  '@sayoriqwq/prelude-contract': 'file:${contractTar}'\n`)
  await writeFile(join(target, 'eslint.config.mjs'), eslintConfig)
  if (packageRoots.includes('.')) {
    await json(join(target, 'tsconfig.json'), { compilerOptions: { target: 'ES2024', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, skipLibCheck: true }, include: ['src/**/*.ts'] })
    await mkdir(join(target, 'src'), { recursive: true }); await writeFile(join(target, 'src/index.ts'), source)
  }
  else {
    for (const packageRoot of packageRoots) await writeSelectedPackage(join(target, packageRoot), `effect-gate-${packageRoot.replaceAll('/', '-')}`)
  }
  const workspace = `.prelude/i-${encodeURIComponent(integrationId)}`
  const feedback = join(target, workspace, 'feedback/evidence.md')
  await writeFile(feedback, 'target-owned Gate evidence\n')
  await writeFile(join(target, '.prelude/config.jsonc'), `// packed Effect Harness Gate\n{ "schemaVersion": 2, "integrations": [{ "id": ${JSON.stringify(integrationId)}, "module": "@sayoriqwq/effect-harness/prelude", "packageRoots": ${JSON.stringify(packageRoots)} }] }\n`)
  if (prepareOnly)
    return
  await installTarget(target)

  const cli = join(target, 'node_modules/.bin/prelude')
  const cliRun = (args: ReadonlyArray<string>, cwd = target, reject = true) => execa(cli, args, { cwd, reject, env: { ...process.env, CI: '1' }, timeout: 120_000 })
  const initialResult = await cliRun(['plan', '--json'])
  const nestedResult = await cliRun(['plan', '--json'], packageRoots[packageRoots.length - 1] === '.' ? target : join(target, packageRoots[packageRoots.length - 1]!))
  assert.equal(initialResult.stdout, nestedResult.stdout, `${name}: nested plan must discover the same Control Root`)
  const initial = JSON.parse(initialResult.stdout)
  assert.equal(initial.schemaVersion, 2); assert.equal(initial.executionHashVersion, 2); assert.equal(initial.blocked, false); assert.equal(initial.converged, false)
  assert.deepEqual(initial.integrations[0].packageRoots, [...packageRoots].sort())
  assert.equal(initial.outputs.filter((output: Json) => (output.declaration as Json).kind === 'ManagedTree').length, 1)
  assert.equal(initial.outputs.filter((output: Json) => (output.declaration as Json).kind === 'PinnedReferenceTree').length, 2)
  assert.equal(initial.outputs.filter((output: Json) => (output.declaration as Json).kind === 'JsonKeyedItem').length, packageRoots.length)
  assert.equal(initial.requirements.length, packageRoots.length * 9); assert.equal(initial.requirements.every((requirement: Json) => requirement.satisfied === true), true)
  assert.equal(initial.checks.length, packageRoots.length * 3)
  assert.equal(initial.outputs.every((output: Json) => (output.owner as Json).integrationId === integrationId), true)
  const pins = initial.outputs.filter((output: Json) => (output.declaration as Json).kind === 'PinnedReferenceTree')
  assert.deepEqual(pins.map((output: Json) => ((output.declaration as Json).provenance as Json).treeDigest).sort(), [EFFECT_DIGEST, TSGO_DIGEST].sort())
  for (const output of pins) assert.deepEqual(Object.keys((output.declaration.provenance as Json)).sort(), ['revision', 'sourceUrl', 'treeDigest'])
  assert.equal(initialResult.stdout.includes('closure'), false); assert.equal(initialResult.stdout.includes('nestedPins'), false)

  await writeFile(join(target, 'eslint.config.mjs'), 'export default []\n')
  const stale = await cliRun(['apply', '--plan-hash', initial.executionHash, '--json'], target, false)
  assert.notEqual(stale.exitCode, 0); assert.match(stale.stderr, /Approved execution hash does not match/)
  await assertAbsent(join(target, workspace, 'managed'))
  assert.equal(await readFile(feedback, 'utf8'), 'target-owned Gate evidence\n')
  await writeFile(join(target, 'eslint.config.mjs'), eslintConfig)

  const approved = JSON.parse((await cliRun(['plan', '--json'])).stdout)
  const applied = JSON.parse((await cliRun(['apply', '--plan-hash', approved.executionHash, '--json'])).stdout)
  assert.equal(applied.converged, true); assert.equal(applied.remaining, 0); assert.equal(applied.installed, false)
  const converged = JSON.parse((await cliRun(['plan', '--json'])).stdout)
  assert.equal(converged.converged, true); assert.equal(converged.outputs.every((output: Json) => output.status === 'converged'), true)
  assert.equal(await readFile(feedback, 'utf8'), 'target-owned Gate evidence\n')
  assert.deepEqual((await readdir(join(target, workspace))).sort(), ['feedback', 'managed', 'repos'])
  for (const packageRoot of packageRoots) {
    const tsconfig = JSON.parse(await readFile(join(target, packageRoot === '.' ? '' : packageRoot, 'tsconfig.json'), 'utf8'))
    assert.equal(tsconfig.compilerOptions.plugins.some((plugin: Json) => plugin.name === '@effect/language-service'), true)
  }
  const checked = JSON.parse((await cliRun(['check', '--json'])).stdout)
  assert.equal(checked.checks.length, packageRoots.length * 3); assert.equal(checked.checks.every((check: Json) => check.exitCode === 0), true)

  const tsgoReference = join(target, workspace, 'repos/tsgo')
  const gitmodules = await readFile(join(tsgoReference, '.gitmodules'), 'utf8')
  await mkdir(join(tsgoReference, 'typescript-go')); await writeFile(join(tsgoReference, 'typescript-go/target-invention'), 'must be removed\n'); await writeFile(join(tsgoReference, '.gitmodules'), 'target drift\n')
  const drift = JSON.parse((await cliRun(['plan', '--json'])).stdout)
  const drifted = drift.outputs.find((output: Json) => (output.declaration as Json).id === 'effect.reference.tsgo')
  assert.equal(drifted.status, 'change'); assert.match(drifted.evidence.join(' '), /reference drift/)
  const repaired = JSON.parse((await cliRun(['apply', '--plan-hash', drift.executionHash, '--json'])).stdout)
  assert.equal(repaired.converged, true); assert.equal(await readFile(join(tsgoReference, '.gitmodules'), 'utf8'), gitmodules)
  await assertAbsent(join(tsgoReference, 'typescript-go'))
  assert.equal(await readFile(feedback, 'utf8'), 'target-owned Gate evidence\n')
  await assertAbsent(join(target, workspace, 'receipt')); await assertAbsent(join(target, workspace, 'manifest')); await assertAbsent(join(target, workspace, 'dispatcher'))
  const finalCheck = JSON.parse((await cliRun(['check', '--json'])).stdout)
  assert.equal(finalCheck.checks.every((check: Json) => check.exitCode === 0), true)
  console.log(`packed Effect ${name} Gate passed: ${finalCheck.plan.executionHash}`)
}

try {
  await Promise.all([access(harnessTar), access(contractTar), access(cliTar)])
  await runGate('single', ['.'], 'effect/single')
  await runGate('monorepo', ['packages/web', 'packages/core'], 'effect/monorepo')
  if (prepareOnly)
    console.log(`prepared packed Effect Gate fixtures: ${runRoot}`)
}
finally {
  if (process.env.PRELUDE_KEEP_TEMP === '1' || prepareOnly || requestedRunRoot !== undefined)
    console.error(`preserved packed Effect Gate fixtures: ${runRoot}`)
  else await rm(runRoot, { recursive: true, force: true })
}
