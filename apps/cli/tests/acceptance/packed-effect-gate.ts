import { strict as assert } from 'node:assert'

import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { Config, Console, Data, Effect, FileSystem, Layer, Option, Path } from 'effect'

import { decodeJson, encodeJson } from '../../src/json.ts'
import { runProcess } from './process.ts'

const EFFECT_DIGEST = 'd797515e8ecb2e164deef65b6b7abde6445201ce9d1e9e584f39d634c2469e95'
const TSGO_DIGEST = 'f76adab084de0de584e0a565679b3afca2b48674a28e36c7dd6398846fd2bd9d'
type Json = Record<string, any>

class AcceptanceError extends Data.TaggedError('@sayoriqwq/prelude/tests/acceptance/packed-effect-gate/AcceptanceError')<{
  readonly message: string
}> {}

function parseJson(source: string): Json {
  const value = decodeJson(source)
  assert(value !== null && typeof value === 'object' && !Array.isArray(value))
  return value
}

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
  typecheck: 'node --experimental-strip-types run-tsgo.ts --noEmit --project tsconfig.json',
  lint: 'eslint src',
  verify: `node -e "const c=JSON.parse(require('node:fs').readFileSync('tsconfig.json','utf8'));if(!c.compilerOptions.plugins.some(p=>p.name==='@effect/language-service'))throw new Error('managed policy missing')"`,
}

