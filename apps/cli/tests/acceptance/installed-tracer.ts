import { strict as assert } from 'node:assert'

import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { Config, Console, Data, Effect, FileSystem, Layer, Path } from 'effect'

import { CANONICAL_TREE_ARCHIVE_FORMAT, encodeCanonicalTreeArchive } from '../../../../packages/harness-contract/dist/index.js'
import { decodeJson, encodeJson } from '../../src/json.ts'
import { runProcess } from './process.ts'

const EFFECT_VERSION = '4.0.0-beta.97'

type Json = Record<string, any>

class AcceptanceError extends Data.TaggedError('@sayoriqwq/prelude/tests/acceptance/installed-tracer/AcceptanceError')<{
  readonly message: string
}> {}

function parseJson(source: string): Json {
  const value = decodeJson(source)
  assert(value !== null && typeof value === 'object' && !Array.isArray(value))
  return value
}

interface HarnessPack {
  readonly archive: string
  readonly managedText: string
  readonly pinnedText: string
  readonly treeDigest: string
  readonly version: string
}

const program = Effect.scoped(Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const join = path.join
  const cliRoot = join(import.meta.dirname, '../..')
  const workspaceRoot = join(cliRoot, '../..')
  const fixtureRoot = join(workspaceRoot, 'tmp')
  const keepTemp = yield* Config.boolean('PRELUDE_KEEP_TEMP').pipe(Config.withDefault(false))
  const systemPath = yield* Config.string('PATH').pipe(Config.withDefault(''))
  yield* fs.makeDirectory(fixtureRoot, { recursive: true })
  const temp = keepTemp
    ? yield* fs.makeTempDirectory({ directory: fixtureRoot, prefix: 'prelude-installed-' })
    : yield* fs.makeTempDirectoryScoped({ directory: fixtureRoot, prefix: 'prelude-installed-' })
  const packs = join(temp, 'packs')
  const target = join(temp, 'target')
  const fakeBin = join(temp, 'fake-bin')
  const gitSentinel = join(temp, 'git-invoked')
  yield* Effect.forEach([packs, target, fakeBin], path => fs.makeDirectory(path), { discard: true })

  const json = (path: string, value: unknown) => fs.writeFileString(path, `${encodeJson(value)}\n`)
  const run = (args: ReadonlyArray<string>, reject = true) => runProcess('pnpm', args, { cwd: target, reject, env: { CI: '1' } })
  const assertAbsent = (path: string) => fs.exists(path).pipe(Effect.map(exists => assert.equal(exists, false, `${path} must be absent`)))
  const parseCliJson = (result: { readonly stdout: string, readonly stderr: string, readonly exitCode: number }, cliPath: string, args: ReadonlyArray<string>, cwd: string) => {
    if (result.stdout.trim() === '')
      throw new AcceptanceError({ message: `CLI JSON output was empty: argv=${encodeJson([cliPath, ...args])} cwd=${cwd} exitCode=${result.exitCode} stdout=${encodeJson(result.stdout)} stderr=${encodeJson(result.stderr)}` })
    return parseJson(result.stdout)
  }

  const packRequiredPackage = Effect.fn(function* () {
    const archiveRoot = join(temp, 'required-1.0.0')
    const root = join(archiveRoot, 'package')
    yield* fs.makeDirectory(root, { recursive: true })
    yield* json(join(root, 'package.json'), { name: '@synthetic/required', version: '1.0.0', type: 'module', exports: './index.js' })
    yield* fs.writeFileString(join(root, 'index.js'), 'export const installed = true\n')
    const archive = join(packs, 'synthetic-required-1.0.0.tgz')
    yield* runProcess('tar', ['-czf', archive, '-C', archiveRoot, 'package'])
    return archive
  })

  const requiredTar = yield* packRequiredPackage()
  yield* runProcess('pnpm', ['--filter', '@sayoriqwq/prelude-contract', 'pack', '--pack-destination', packs], { cwd: workspaceRoot })
  yield* runProcess('pnpm', ['--filter', '@sayoriqwq/prelude', 'pack', '--pack-destination', packs], { cwd: workspaceRoot })
  const packNames = yield* fs.readDirectory(packs)
  const contractArchive = packNames.find(name => name.includes('prelude-contract'))
  const cliArchive = packNames.find(name => /^sayoriqwq-prelude-\d/.test(name))
  if (contractArchive === undefined || cliArchive === undefined)
    return yield* new AcceptanceError({ message: 'Packed Prelude or Contract archive is absent' })
  const contractTar = join(packs, contractArchive)
  const cliTar = join(packs, cliArchive)

  const packHarness = Effect.fn(function* (name: 'alpha' | 'beta', version: string) {
    const archiveRoot = join(temp, `${name}-${version}`)
    const root = join(archiveRoot, 'package')
    const managed = join(root, 'assets/managed')
    yield* fs.makeDirectory(managed, { recursive: true })
    const managedText = `${name} managed ${version}\n`
    const pinnedText = `${name} pinned source ${version}\n`
    yield* fs.writeFileString(join(managed, `${name}.txt`), managedText)
    const encodedTree = encodeCanonicalTreeArchive([
      { kind: 'file', path: 'AGENTS.md', mode: 0o644, bytes: new TextEncoder().encode(pinnedText) },
      { kind: 'symbolicLink', path: 'CLAUDE.md', mode: 0o777, target: 'AGENTS.md' },
      { kind: 'file', path: 'REVISION', mode: 0o644, bytes: new TextEncoder().encode(`${name}-${version}\n`) },
    ])
    yield* fs.writeFile(join(root, 'assets/repos.pta'), encodedTree.bytes)
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
    yield* fs.writeFileString(join(root, 'prelude.js'), `
import { Effect } from 'effect'

const name = ${encodeJson(name)}
const version = ${encodeJson(version)}
const policyFile = ${encodeJson(policyFile)}
const expectedManifestNames = { '.': 'synthetic-target', 'packages/app': 'workspace-app' }
const integrationWorkspace = '.prelude/' + encodeURIComponent(name)
const rootId = packageRoot => packageRoot === '.' ? 'root' : packageRoot.replaceAll('/', '-')
const policy = packageRoot => ({ name, version, packageRoot })
const requirement = packageRoot => packageRoot === '.'
  ? { id: 'effect-root', packageRoot, packageName: 'effect', range: ${encodeJson(EFFECT_VERSION)}, section: 'devDependencies' }
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
  descriptor: { harnessId: name, protocolVersion: 2, requiredFeatures: ${encodeJson(requiredFeatures)} },
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
      { kind: 'PinnedReferenceTree', id: 'pins', archive: { path: 'assets/repos.pta', format: ${encodeJson(CANONICAL_TREE_ARCHIVE_FORMAT)} }, locator: { root: 'IntegrationWorkspace', path: 'repos' }, provenance: { sourceUrl: 'https://example.invalid/' + name + '.git', revision: name + '-' + version, treeDigest: ${encodeJson(encodedTree.treeDigest)} }, referenceOnly: true },
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
    yield* json(join(root, 'package.json'), {
      name: `@synthetic/${name}`,
      version,
      type: 'module',
      files: ['assets', 'prelude.js'],
      exports: { './prelude': name === 'alpha' ? { import: './prelude.js' } : './prelude.js' },
      dependencies: { '@sayoriqwq/prelude-contract': `file:${contractTar}`, 'effect': EFFECT_VERSION },
    })
    const archive = join(packs, `synthetic-${name}-${version}.tgz`)
    yield* runProcess('tar', ['-czf', archive, '-C', archiveRoot, 'package'])
    return { archive, managedText, pinnedText, treeDigest: encodedTree.treeDigest, version } satisfies HarnessPack
  })

  const alphaV1 = yield* packHarness('alpha', '1.0.0')
  const betaV1 = yield* packHarness('beta', '1.0.0')
  const alphaV2 = yield* packHarness('alpha', '1.1.0')
  const betaV2 = yield* packHarness('beta', '1.1.0')
  const targetManifest = (alpha: HarnessPack, beta: HarnessPack) => ({ name: 'synthetic-target', private: true, devDependencies: { '@sayoriqwq/prelude': `file:${cliTar}`, '@synthetic/alpha': `file:${alpha.archive}`, '@synthetic/beta': `file:${beta.archive}`, 'effect': EFFECT_VERSION } })
  yield* json(join(target, 'package.json'), targetManifest(alphaV1, betaV1))
  yield* fs.writeFileString(join(target, 'pnpm-workspace.yaml'), `packages:\n  - packages/*\npackageImportMethod: copy\noverrides:\n  '@sayoriqwq/prelude-contract': 'file:${contractTar}'\n  '@effect/platform-node@${EFFECT_VERSION}>@effect/platform-node-shared': '${EFFECT_VERSION}'\ntrustPolicy: no-downgrade\ntrustPolicyExclude:\n  - effect@${EFFECT_VERSION}\n  - '@effect/platform-node@${EFFECT_VERSION}'\n  - '@effect/platform-node-shared@${EFFECT_VERSION}'\n`)
  yield* fs.makeDirectory(join(target, 'packages/app'), { recursive: true })
  yield* json(join(target, 'packages/app/package.json'), { name: 'workspace-app', private: true, devDependencies: { '@synthetic/required': `file:${requiredTar}` } })
  yield* fs.makeDirectory(join(target, 'packages/other'), { recursive: true })
  yield* json(join(target, 'packages/other/package.json'), { name: 'workspace-other-unselected', private: true, devDependencies: { '@synthetic/required': `file:${requiredTar}` } })
  yield* fs.makeDirectory(join(target, '.prelude/alpha/feedback'), { recursive: true })
  yield* fs.makeDirectory(join(target, '.prelude/beta/feedback'), { recursive: true })
  yield* fs.writeFileString(join(target, '.prelude/config.jsonc'), `// installed V2 two-Harness tracer\n{ "schemaVersion": 2, "integrations": [\n  { "id": "beta", "module": "@synthetic/beta/prelude", "packageRoots": ["."] },\n  { "id": "alpha", "module": "@synthetic/alpha/prelude", "packageRoots": ["packages/app", "."] },\n], }\n`)
  const alphaFeedback = join(target, '.prelude/alpha/feedback/note.md')
  const betaFeedback = join(target, '.prelude/beta/feedback/note.md')
  yield* fs.writeFileString(alphaFeedback, 'target-owned evidence before apply\n')
  yield* fs.writeFileString(betaFeedback, 'target-owned evidence before apply\n')
  yield* fs.writeFileString(join(target, 'scope.txt'), 'root scope\n')
  yield* fs.writeFileString(join(target, 'packages/app/scope.txt'), 'app scope\n')
  yield* fs.writeFileString(join(target, 'settings.json'), '{ "plugins": [] }\n')
  yield* fs.writeFileString(join(target, 'beta-settings.json'), '{ "plugins": [] }\n')
  yield* fs.writeFileString(join(target, 'packages/app/settings.json'), '{ "plugins": [] }\n')
  yield* run(['install'])
  yield* fs.remove(join(target, 'packages/app/node_modules/@synthetic/required'), { recursive: true, force: true })
  yield* fs.remove(join(target, 'packages/other/node_modules/@synthetic/required'), { recursive: true, force: true })
  yield* fs.writeFileString(join(fakeBin, 'git'), `#!/bin/sh\nprintf invoked > ${encodeJson(gitSentinel)}\nexit 97\n`)
  yield* fs.chmod(join(fakeBin, 'git'), 0o755)
  const cli = join(target, 'node_modules/.bin/prelude')
  const cliEnv = { CI: '1', PATH: `${fakeBin}:${systemPath}` }
  const cliRun = (args: ReadonlyArray<string>, cwd = target, reject = true) => runProcess(cli, args, { cwd, reject, env: cliEnv })
  const first = yield* cliRun(['plan', '--json'])
  const second = yield* cliRun(['plan', '--json'], join(target, 'packages/app'))
  assert.equal(first.stdout, second.stdout, 'root and nested V2 plan JSON must be byte-stable')
  const plan = parseJson(first.stdout)
  assert.equal(plan.schemaVersion, 2)
  assert.equal(plan.executionHashVersion, 2)
  assert.equal(plan.integrations.length, 2)
  assert.equal(plan.outputs.length, 7)
  assert.equal(plan.requirements.length, 3)
  assert.equal(plan.checks.length, 3)
  assert.equal(plan.blocked, false)
  assert.equal(plan.converged, false)
  assert.deepEqual(plan.integrations.find((integration: { integrationId: string }) => integration.integrationId === 'alpha').packageRoots, ['.', 'packages/app'])
  for (const integrationId of ['alpha', 'beta']) {
    const owned = plan.outputs.filter((output: { owner: { integrationId: string } }) => output.owner.integrationId === integrationId)
    assert.equal(owned.filter((output: { declaration: { kind: string } }) => output.declaration.kind === 'ManagedTree').length, 1)
    assert.equal(owned.filter((output: { declaration: { kind: string } }) => output.declaration.kind === 'PinnedReferenceTree').length, 1)
  }
  const alphaPolicies = plan.outputs.filter((output: { owner: { integrationId: string }, declaration: { kind: string } }) => output.owner.integrationId === 'alpha' && output.declaration.kind === 'JsonKeyedItem')
  assert.deepEqual(alphaPolicies.map((output: { declaration: { locator: { packageRoot: string } } }) => output.declaration.locator.packageRoot).sort(), ['.', 'packages/app'])
  assert.equal(plan.requirements.find((requirement: { declaration: { packageRoot: string } }) => requirement.declaration.packageRoot === 'packages/app').installationSatisfied, false)
  yield* fs.writeFileString(join(target, 'scope.txt'), 'changed observation\n')
  const stale = yield* cliRun(['apply', '--plan-hash', plan.executionHash, '--json'], target, false)
  assert.notEqual(stale.exitCode, 0)
  assert.match(stale.stderr, /Approved execution hash does not match/)
  assert.equal((yield* fs.readDirectory(join(target, '.prelude/alpha'))).includes('managed'), false)
  assert.equal((yield* fs.readDirectory(join(target, '.prelude/alpha'))).includes('repos'), false)
  assert.equal(yield* fs.readFileString(alphaFeedback), 'target-owned evidence before apply\n')
  yield* fs.writeFileString(join(target, 'scope.txt'), 'root scope\n')
  assert.equal(parseJson((yield* cliRun(['plan', '--json'])).stdout).executionHash, plan.executionHash)
  const appliedResult = yield* cliRun(['apply', '--plan-hash', plan.executionHash, '--json'], target, false)
  const applied = parseCliJson(appliedResult, cli, ['apply', '--plan-hash', plan.executionHash, '--json'], target)
  assert.equal(appliedResult.exitCode, 0, encodeJson(applied.plan.requirements))
  assert.equal(applied.installed, true)
  assert.equal(applied.converged, true)
  assert.equal(applied.published, 7)
  yield* assertAbsent(join(target, 'packages/other/node_modules/@synthetic/required/package.json'))
  assert.equal(yield* fs.readFileString(join(target, '.prelude/alpha/managed/alpha.txt')), alphaV1.managedText)
  assert.equal(yield* fs.readFileString(join(target, '.prelude/alpha/repos/AGENTS.md')), alphaV1.pinnedText)
  assert.equal(yield* fs.readLink(join(target, '.prelude/alpha/repos/CLAUDE.md')), 'AGENTS.md')
  assert.equal(parseJson(yield* fs.readFileString(join(target, 'settings.json'))).plugins.some((item: { name: string, packageRoot: string }) => item.name === 'alpha' && item.packageRoot === '.'), true)
  assert.equal(parseJson(yield* fs.readFileString(join(target, 'packages/app/settings.json'))).plugins.some((item: { name: string, packageRoot: string }) => item.name === 'alpha' && item.packageRoot === 'packages/app'), true)
  yield* fs.writeFileString(alphaFeedback, 'target-owned evidence after apply\n')
  yield* fs.writeFileString(betaFeedback, 'target-owned evidence after apply\n')
  const converged = parseJson((yield* cliRun(['plan', '--json'])).stdout)
  assert.equal(converged.converged, true)
  assert.equal(converged.outputs.every((output: { status: string }) => output.status === 'converged'), true)
  assert.equal(converged.requirements.every((requirement: { satisfied: boolean }) => requirement.satisfied), true)
  const reapplied = parseJson((yield* cliRun(['apply', '--plan-hash', converged.executionHash, '--json'])).stdout)
  assert.equal(reapplied.published, 0)
  assert.equal(reapplied.installed, false)
  assert.equal(yield* fs.readFileString(alphaFeedback), 'target-owned evidence after apply\n')
  const checked = parseJson((yield* cliRun(['check', '--json'])).stdout)
  assert.equal(checked.checks.length, 3)
  assert.equal(checked.checks.every((check: { exitCode: number }) => check.exitCode === 0), true)
  const alphaRepos = join(target, '.prelude/alpha/repos')
  yield* fs.remove(join(alphaRepos, 'CLAUDE.md'))
  yield* fs.writeFileString(join(alphaRepos, 'CLAUDE.md'), 'target edit\n')
  yield* fs.writeFileString(join(alphaRepos, 'AGENTS.md'), 'target edit\n')
  yield* fs.writeFileString(join(alphaRepos, 'target-only.txt'), 'remove me\n')
  const drift = parseJson((yield* cliRun(['plan', '--json'])).stdout)
  const driftedPin = drift.outputs.find((output: { owner: { integrationId: string }, declaration: { kind: string } }) => output.owner.integrationId === 'alpha' && output.declaration.kind === 'PinnedReferenceTree')
  assert.equal(driftedPin.status, 'change')
  assert.notEqual(driftedPin.currentHash, driftedPin.desiredHash)
  assert.match(driftedPin.evidence.join(' '), /reference drift/)
  const repaired = parseJson((yield* cliRun(['apply', '--plan-hash', drift.executionHash, '--json'])).stdout)
  assert.equal(repaired.converged, true)
  assert.deepEqual((yield* fs.readDirectory(alphaRepos)).sort(), ['AGENTS.md', 'CLAUDE.md', 'REVISION'])
  assert.equal(yield* fs.readLink(join(alphaRepos, 'CLAUDE.md')), 'AGENTS.md')
  assert.equal(yield* fs.readFileString(join(alphaRepos, 'AGENTS.md')), alphaV1.pinnedText)
  assert.equal(yield* fs.readFileString(alphaFeedback), 'target-owned evidence after apply\n')
  yield* json(join(target, 'package.json'), targetManifest(alphaV2, betaV2))
  yield* run(['install', '--no-frozen-lockfile'])
  const upgrade = parseJson((yield* cliRun(['plan', '--json'])).stdout)
  assert.notEqual(upgrade.executionHash, repaired.plan.executionHash)
  assert.equal(upgrade.integrations.every((integration: { artifact: { packageVersion: string } }) => integration.artifact.packageVersion === '1.1.0'), true)
  const upgradePin = upgrade.outputs.find((output: { owner: { integrationId: string }, declaration: { kind: string } }) => output.owner.integrationId === 'alpha' && output.declaration.kind === 'PinnedReferenceTree')
  assert.equal(upgradePin.declaration.provenance.treeDigest, alphaV2.treeDigest)
  assert.equal(upgradePin.status, 'change')
  const beforeStaleUpgrade = yield* fs.readFileString(join(alphaRepos, 'AGENTS.md'))
  const staleUpgrade = yield* cliRun(['apply', '--plan-hash', repaired.plan.executionHash, '--json'], target, false)
  assert.notEqual(staleUpgrade.exitCode, 0)
  assert.equal(yield* fs.readFileString(join(alphaRepos, 'AGENTS.md')), beforeStaleUpgrade)
  assert.equal(yield* fs.readFileString(alphaFeedback), 'target-owned evidence after apply\n')
  const upgraded = parseJson((yield* cliRun(['apply', '--plan-hash', upgrade.executionHash, '--json'])).stdout)
  assert.equal(upgraded.converged, true)
  assert.equal(yield* fs.readFileString(join(alphaRepos, 'AGENTS.md')), alphaV2.pinnedText)
  assert.equal(yield* fs.readLink(join(alphaRepos, 'CLAUDE.md')), 'AGENTS.md')
  assert.equal(yield* fs.readFileString(join(target, '.prelude/alpha/managed/alpha.txt')), alphaV2.managedText)
  assert.equal(yield* fs.readFileString(alphaFeedback), 'target-owned evidence after apply\n')
  assert.equal(parseJson((yield* cliRun(['plan', '--json'])).stdout).converged, true)
  assert.equal(parseJson((yield* cliRun(['check', '--json'])).stdout).checks.length, 3)
  yield* fs.writeFileString(join(target, 'enable-failing-check'), 'enabled\n')
  const failedCheck = yield* cliRun(['check', '--json'], target, false)
  assert.notEqual(failedCheck.exitCode, 0)
  assert.equal(yield* fs.readFileString(join(target, 'check-after-ran')), 'yes')
  assert.match(failedCheck.stderr, /a-missing/)
  assert.match(failedCheck.stderr, /z-after/)
  assert.match(failedCheck.stderr, /finalPlanHash/)
  yield* fs.remove(join(target, 'packages/app/node_modules'), { recursive: true, force: true })
  yield* fs.writeFileString(join(fakeBin, 'pnpm'), '#!/bin/sh\nprintf "synthetic pnpm failure\\n" >&2\nexit 37\n')
  yield* fs.chmod(join(fakeBin, 'pnpm'), 0o755)
  const failedInstallPlan = parseJson((yield* cliRun(['plan', '--json'])).stdout)
  const failedInstall = yield* cliRun(['apply', '--plan-hash', failedInstallPlan.executionHash, '--json'], target, false)
  assert.notEqual(failedInstall.exitCode, 0)
  assert.match(failedInstall.stderr, /Approved packageRoot did not resolve|Frozen install/)
  assert.match(failedInstall.stderr, /"exitCode":37/)
  assert.match(failedInstall.stderr, /synthetic pnpm failure/)
  assert.match(failedInstall.stderr, /packages/)
  for (const integrationId of ['alpha', 'beta']) assert.deepEqual((yield* fs.readDirectory(join(target, `.prelude/${integrationId}`))).sort(), ['feedback', 'managed', 'repos'])
  const preludeEntries = [
    ...yield* fs.readDirectory(join(target, '.prelude')),
    ...yield* fs.readDirectory(join(target, '.prelude/alpha')),
    ...yield* fs.readDirectory(join(target, '.prelude/beta')),
  ]
  assert.equal(preludeEntries.some(entry => /receipt|manifest|journal|snapshot|provider|dispatcher|\.git/i.test(entry)), false)
  for (const name of ['alpha', 'beta']) {
    const manifest = parseJson(yield* fs.readFileString(join(target, `node_modules/@synthetic/${name}/package.json`)))
    assert.equal(manifest.bin, undefined)
    assert.deepEqual(Object.keys(manifest.exports), ['./prelude'])
  }
  assert.equal((yield* fs.readDirectory(join(target, 'node_modules/.bin'))).some(name => /provider|dispatcher/.test(name)), false)
  yield* assertAbsent(gitSentinel)
  yield* Console.log(`installed V2 tracer passed: ${upgraded.plan.executionHash}`)
  if (keepTemp)
    yield* Console.error(`preserved installed tracer target: ${temp}`)
}))

const main = Effect.scoped(Effect.gen(function* () {
  const services = yield* Layer.build(NodeServices.layer)
  return yield* Effect.provide(program, services)
}))

NodeRuntime.runMain(main)
