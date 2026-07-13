/* eslint-disable style/max-statements-per-line */
import { strict as assert } from 'node:assert'
import { chmod, mkdir, mkdtemp, readdir, readFile, readlink, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'

import { CANONICAL_TREE_ARCHIVE_FORMAT, encodeCanonicalTreeArchive } from '@sayoriqwq/prelude-contract'
import { execa } from 'execa'

const EFFECT_VERSION = '4.0.0-beta.97'
const cliRoot = join(import.meta.dirname, '..')
const workspaceRoot = join(cliRoot, '../..')
const fixtureRoot = join(workspaceRoot, 'tmp')
await mkdir(fixtureRoot, { recursive: true })
const temp = await mkdtemp(join(fixtureRoot, 'prelude-installed-'))
const packs = join(temp, 'packs')
const target = join(temp, 'target')
const fakeBin = join(temp, 'fake-bin')
const gitSentinel = join(temp, 'git-invoked')

async function json(path: string, value: unknown) { await writeFile(path, `${JSON.stringify(value, null, 2)}\n`) }
async function run(args: ReadonlyArray<string>, options: { reject?: boolean } = {}) { return execa('pnpm', args, { cwd: target, reject: options.reject ?? true, env: { ...process.env, CI: '1' } }) }

function parseCliJson(result: { stdout: string, stderr: string, exitCode?: number, signal?: string | undefined }, cliPath: string, args: ReadonlyArray<string>, cwd: string) {
  if (result.stdout.trim() === '') {
    throw new Error(`CLI JSON output was empty: argv=${JSON.stringify([cliPath, ...args])} cwd=${cwd} exitCode=${result.exitCode ?? 'null'} signal=${result.signal ?? 'none'} stdout=${JSON.stringify(result.stdout)} stderr=${JSON.stringify(result.stderr)}`)
  }
  return JSON.parse(result.stdout)
}

interface HarnessPack {
  readonly archive: string
  readonly managedText: string
  readonly pinnedText: string
  readonly treeDigest: string
  readonly version: string
}

let contractTar = ''

async function packRequiredPackage(): Promise<string> {
  const archiveRoot = join(temp, 'required-1.0.0')
  const root = join(archiveRoot, 'package')
  await mkdir(root, { recursive: true })
  await json(join(root, 'package.json'), { name: '@synthetic/required', version: '1.0.0', type: 'module', exports: './index.js' })
  await writeFile(join(root, 'index.js'), 'export const installed = true\n')
  const archive = join(packs, 'synthetic-required-1.0.0.tgz')
  await execa('tar', ['-czf', archive, '-C', archiveRoot, 'package'])
  return archive
}

async function packHarness(name: 'alpha' | 'beta', version: string): Promise<HarnessPack> {
  const archiveRoot = join(temp, `${name}-${version}`); const root = join(archiveRoot, 'package'); const managed = join(root, 'assets/managed')
  await mkdir(managed, { recursive: true })
  const managedText = `${name} managed ${version}\n`; const pinnedText = `${name} pinned source ${version}\n`
  const materializedSymlinkMode = 0o777
  await writeFile(join(managed, `${name}.txt`), managedText)
  const encodedTree = encodeCanonicalTreeArchive([
    { kind: 'file', path: 'AGENTS.md', mode: 0o644, bytes: new TextEncoder().encode(pinnedText) },
    { kind: 'symbolicLink', path: 'CLAUDE.md', mode: materializedSymlinkMode, target: 'AGENTS.md' },
    { kind: 'file', path: 'REVISION', mode: 0o644, bytes: new TextEncoder().encode(`${name}-${version}\n`) },
  ])
  await writeFile(join(root, 'assets/repos.pta'), encodedTree.bytes)
  const treeDigest = encodedTree.treeDigest
  const policyFile = name === 'alpha' ? 'settings.json' : 'beta-settings.json'
  const requiredFeatures = [
    'checks.argv',
    'integrations.package-roots',
    'issues.blocking',
    'locators.rooted',
    'outputs.json-keyed-item',
    'outputs.managed-tree',
    'outputs.pinned-reference-tree',
    'planning.rooted-target-observation',
    'requirements.package',
  ]
  await writeFile(join(root, 'prelude.js'), `
import { Effect } from 'effect'

const name = ${JSON.stringify(name)}
const version = ${JSON.stringify(version)}
const policyFile = ${JSON.stringify(policyFile)}
const expectedManifestNames = { '.': 'synthetic-target', 'packages/app': 'workspace-app' }
const integrationWorkspace = '.prelude/i-' + encodeURIComponent(name)
const rootId = packageRoot => packageRoot === '.' ? 'root' : packageRoot.replaceAll('/', '-')
const policy = packageRoot => ({ name, version, packageRoot })
const requirement = packageRoot => packageRoot === '.'
  ? { id: 'effect-root', packageRoot, packageName: 'effect', range: ${JSON.stringify(EFFECT_VERSION)}, section: 'devDependencies' }
  : { id: 'required-' + rootId(packageRoot), packageRoot, packageName: '@synthetic/required', range: '1.0.0', section: 'devDependencies' }
const checkCode = packageRoot => {
  const expected = JSON.stringify(policy(packageRoot))
  const statements = [
    "const fs=require('node:fs')",
    "const value=JSON.parse(fs.readFileSync(" + JSON.stringify(policyFile) + ",'utf8'))",
    "const expected=" + JSON.stringify(expected),
    "const actual=JSON.stringify(value.plugins.find(item=>item.name===" + JSON.stringify(name) + "))",
    "if(actual!==expected)throw new Error('package policy mismatch: '+actual)",
  ]
  if (packageRoot === '.') statements.push(
    "process.stdout.write('synthetic check output\\\\n')",
    "fs.accessSync(" + JSON.stringify(integrationWorkspace + '/managed/' + name + '.txt') + ")",
    "if(fs.readlinkSync(" + JSON.stringify(integrationWorkspace + '/repos/CLAUDE.md') + ")!=='AGENTS.md')throw new Error('pinned symlink mismatch')",
  )
  return statements.join(';')
}

export const harnessModule = {
  descriptor: { harnessId: name, protocolVersion: 2, requiredFeatures: ${JSON.stringify(requiredFeatures)} },
  plan: context => Effect.gen(function* () {
    const observations = []
    for (const packageRoot of context.integration.packageRoots) {
      const scope = yield* context.target.readText({ root: 'PackageRoot', packageRoot, path: 'scope.txt' })
      const manifest = yield* context.target.readPackageManifest(packageRoot)
      observations.push({ packageRoot, scope, manifest })
    }
    const feedback = yield* context.target.readText({ root: 'IntegrationWorkspace', path: 'feedback/note.md' })
    const failureProbe = name === 'alpha' ? yield* context.target.readText({ root: 'ControlRoot', path: 'enable-failing-check' }) : undefined
    const wrong = observations.some(observation => observation.scope !== (observation.packageRoot === '.' ? 'root scope\\n' : 'app scope\\n') || observation.manifest?.name !== expectedManifestNames[observation.packageRoot])
    const outputs = [
      { kind: 'ManagedTree', id: 'managed', sourceRoot: 'assets/managed', locator: { root: 'IntegrationWorkspace', path: 'managed' } },
      { kind: 'PinnedReferenceTree', id: 'pins', archive: { path: 'assets/repos.pta', format: ${JSON.stringify(CANONICAL_TREE_ARCHIVE_FORMAT)} }, locator: { root: 'IntegrationWorkspace', path: 'repos' }, provenance: { sourceUrl: 'https://example.invalid/' + name + '.git', revision: name + '-' + version, treeDigest: ${JSON.stringify(treeDigest)} }, referenceOnly: true },
      ...context.integration.packageRoots.map(packageRoot => ({ kind: 'JsonKeyedItem', id: 'policy-' + rootId(packageRoot), locator: { root: 'PackageRoot', packageRoot, path: policyFile }, collectionPointer: '/plugins', keyField: 'name', keyValue: name, item: policy(packageRoot) })),
    ]
    const requirements = context.integration.packageRoots.map(requirement)
    const checks = context.integration.packageRoots.map(packageRoot => ({ id: 'verify-' + rootId(packageRoot), summary: name + ' policy is effective at ' + packageRoot, packageRoot, argv: ['node', '-e', checkCode(packageRoot)] }))
    if (failureProbe !== undefined) checks.push(
      { id: 'a-missing', summary: 'missing executable is aggregated', packageRoot: '.', argv: ['prelude-command-that-does-not-exist'] },
      { id: 'z-after', summary: 'later check still executes', packageRoot: '.', argv: ['node', '-e', "require('node:fs').writeFileSync('check-after-ran','yes')"] },
    )
    return { outputs, requirements, issues: wrong || feedback === undefined ? [{ id: 'target-observation', summary: 'Target roots or feedback are not observable' }] : [], checks }
  }),
}
`)
  await json(join(root, 'package.json'), {
    name: `@synthetic/${name}`,
    version,
    type: 'module',
    files: ['assets', 'prelude.js'],
    exports: { './prelude': name === 'alpha' ? { import: './prelude.js' } : './prelude.js' },
    dependencies: { '@sayoriqwq/prelude-contract': `file:${contractTar}`, 'effect': EFFECT_VERSION },
  })
  const archive = join(packs, `synthetic-${name}-${version}.tgz`)
  await execa('tar', ['-czf', archive, '-C', archiveRoot, 'package'])
  return { archive, managedText, pinnedText, treeDigest, version }
}

try {
  await mkdir(packs); await mkdir(target); await mkdir(fakeBin)
  const requiredTar = await packRequiredPackage()
  await execa('pnpm', ['--filter', '@sayoriqwq/prelude-contract', 'pack', '--pack-destination', packs], { cwd: workspaceRoot })
  await execa('pnpm', ['--filter', '@sayoriqwq/prelude', 'pack', '--pack-destination', packs], { cwd: workspaceRoot })
  const names = await readdir(packs); contractTar = join(packs, names.find(name => name.includes('prelude-contract'))!); const cliTar = join(packs, names.find(name => /^sayoriqwq-prelude-\d/.test(name))!)
  const alphaV1 = await packHarness('alpha', '1.0.0'); const betaV1 = await packHarness('beta', '1.0.0'); const alphaV2 = await packHarness('alpha', '1.1.0'); const betaV2 = await packHarness('beta', '1.1.0')
  const targetManifest = (alpha: HarnessPack, beta: HarnessPack) => ({ name: 'synthetic-target', private: true, devDependencies: { '@sayoriqwq/prelude': `file:${cliTar}`, '@synthetic/alpha': `file:${alpha.archive}`, '@synthetic/beta': `file:${beta.archive}`, 'effect': EFFECT_VERSION } })
  await json(join(target, 'package.json'), targetManifest(alphaV1, betaV1))
  await writeFile(join(target, 'pnpm-workspace.yaml'), `packages:\n  - packages/*\npackageImportMethod: copy\noverrides:\n  '@sayoriqwq/prelude-contract': 'file:${contractTar}'\n  '@effect/platform-node@${EFFECT_VERSION}>@effect/platform-node-shared': '${EFFECT_VERSION}'\ntrustPolicy: no-downgrade\ntrustPolicyExclude:\n  - effect@${EFFECT_VERSION}\n  - '@effect/platform-node@${EFFECT_VERSION}'\n  - '@effect/platform-node-shared@${EFFECT_VERSION}'\n`)
  await mkdir(join(target, 'packages/app'), { recursive: true }); await json(join(target, 'packages/app/package.json'), { name: 'workspace-app', private: true, devDependencies: { '@synthetic/required': `file:${requiredTar}` } })
  await mkdir(join(target, 'packages/other'), { recursive: true }); await json(join(target, 'packages/other/package.json'), { name: 'workspace-other-unselected', private: true, devDependencies: { '@synthetic/required': `file:${requiredTar}` } })
  await mkdir(join(target, '.prelude/i-alpha/feedback'), { recursive: true }); await mkdir(join(target, '.prelude/i-beta/feedback'), { recursive: true })
  await writeFile(join(target, '.prelude/config.jsonc'), `// installed V2 two-Harness tracer\n{ "schemaVersion": 2, "integrations": [\n  { "id": "beta", "module": "@synthetic/beta/prelude", "packageRoots": ["."] },\n  { "id": "alpha", "module": "@synthetic/alpha/prelude", "packageRoots": ["packages/app", "."] },\n], }\n`)
  const alphaFeedback = join(target, '.prelude/i-alpha/feedback/note.md'); const betaFeedback = join(target, '.prelude/i-beta/feedback/note.md')
  await writeFile(alphaFeedback, 'target-owned evidence before apply\n'); await writeFile(betaFeedback, 'target-owned evidence before apply\n')
  await writeFile(join(target, 'scope.txt'), 'root scope\n'); await writeFile(join(target, 'packages/app/scope.txt'), 'app scope\n')
  await writeFile(join(target, 'settings.json'), '{ "plugins": [] }\n'); await writeFile(join(target, 'beta-settings.json'), '{ "plugins": [] }\n'); await writeFile(join(target, 'packages/app/settings.json'), '{ "plugins": [] }\n')
  await run(['install'])
  await rm(join(target, 'packages/app/node_modules/@synthetic/required'), { recursive: true, force: true })
  await rm(join(target, 'packages/other/node_modules/@synthetic/required'), { recursive: true, force: true })
  await writeFile(join(fakeBin, 'git'), `#!/bin/sh\nprintf invoked > ${JSON.stringify(gitSentinel)}\nexit 97\n`); await chmod(join(fakeBin, 'git'), 0o755)
  const cli = join(target, 'node_modules/.bin/prelude'); const cliEnv = { ...process.env, CI: '1', PATH: `${fakeBin}:${process.env.PATH ?? ''}` }
  const cliRun = (args: ReadonlyArray<string>, cwd = target, reject = true) => execa(cli, args, { cwd, reject, env: cliEnv })
  const first = await cliRun(['plan', '--json']); const second = await cliRun(['plan', '--json'], join(target, 'packages/app'))
  assert.equal(first.stdout, second.stdout, 'root and nested V2 plan JSON must be byte-stable')
  const plan = JSON.parse(first.stdout)
  assert.equal(plan.schemaVersion, 2); assert.equal(plan.executionHashVersion, 2); assert.equal(plan.integrations.length, 2); assert.equal(plan.outputs.length, 7); assert.equal(plan.requirements.length, 3); assert.equal(plan.checks.length, 3); assert.equal(plan.blocked, false); assert.equal(plan.converged, false)
  assert.deepEqual(plan.integrations.find((integration: { integrationId: string }) => integration.integrationId === 'alpha').packageRoots, ['.', 'packages/app'])
  for (const integrationId of ['alpha', 'beta']) {
    const owned = plan.outputs.filter((output: { owner: { integrationId: string } }) => output.owner.integrationId === integrationId)
    assert.equal(owned.filter((output: { declaration: { kind: string } }) => output.declaration.kind === 'ManagedTree').length, 1)
    assert.equal(owned.filter((output: { declaration: { kind: string } }) => output.declaration.kind === 'PinnedReferenceTree').length, 1)
  }
  const alphaPolicies = plan.outputs.filter((output: { owner: { integrationId: string }, declaration: { kind: string } }) => output.owner.integrationId === 'alpha' && output.declaration.kind === 'JsonKeyedItem')
  assert.deepEqual(alphaPolicies.map((output: { declaration: { locator: { packageRoot: string } } }) => output.declaration.locator.packageRoot).sort(), ['.', 'packages/app'])
  assert.equal(plan.requirements.find((requirement: { declaration: { packageRoot: string } }) => requirement.declaration.packageRoot === 'packages/app').installationSatisfied, false)
  await writeFile(join(target, 'scope.txt'), 'changed observation\n')
  const stale = await cliRun(['apply', '--plan-hash', plan.executionHash, '--json'], target, false); assert.notEqual(stale.exitCode, 0); assert.match(stale.stderr, /Approved execution hash does not match/)
  assert.equal((await readdir(join(target, '.prelude/i-alpha'))).includes('managed'), false); assert.equal((await readdir(join(target, '.prelude/i-alpha'))).includes('repos'), false); assert.equal(await readFile(alphaFeedback, 'utf8'), 'target-owned evidence before apply\n')
  await writeFile(join(target, 'scope.txt'), 'root scope\n'); assert.equal(JSON.parse((await cliRun(['plan', '--json'])).stdout).executionHash, plan.executionHash)
  const appliedResult = await cliRun(['apply', '--plan-hash', plan.executionHash, '--json'], target, false)
  const applied = parseCliJson(appliedResult, cli, ['apply', '--plan-hash', plan.executionHash, '--json'], target)
  assert.equal(appliedResult.exitCode, 0, JSON.stringify(applied.plan.requirements, null, 2))
  assert.equal(applied.installed, true); assert.equal(applied.converged, true); assert.equal(applied.published, 7)
  await assert.rejects(
    readFile(join(target, 'packages/other/node_modules/@synthetic/required/package.json')),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'ENOENT',
    'frozen install must not materialize an unselected packageRoot',
  )
  assert.equal(await readFile(join(target, '.prelude/i-alpha/managed/alpha.txt'), 'utf8'), alphaV1.managedText); assert.equal(await readFile(join(target, '.prelude/i-alpha/repos/AGENTS.md'), 'utf8'), alphaV1.pinnedText); assert.equal(await readlink(join(target, '.prelude/i-alpha/repos/CLAUDE.md')), 'AGENTS.md')
  assert.equal(JSON.parse(await readFile(join(target, 'settings.json'), 'utf8')).plugins.some((item: { name: string, packageRoot: string }) => item.name === 'alpha' && item.packageRoot === '.'), true)
  assert.equal(JSON.parse(await readFile(join(target, 'packages/app/settings.json'), 'utf8')).plugins.some((item: { name: string, packageRoot: string }) => item.name === 'alpha' && item.packageRoot === 'packages/app'), true)
  await writeFile(alphaFeedback, 'target-owned evidence after apply\n'); await writeFile(betaFeedback, 'target-owned evidence after apply\n')
  const converged = JSON.parse((await cliRun(['plan', '--json'])).stdout); assert.equal(converged.converged, true); assert.equal(converged.outputs.every((output: { status: string }) => output.status === 'converged'), true); assert.equal(converged.requirements.every((requirement: { satisfied: boolean }) => requirement.satisfied), true)
  const reapplied = JSON.parse((await cliRun(['apply', '--plan-hash', converged.executionHash, '--json'])).stdout); assert.equal(reapplied.published, 0); assert.equal(reapplied.installed, false); assert.equal(await readFile(alphaFeedback, 'utf8'), 'target-owned evidence after apply\n')
  const checked = JSON.parse((await cliRun(['check', '--json'])).stdout); assert.equal(checked.checks.length, 3); assert.equal(checked.checks.every((check: { exitCode: number }) => check.exitCode === 0), true)
  const alphaRepos = join(target, '.prelude/i-alpha/repos'); await rm(join(alphaRepos, 'CLAUDE.md')); await writeFile(join(alphaRepos, 'CLAUDE.md'), 'target edit\n'); await writeFile(join(alphaRepos, 'AGENTS.md'), 'target edit\n'); await writeFile(join(alphaRepos, 'target-only.txt'), 'remove me\n')
  const drift = JSON.parse((await cliRun(['plan', '--json'])).stdout); const driftedPin = drift.outputs.find((output: { owner: { integrationId: string }, declaration: { kind: string } }) => output.owner.integrationId === 'alpha' && output.declaration.kind === 'PinnedReferenceTree')
  assert.equal(driftedPin.status, 'change'); assert.notEqual(driftedPin.currentHash, driftedPin.desiredHash); assert.match(driftedPin.evidence.join(' '), /reference drift/)
  const repaired = JSON.parse((await cliRun(['apply', '--plan-hash', drift.executionHash, '--json'])).stdout); assert.equal(repaired.converged, true); assert.deepEqual((await readdir(alphaRepos)).sort(), ['AGENTS.md', 'CLAUDE.md', 'REVISION']); assert.equal(await readlink(join(alphaRepos, 'CLAUDE.md')), 'AGENTS.md'); assert.equal(await readFile(join(alphaRepos, 'AGENTS.md'), 'utf8'), alphaV1.pinnedText); assert.equal(await readFile(alphaFeedback, 'utf8'), 'target-owned evidence after apply\n')
  await json(join(target, 'package.json'), targetManifest(alphaV2, betaV2)); await run(['install', '--no-frozen-lockfile'])
  const upgrade = JSON.parse((await cliRun(['plan', '--json'])).stdout); assert.notEqual(upgrade.executionHash, repaired.plan.executionHash); assert.equal(upgrade.integrations.every((integration: { artifact: { packageVersion: string } }) => integration.artifact.packageVersion === '1.1.0'), true)
  const upgradePin = upgrade.outputs.find((output: { owner: { integrationId: string }, declaration: { kind: string } }) => output.owner.integrationId === 'alpha' && output.declaration.kind === 'PinnedReferenceTree'); assert.equal(upgradePin.declaration.provenance.treeDigest, alphaV2.treeDigest); assert.equal(upgradePin.status, 'change')
  const beforeStaleUpgrade = await readFile(join(alphaRepos, 'AGENTS.md'), 'utf8'); const staleUpgrade = await cliRun(['apply', '--plan-hash', repaired.plan.executionHash, '--json'], target, false); assert.notEqual(staleUpgrade.exitCode, 0); assert.equal(await readFile(join(alphaRepos, 'AGENTS.md'), 'utf8'), beforeStaleUpgrade); assert.equal(await readFile(alphaFeedback, 'utf8'), 'target-owned evidence after apply\n')
  const upgraded = JSON.parse((await cliRun(['apply', '--plan-hash', upgrade.executionHash, '--json'])).stdout); assert.equal(upgraded.converged, true); assert.equal(await readFile(join(alphaRepos, 'AGENTS.md'), 'utf8'), alphaV2.pinnedText); assert.equal(await readlink(join(alphaRepos, 'CLAUDE.md')), 'AGENTS.md'); assert.equal(await readFile(join(target, '.prelude/i-alpha/managed/alpha.txt'), 'utf8'), alphaV2.managedText); assert.equal(await readFile(alphaFeedback, 'utf8'), 'target-owned evidence after apply\n')
  assert.equal(JSON.parse((await cliRun(['plan', '--json'])).stdout).converged, true); assert.equal(JSON.parse((await cliRun(['check', '--json'])).stdout).checks.length, 3)
  await writeFile(join(target, 'enable-failing-check'), 'enabled\n'); const failedCheck = await cliRun(['check', '--json'], target, false); assert.notEqual(failedCheck.exitCode, 0); assert.equal(await readFile(join(target, 'check-after-ran'), 'utf8'), 'yes'); assert.match(failedCheck.stderr, /a-missing/); assert.match(failedCheck.stderr, /z-after/); assert.match(failedCheck.stderr, /finalPlanHash/)
  await rm(join(target, 'packages/app/node_modules'), { recursive: true, force: true }); await writeFile(join(fakeBin, 'pnpm'), '#!/bin/sh\nprintf "synthetic pnpm failure\\n" >&2\nexit 37\n'); await chmod(join(fakeBin, 'pnpm'), 0o755)
  const failedInstallPlan = JSON.parse((await cliRun(['plan', '--json'])).stdout); const failedInstall = await cliRun(['apply', '--plan-hash', failedInstallPlan.executionHash, '--json'], target, false); assert.notEqual(failedInstall.exitCode, 0); assert.match(failedInstall.stderr, /Approved packageRoot did not resolve|Frozen install/); assert.match(failedInstall.stderr, /"exitCode":37/); assert.match(failedInstall.stderr, /synthetic pnpm failure/); assert.match(failedInstall.stderr, /packages/)
  for (const integrationId of ['alpha', 'beta']) assert.deepEqual((await readdir(join(target, `.prelude/i-${integrationId}`))).sort(), ['feedback', 'managed', 'repos'])
  const preludeEntries = [await readdir(join(target, '.prelude')), await readdir(join(target, '.prelude/i-alpha')), await readdir(join(target, '.prelude/i-beta'))].flat(); assert.equal(preludeEntries.some(entry => /receipt|manifest|journal|snapshot|provider|dispatcher|\.git/i.test(entry)), false)
  for (const name of ['alpha', 'beta']) { const manifest = JSON.parse(await readFile(join(target, `node_modules/@synthetic/${name}/package.json`), 'utf8')); assert.equal(manifest.bin, undefined); assert.deepEqual(Object.keys(manifest.exports), ['./prelude']) }
  assert.equal((await readdir(join(target, 'node_modules/.bin'))).some(name => /provider|dispatcher/.test(name)), false); assert.equal((await readdir(temp)).includes('git-invoked'), false, 'Prelude must not invoke Target Git')
  console.log(`installed V2 tracer passed: ${upgraded.plan.executionHash}`)
}
finally {
  if (process.env.PRELUDE_KEEP_TEMP === '1')
    console.error(`preserved installed tracer target: ${temp}`)
  else
    await rm(temp, { recursive: true, force: true })
}