const eslintConfig = `import antfu from '@antfu/eslint-config'\nimport effectHarness from '@sayoriqwq/effect-harness/eslint'\n\nexport default antfu().append(...effectHarness)\n`
const source = `import { Effect } from 'effect'\n\nexport const program = Effect.succeed('gate')\n`
function targetRootManifest(name: string, selected: boolean, cliTar: string, harnessTar: string): Json {
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

const program = Effect.scoped(Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const join = path.join
  const workspaceRoot = join(import.meta.dirname, '../../../..')
  const gateInput = join(workspaceRoot, 'tmp/gate-input')
  const harnessTar = yield* Config.string('EFFECT_HARNESS_TARBALL').pipe(Config.withDefault(join(gateInput, 'sayoriqwq-effect-harness-0.2.0.tgz')))
  const contractTar = yield* Config.string('PRELUDE_CONTRACT_TARBALL').pipe(Config.withDefault(join(gateInput, 'sayoriqwq-prelude-contract-0.2.0.tgz')))
  const cliTar = yield* Config.string('PRELUDE_CLI_TARBALL').pipe(Config.withDefault(join(gateInput, 'sayoriqwq-prelude-0.3.0.tgz')))
  const fixtureRoot = join(workspaceRoot, 'tmp')
  const requestedRunRoot = Option.getOrUndefined(yield* Config.option(Config.string('PRELUDE_GATE_ROOT')))
  const prepareOnly = yield* Config.boolean('PRELUDE_GATE_PREPARE_ONLY').pipe(Config.withDefault(false))
  const keepTemp = yield* Config.boolean('PRELUDE_KEEP_TEMP').pipe(Config.withDefault(false))
  const preserveRunRoot = keepTemp || prepareOnly || requestedRunRoot !== undefined
  const tsgoRunner = yield* fs.readFileString(join(workspaceRoot, 'tooling/run-tsgo.ts'))
  yield* fs.makeDirectory(fixtureRoot, { recursive: true })
  const runRoot = requestedRunRoot ?? (yield* (preserveRunRoot
    ? fs.makeTempDirectory({ directory: fixtureRoot, prefix: 'packed-effect-gate-' })
    : fs.makeTempDirectoryScoped({ directory: fixtureRoot, prefix: 'packed-effect-gate-' })))
  yield* fs.makeDirectory(runRoot, { recursive: true })

  const json = (path: string, value: unknown) => fs.writeFileString(path, `${encodeJson(value)}\n`)
  const assertAbsent = (path: string) => fs.exists(path).pipe(Effect.map(exists => assert.equal(exists, false, `${path} must be absent`)))

  const writeSelectedPackage = Effect.fn(function* (root: string, name: string) {
    const packageRelative = root.slice(root.lastIndexOf('/packages/') + '/packages/'.length)
    const packageScripts = { ...scripts, lint: `cd ../.. && eslint packages/${packageRelative}/src` }
    yield* fs.makeDirectory(join(root, 'src'), { recursive: true })
    yield* json(join(root, 'package.json'), { name, private: true, type: 'module', scripts: packageScripts, dependencies: selectedDependencies, devDependencies: selectedDevDependencies })
    yield* json(join(root, 'tsconfig.json'), { compilerOptions: { target: 'ES2024', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, skipLibCheck: true }, include: ['src/**/*.ts'] })
    yield* fs.writeFileString(join(root, 'run-tsgo.ts'), tsgoRunner)
    yield* fs.writeFileString(join(root, 'src/index.ts'), source)
  })

  const installTarget = (root: string) => runProcess('pnpm', ['install', '--reporter', 'append-only'], {
    cwd: root,
    env: { CI: '1', INIT_CWD: root, PNPM_PACKAGE_NAME: undefined, npm_command: undefined, npm_config_dir: undefined, npm_config_filter: undefined, npm_config_recursive: undefined, npm_config_workspace_dir: undefined },
    inherit: true,
    timeout: '120 seconds',
  })

  const runGate = Effect.fn(function* (name: 'single' | 'monorepo', packageRoots: ReadonlyArray<string>, integrationId: string) {
    const target = join(runRoot, name)
    const integrationWorkspacePath = join(target, '.prelude', encodeURIComponent(integrationId))
    yield* fs.makeDirectory(join(integrationWorkspacePath, 'feedback'), { recursive: true })
    yield* fs.remove(join(integrationWorkspacePath, 'managed'), { recursive: true, force: true })
    yield* fs.remove(join(integrationWorkspacePath, 'repos'), { recursive: true, force: true })
    for (const entry of yield* fs.readDirectory(integrationWorkspacePath)) {
      if (entry.startsWith('.managed.prelude-') || entry.startsWith('.effect.prelude-') || entry.startsWith('.tsgo.prelude-'))
        yield* fs.remove(join(integrationWorkspacePath, entry), { recursive: true, force: true })
    }
    yield* json(join(target, 'package.json'), targetRootManifest(`effect-gate-${name}`, packageRoots.includes('.'), cliTar, harnessTar))
    yield* fs.writeFileString(join(target, 'pnpm-workspace.yaml'), `packages:\n  - packages/*\ndedupeDirectDeps: false\npackageImportMethod: copy\noverrides:\n  '@sayoriqwq/prelude-contract': 'file:${contractTar}'\n  '@effect/platform-node@4.0.0-beta.97>@effect/platform-node-shared': '4.0.0-beta.97'\ntrustPolicy: no-downgrade\ntrustPolicyExclude:\n  - effect@4.0.0-beta.97\n  - '@effect/platform-node@4.0.0-beta.97'\n  - '@effect/platform-node-shared@4.0.0-beta.97'\n  - '@effect/vitest@4.0.0-beta.97'\n`)
    yield* fs.writeFileString(join(target, 'eslint.config.mjs'), eslintConfig)
    if (packageRoots.includes('.')) {
      yield* json(join(target, 'tsconfig.json'), { compilerOptions: { target: 'ES2024', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, skipLibCheck: true }, include: ['src/**/*.ts'] })
      yield* fs.writeFileString(join(target, 'run-tsgo.ts'), tsgoRunner)
      yield* fs.makeDirectory(join(target, 'src'), { recursive: true })
      yield* fs.writeFileString(join(target, 'src/index.ts'), source)
    }
    else {
      yield* Effect.forEach(packageRoots, packageRoot => writeSelectedPackage(join(target, packageRoot), `effect-gate-${packageRoot.replaceAll('/', '-')}`), { discard: true })
    }
    const workspace = `.prelude/${encodeURIComponent(integrationId)}`
    const feedback = join(target, workspace, 'feedback/evidence.md')
    yield* fs.writeFileString(feedback, 'target-owned Gate evidence\n')
    yield* fs.writeFileString(join(target, '.prelude/config.jsonc'), `// packed Effect Harness Gate\n{ "schemaVersion": 2, "integrations": [{ "id": ${encodeJson(integrationId)}, "module": "@sayoriqwq/effect-harness/prelude", "packageRoots": ${encodeJson(packageRoots)} }] }\n`)
    if (prepareOnly)
      return

    yield* installTarget(target)
    const cli = join(target, 'node_modules/.bin/prelude')
    const cliRun = (args: ReadonlyArray<string>, cwd = target, reject = true) => runProcess(cli, args, { cwd, reject, env: { CI: '1' }, timeout: '120 seconds' })
    const initialResult = yield* cliRun(['plan', '--json'])
    const nestedResult = yield* cliRun(['plan', '--json'], packageRoots.at(-1) === '.' ? target : join(target, packageRoots.at(-1)!))
    assert.equal(initialResult.stdout, nestedResult.stdout, `${name}: nested plan must discover the same Control Root`)
    const initial = parseJson(initialResult.stdout)
    assert.equal(initial.schemaVersion, 2)
    assert.equal(initial.executionHashVersion, 2)
    assert.equal(initial.blocked, false)
    assert.equal(initial.converged, false)
    assert.deepEqual(initial.integrations[0].packageRoots, [...packageRoots].sort())
    assert.equal(initial.outputs.filter((output: Json) => output.declaration.kind === 'ManagedTree').length, 1)
    assert.equal(initial.outputs.filter((output: Json) => output.declaration.kind === 'PinnedReferenceTree').length, 2)
    assert.equal(initial.outputs.filter((output: Json) => output.declaration.kind === 'JsonKeyedItem').length, packageRoots.length)
    assert.equal(initial.requirements.length, packageRoots.length * 9)
    assert.equal(initial.requirements.every((requirement: Json) => requirement.satisfied === true), true)
    assert.equal(initial.checks.length, packageRoots.length * 3)
    assert.equal(initial.outputs.every((output: Json) => output.owner.integrationId === integrationId), true)
    const pins = initial.outputs.filter((output: Json) => output.declaration.kind === 'PinnedReferenceTree')
    assert.deepEqual(pins.map((output: Json) => output.declaration.provenance.treeDigest).sort(), [EFFECT_DIGEST, TSGO_DIGEST].sort())
    for (const output of pins) assert.deepEqual(Object.keys(output.declaration.provenance).sort(), ['revision', 'sourceUrl', 'treeDigest'])
    assert.equal(initialResult.stdout.includes('closure'), false)
    assert.equal(initialResult.stdout.includes('nestedPins'), false)

    yield* fs.writeFileString(join(target, 'eslint.config.mjs'), 'export default []\n')
    const stale = yield* cliRun(['apply', '--plan-hash', initial.executionHash, '--json'], target, false)
    assert.notEqual(stale.exitCode, 0)
    assert.match(stale.stderr, /Approved execution hash does not match/)
    yield* assertAbsent(join(target, workspace, 'managed'))
    assert.equal(yield* fs.readFileString(feedback), 'target-owned Gate evidence\n')
    yield* fs.writeFileString(join(target, 'eslint.config.mjs'), eslintConfig)

    const approved = parseJson((yield* cliRun(['plan', '--json'])).stdout)
    const applied = parseJson((yield* cliRun(['apply', '--plan-hash', approved.executionHash, '--json'])).stdout)
    assert.equal(applied.converged, true)
    assert.equal(applied.remaining, 0)
    assert.equal(applied.installed, false)
    const converged = parseJson((yield* cliRun(['plan', '--json'])).stdout)
    assert.equal(converged.converged, true)
    assert.equal(converged.outputs.every((output: Json) => output.status === 'converged'), true)
    assert.equal(yield* fs.readFileString(feedback), 'target-owned Gate evidence\n')
    assert.deepEqual((yield* fs.readDirectory(join(target, workspace))).sort(), ['feedback', 'managed', 'repos'])
    for (const packageRoot of packageRoots) {
      const tsconfig = parseJson(yield* fs.readFileString(join(target, packageRoot === '.' ? '' : packageRoot, 'tsconfig.json')))
      assert.equal(tsconfig.compilerOptions.plugins.some((plugin: Json) => plugin.name === '@effect/language-service'), true)
    }
    const checked = parseJson((yield* cliRun(['check', '--json'])).stdout)
    assert.equal(checked.checks.length, packageRoots.length * 3)
    assert.equal(checked.checks.every((check: Json) => check.exitCode === 0), true)

    const tsgoReference = join(target, workspace, 'repos/tsgo')
    const gitmodules = yield* fs.readFileString(join(tsgoReference, '.gitmodules'))
    yield* fs.makeDirectory(join(tsgoReference, 'typescript-go'))
    yield* fs.writeFileString(join(tsgoReference, 'typescript-go/target-invention'), 'must be removed\n')
    yield* fs.writeFileString(join(tsgoReference, '.gitmodules'), 'target drift\n')
    const drift = parseJson((yield* cliRun(['plan', '--json'])).stdout)
    const drifted = drift.outputs.find((output: Json) => output.declaration.id === 'effect.reference.tsgo')
    assert.equal(drifted.status, 'change')
    assert.match(drifted.evidence.join(' '), /reference drift/)
    const repaired = parseJson((yield* cliRun(['apply', '--plan-hash', drift.executionHash, '--json'])).stdout)
    assert.equal(repaired.converged, true)
    assert.equal(yield* fs.readFileString(join(tsgoReference, '.gitmodules')), gitmodules)
    yield* assertAbsent(join(tsgoReference, 'typescript-go'))
    assert.equal(yield* fs.readFileString(feedback), 'target-owned Gate evidence\n')
    yield* assertAbsent(join(target, workspace, 'receipt'))
    yield* assertAbsent(join(target, workspace, 'manifest'))
    yield* assertAbsent(join(target, workspace, 'dispatcher'))
    const finalCheck = parseJson((yield* cliRun(['check', '--json'])).stdout)
    assert.equal(finalCheck.checks.every((check: Json) => check.exitCode === 0), true)
    yield* Console.log(`packed Effect ${name} Gate passed: ${finalCheck.plan.executionHash}`)
  })

  yield* Effect.forEach([harnessTar, contractTar, cliTar], path => fs.exists(path).pipe(
    Effect.filterOrFail(exists => exists, () => new AcceptanceError({ message: `Missing packed Gate input: ${path}` })),
  ), { discard: true })
  yield* runGate('single', ['.'], 'effect/single')
  yield* runGate('monorepo', ['packages/web', 'packages/core'], 'effect/monorepo')
  if (preserveRunRoot)
    yield* Console.error(`preserved packed Effect Gate fixtures: ${runRoot}`)
}))

const main = Effect.scoped(Effect.gen(function* () {
  const services = yield* Layer.build(NodeServices.layer)
  return yield* Effect.provide(program, services)
}))

NodeRuntime.runMain(main)
