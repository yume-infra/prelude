import { strict as assert } from 'node:assert'
import process from 'node:process'

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

const targetToolchainDevDependencies = {
  '@effect/vitest': '4.0.0-beta.97',
  '@effect/tsgo': '0.19.0',
  '@typescript/native': 'npm:typescript@7.0.2',
  'eslint': '^10.3.0',
  '@antfu/eslint-config': '^9.0.0',
  'vitest': '^4.1.8',
  'typescript': 'npm:@typescript/typescript6@6.0.2',
}

function targetScripts(name: 'single' | 'monorepo') {
  return {
    prepare: 'node activate-effect-tsgo.mjs',
    typecheck: name === 'single'
      ? 'node node_modules/@typescript/native/bin/tsc --noEmit --project tsconfig.json'
      : 'pnpm --recursive --filter "./packages/**" typecheck',
    lint: name === 'single' ? 'eslint src' : 'eslint packages/*/src',
    verify: 'pnpm typecheck && pnpm lint',
  }
}

const packageScripts = {
  typecheck: 'node ../../node_modules/@typescript/native/bin/tsc --noEmit --project tsconfig.json',
}

const eslintConfig = `import antfu from '@antfu/eslint-config'\nimport effectHarness from '@sayoriqwq/effect-harness/eslint'\n\nexport default antfu().append(...effectHarness)\n`
const source = `import { Effect } from 'effect'\n\nexport const program = Effect.succeed('gate')\n`
const suppressionDirective = ['@effect', 'diagnostics-next-line floatingEffect:off'].join('-')
const approvedSuppressionSource = `import { Effect } from 'effect'\n\nexport function approvedExistingException(): void {\n  // Existing Target exception: upstream callback intentionally discards this Effect.\n  // ${suppressionDirective}\n  Effect.succeed('approved existing exception')\n}\n`
const unsuppressedDiagnosticSource = `import { Effect } from 'effect'\n\nexport function unsuppressedDiagnostic(): void {\n  Effect.succeed('must fail the real Target typecheck')\n}\n`
const activationScript = `import { spawnSync } from 'node:child_process'\nimport { existsSync, readFileSync, writeFileSync } from 'node:fs'\n\nconst counter = '.effect-tsgo-activation-count'\nconst count = existsSync(counter) ? Number(readFileSync(counter, 'utf8')) : 0\nwriteFileSync(counter, String(count + 1))\nconst result = spawnSync(process.execPath, ['node_modules/@effect/tsgo/dist/effect-tsgo.js', 'patch', '--typescript-package', '@typescript/native'], { stdio: 'inherit' })\nif (result.status !== 0) process.exit(result.status ?? 1)\n`

function targetRootManifest(name: 'single' | 'monorepo', cliTar: string, harnessTar: string): Json {
  return {
    name: `effect-gate-${name}`,
    private: true,
    type: 'module',
    scripts: {},
    dependencies: name === 'single' ? selectedDependencies : undefined,
    devDependencies: {
      '@sayoriqwq/prelude': `file:${cliTar}`,
      '@sayoriqwq/effect-harness': `file:${harnessTar}`,
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
  yield* fs.makeDirectory(fixtureRoot, { recursive: true })
  const runRoot = requestedRunRoot ?? (yield* (preserveRunRoot
    ? fs.makeTempDirectory({ directory: fixtureRoot, prefix: 'packed-effect-gate-' })
    : fs.makeTempDirectoryScoped({ directory: fixtureRoot, prefix: 'packed-effect-gate-' })))
  yield* fs.makeDirectory(runRoot, { recursive: true })

  const json = (path: string, value: unknown) => fs.writeFileString(path, `${encodeJson(value)}\n`)
  const assertAbsent = (path: string) => fs.exists(path).pipe(Effect.map(exists => assert.equal(exists, false, `${path} must be absent`)))

  const writeSelectedPackage = Effect.fn(function* (root: string, name: string) {
    yield* fs.makeDirectory(join(root, 'src'), { recursive: true })
    yield* json(join(root, 'package.json'), {
      name,
      private: true,
      type: 'module',
      scripts: packageScripts,
      dependencies: selectedDependencies,
      devDependencies: {
        '@effect/vitest': targetToolchainDevDependencies['@effect/vitest'],
        'vitest': targetToolchainDevDependencies.vitest,
      },
    })
    yield* fs.writeFileString(join(root, 'src/index.ts'), source)
    yield* fs.writeFileString(join(root, 'src/approved-exception.ts'), approvedSuppressionSource)
    const isWeb = name.endsWith('-web')
    yield* json(join(root, 'tsconfig.json'), {
      extends: isWeb ? '../../tsconfig.web.json' : '../../tsconfig.core.json',
      compilerOptions: isWeb ? { exactOptionalPropertyTypes: true } : { noUncheckedIndexedAccess: true },
      include: ['src/**/*.ts'],
    })
  })

  const installTarget = (root: string) => runProcess('pnpm', ['install', '--no-frozen-lockfile', '--prefer-offline', '--reporter', 'append-only'], {
    cwd: root,
    env: { CI: '1', INIT_CWD: root, PNPM_PACKAGE_NAME: undefined, npm_command: undefined, npm_config_dir: undefined, npm_config_filter: undefined, npm_config_recursive: undefined, npm_config_workspace_dir: undefined },
    inherit: true,
    timeout: '5 minutes',
  })

  const legacyHarnessRoot = join(runRoot, 'legacy-harness')
  const legacyHarnessPackage = join(legacyHarnessRoot, 'package')
  const legacyHarnessPacks = join(legacyHarnessRoot, 'packs')
  yield* fs.makeDirectory(legacyHarnessPacks, { recursive: true })
  yield* runProcess('tar', ['-xzf', harnessTar, '-C', legacyHarnessRoot])
  const legacyManifest = parseJson(yield* fs.readFileString(join(legacyHarnessPackage, 'package.json')))
  legacyManifest.version = '0.2.0-control-handoff-legacy'
  yield* json(join(legacyHarnessPackage, 'package.json'), legacyManifest)
  const legacyBaselinePath = join(legacyHarnessPackage, 'artifact-assets/effect/managed/data/baseline.json')
  const legacyBaseline = parseJson(yield* fs.readFileString(legacyBaselinePath))
  legacyBaseline.legacyAcceptanceArtifact = true
  yield* json(legacyBaselinePath, legacyBaseline)
  yield* fs.writeFileString(
    join(legacyHarnessPackage, 'artifact-assets/effect/managed/obsolete.txt'),
    'remove on packed Artifact upgrade\n',
  )
  yield* runProcess('pnpm', ['pack', '--pack-destination', legacyHarnessPacks], { cwd: legacyHarnessPackage, timeout: '120 seconds' })
  const legacyHarnessTar = join(
    legacyHarnessPacks,
    (yield* fs.readDirectory(legacyHarnessPacks)).find(entry => entry.endsWith('.tgz'))!,
  )
  assert.equal(yield* fs.exists(legacyHarnessTar), true)

  const proposeTargetAdaptation = Effect.fn(function* (
    target: string,
    name: 'single' | 'monorepo',
    packageRoots: ReadonlyArray<string>,
    managedData: string,
    feedback: string,
  ) {
    const baseline = parseJson(yield* fs.readFileString(join(managedData, 'baseline.json')))
    const policy = parseJson(yield* fs.readFileString(join(managedData, 'tsgo-policy.json')))
    assert.deepEqual(baseline.typescriptTopology, {
      primaryCompiler: 'nativeTypescript',
      effectSemanticAuthority: 'tsgo',
      compilerApiCompatibility: 'typescript',
    })
    assert.equal(baseline.packages.nativeTypescript.range, targetToolchainDevDependencies['@typescript/native'])
    assert.equal(baseline.packages.tsgo.range, targetToolchainDevDependencies['@effect/tsgo'])
    assert.equal(baseline.packages.typescript.range, targetToolchainDevDependencies.typescript)
    assert.equal(policy.name, '@effect/language-service')
    assert.equal(policy.diagnosticSeverity.floatingEffect, 'error')
    assert.equal(policy.ignoreEffectErrorsInTscExitCode, false)

    const authoringChoices: Record<string, Json> = {}
    for (const packageRoot of packageRoots) {
      const config = packageRoot === '.' ? 'tsconfig.json' : `${packageRoot}/tsconfig.json`
      authoringChoices[config] = parseJson(yield* fs.readFileString(join(target, config)))
    }
    yield* json(feedback, {
      controlHandoff: {
        observation: { targetKind: name, effectAuthoringPackageRoots: packageRoots, authoringChoices },
        proposal: {
          toolchainRoot: '.',
          activationOwner: '.',
          typescriptTopology: baseline.typescriptTopology,
          policyLanding: 'tsconfig.effect.json',
          projectConfigs: packageRoots.map(root => root === '.' ? 'tsconfig.json' : `${root}/tsconfig.json`),
          editorDecision: 'no supported editor configuration detected',
          verificationCommands: Object.keys(targetScripts(name)).filter(command => command !== 'prepare'),
          suppression: { preserveExisting: ['floatingEffect in src/approved-exception.ts'], add: [] },
        },
        authorization: { status: 'pending' },
        durableEvidence: 'feedback/control-handoff.json',
      },
    })
    return { authoringChoices, baseline, policy }
  })

  const authorizeTargetAdaptation = Effect.fn(function* (feedback: string) {
    const evidence = parseJson(yield* fs.readFileString(feedback))
    evidence.controlHandoff.authorization = { status: 'approved', scope: 'packed acceptance fixture' }
    yield* json(feedback, evidence)
  })

  const mutateTarget = Effect.fn(function* (
    target: string,
    name: 'single' | 'monorepo',
    packageRoots: ReadonlyArray<string>,
    policy: Json,
  ) {
    const manifestPath = join(target, 'package.json')
    const manifest = parseJson(yield* fs.readFileString(manifestPath))
    manifest.scripts = targetScripts(name)
    manifest.devDependencies = { ...manifest.devDependencies, ...targetToolchainDevDependencies }
    yield* json(manifestPath, manifest)
    yield* fs.writeFileString(join(target, 'activate-effect-tsgo.mjs'), activationScript)
    yield* json(join(target, 'tsconfig.effect.json'), {
      compilerOptions: {
        target: 'ES2024',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        plugins: [policy],
      },
    })
    for (const packageRoot of packageRoots) {
      const configPath = join(target, packageRoot === '.' ? '' : packageRoot, 'tsconfig.json')
      const existing = parseJson(yield* fs.readFileString(configPath))
      const policyConfig = packageRoot === '.' ? './tsconfig.effect.json' : '../../tsconfig.effect.json'
      const inherited = existing.extends === undefined
        ? policyConfig
        : [...(Array.isArray(existing.extends) ? existing.extends : [existing.extends]), policyConfig]
      yield* json(configPath, { ...existing, extends: inherited })
    }
    yield* fs.writeFileString(join(target, 'eslint.config.mjs'), eslintConfig)
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
    yield* json(join(target, 'package.json'), targetRootManifest(name, cliTar, legacyHarnessTar))
    yield* fs.writeFileString(join(target, 'pnpm-workspace.yaml'), `packages:\n  - packages/*\ndedupeDirectDeps: false\npackageImportMethod: copy\noverrides:\n  '@sayoriqwq/prelude-contract': 'file:${contractTar}'\n  '@effect/platform-node@4.0.0-beta.97>@effect/platform-node-shared': '4.0.0-beta.97'\ntrustPolicy: no-downgrade\ntrustPolicyExclude:\n  - effect@4.0.0-beta.97\n  - '@effect/platform-node@4.0.0-beta.97'\n  - '@effect/platform-node-shared@4.0.0-beta.97'\n  - '@effect/vitest@4.0.0-beta.97'\n`)
    if (packageRoots.includes('.')) {
      yield* fs.makeDirectory(join(target, 'src'), { recursive: true })
      yield* fs.writeFileString(join(target, 'src/index.ts'), source)
      yield* fs.writeFileString(join(target, 'src/approved-exception.ts'), approvedSuppressionSource)
      yield* json(join(target, 'tsconfig.json'), {
        compilerOptions: { useUnknownInCatchVariables: true },
        include: ['src/**/*.ts'],
      })
    }
    else {
      yield* Effect.forEach(packageRoots, packageRoot => writeSelectedPackage(join(target, packageRoot), `effect-gate-${packageRoot.replaceAll('/', '-')}`), { discard: true })
      yield* json(join(target, 'tsconfig.web.json'), { compilerOptions: { jsx: 'react-jsx' } })
      yield* json(join(target, 'tsconfig.core.json'), { compilerOptions: { noImplicitOverride: true } })
    }
    const workspace = `.prelude/${encodeURIComponent(integrationId)}`
    const feedback = join(target, workspace, 'feedback/evidence.md')
    const controlHandoff = join(target, workspace, 'feedback/control-handoff.json')
    yield* fs.writeFileString(feedback, 'target-owned Gate evidence\n')
    yield* fs.writeFileString(join(target, '.prelude/config.jsonc'), `// packed Effect Harness Gate\n{ "schemaVersion": 2, "integrations": [{ "id": ${encodeJson(integrationId)}, "module": "@sayoriqwq/effect-harness/prelude", "packageRoots": ${encodeJson(packageRoots)} }] }\n`)
    if (prepareOnly)
      return

    yield* installTarget(target)
    yield* assertAbsent(join(target, '.effect-tsgo-activation-count'))
    const bootstrapManifest = parseJson(yield* fs.readFileString(join(target, 'package.json')))
    assert.equal(bootstrapManifest.scripts.prepare, undefined)
    assert.equal(bootstrapManifest.devDependencies['@effect/tsgo'], undefined)
    assert.equal(bootstrapManifest.devDependencies['@typescript/native'], undefined)
    assert.equal(bootstrapManifest.devDependencies.typescript, undefined)
    if (name === 'monorepo') {
      for (const packageRoot of packageRoots) {
        const packageManifest = parseJson(yield* fs.readFileString(join(target, packageRoot, 'package.json')))
        assert.equal(packageManifest.scripts.prepare, undefined)
        assert.equal(packageManifest.devDependencies['@effect/tsgo'], undefined)
        assert.equal(packageManifest.devDependencies['@typescript/native'], undefined)
        assert.equal(packageManifest.devDependencies.typescript, undefined)
        assert.deepEqual(packageManifest.dependencies, selectedDependencies)
      }
    }
    const cli = join(target, 'node_modules/.bin/prelude')
    const cliRun = (args: ReadonlyArray<string>, cwd = target, reject = true) => runProcess(cli, args, { cwd, reject, env: { CI: '1' }, timeout: '120 seconds' })
    const targetRun = (command: string, args: ReadonlyArray<string>, reject = true) => runProcess(command, args, { cwd: target, reject, env: { CI: '1' }, timeout: '120 seconds' })

    const initialResult = yield* cliRun(['plan', '--json'])
    const nestedResult = yield* cliRun(['plan', '--json'], packageRoots.at(-1) === '.' ? target : join(target, packageRoots.at(-1)!))
    assert.equal(initialResult.stdout, nestedResult.stdout, `${name}: nested plan must discover the same Control Root`)
    const initial = parseJson(initialResult.stdout)
    assert.equal(initial.schemaVersion, 2)
    assert.equal(initial.executionHashVersion, 2)
    assert.equal(initial.blocked, false)
    assert.equal(initial.converged, false)
    assert.deepEqual(initial.integrations[0].packageRoots, [...packageRoots].sort())
    assert.equal(initial.outputs.length, 4)
    assert.equal(initial.outputs.filter((output: Json) => output.declaration.kind === 'ManagedTree').length, 1)
    assert.equal(initial.outputs.filter((output: Json) => output.declaration.kind === 'ManagedBlock').length, 1)
    assert.equal(initial.outputs.filter((output: Json) => output.declaration.kind === 'PinnedReferenceTree').length, 2)
    assert.equal(initial.outputs.some((output: Json) => output.declaration.kind === 'JsonKeyedItem' || output.declaration.kind === 'JsonValue'), false)
    assert.deepEqual(initial.requirements, [])
    assert.deepEqual(initial.checks, [])
    assert.deepEqual(initial.issues, [])
    assert.equal(initial.outputs.every((output: Json) => output.owner.integrationId === integrationId), true)
    const pins = initial.outputs.filter((output: Json) => output.declaration.kind === 'PinnedReferenceTree')
    assert.deepEqual(pins.map((output: Json) => output.declaration.provenance.treeDigest).sort(), [EFFECT_DIGEST, TSGO_DIGEST].sort())
    for (const output of pins) assert.deepEqual(Object.keys(output.declaration.provenance).sort(), ['revision', 'sourceUrl', 'treeDigest'])
    assert.equal(initialResult.stdout.includes('closure'), false)
    assert.equal(initialResult.stdout.includes('nestedPins'), false)

    yield* fs.writeFileString(join(target, 'AGENTS.md'), 'Target routing changed after approval.\n')
    const stale = yield* cliRun(['apply', '--plan-hash', initial.executionHash, '--json'], target, false)
    assert.notEqual(stale.exitCode, 0)
    assert.match(stale.stderr, /Approved execution hash does not match/)
    yield* assertAbsent(join(target, workspace, 'managed'))
    assert.equal(yield* fs.readFileString(feedback), 'target-owned Gate evidence\n')

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
    assert.equal(yield* fs.readFileString(join(target, workspace, 'managed/obsolete.txt')), 'remove on packed Artifact upgrade\n')
    assert.equal(parseJson(yield* fs.readFileString(join(target, workspace, 'managed/data/baseline.json'))).legacyAcceptanceArtifact, true)

    const upgradeManifest = parseJson(yield* fs.readFileString(join(target, 'package.json')))
    upgradeManifest.devDependencies['@sayoriqwq/effect-harness'] = `file:${harnessTar}`
    yield* json(join(target, 'package.json'), upgradeManifest)
    yield* installTarget(target)
    const upgradePlan = parseJson((yield* cliRun(['plan', '--json'])).stdout)
    assert.equal(upgradePlan.converged, false)
    const upgraded = parseJson((yield* cliRun(['apply', '--plan-hash', upgradePlan.executionHash, '--json'])).stdout)
    assert.equal(upgraded.converged, true)
    assert.equal(yield* fs.readFileString(feedback), 'target-owned Gate evidence\n')
    yield* assertAbsent(join(target, workspace, 'managed/obsolete.txt'))
    assert.equal(parseJson(yield* fs.readFileString(join(target, workspace, 'managed/data/baseline.json'))).legacyAcceptanceArtifact, undefined)

    const diagnosticRoot = packageRoots[0] === '.' ? target : join(target, packageRoots[0]!)
    const approvedException = join(diagnosticRoot, 'src/approved-exception.ts')
    const approvedExceptionBytes = yield* fs.readFileString(approvedException)
    const adaptation = yield* proposeTargetAdaptation(
      target,
      name,
      packageRoots,
      join(target, workspace, 'managed/data'),
      controlHandoff,
    )
    assert.equal((parseJson(yield* fs.readFileString(controlHandoff))).controlHandoff.authorization.status, 'pending')
    yield* assertAbsent(join(target, 'tsconfig.effect.json'))
    yield* assertAbsent(join(target, 'eslint.config.mjs'))
    yield* assertAbsent(join(target, 'activate-effect-tsgo.mjs'))
    const proposedManifest = parseJson(yield* fs.readFileString(join(target, 'package.json')))
    assert.equal(proposedManifest.scripts.prepare, undefined)
    assert.equal(proposedManifest.devDependencies['@effect/tsgo'], undefined)
    assert.equal(proposedManifest.devDependencies['@typescript/native'], undefined)
    assert.equal(proposedManifest.devDependencies.typescript, undefined)

    yield* authorizeTargetAdaptation(controlHandoff)
    assert.equal((parseJson(yield* fs.readFileString(controlHandoff))).controlHandoff.authorization.status, 'approved')
    yield* mutateTarget(target, name, packageRoots, adaptation.policy)
    yield* installTarget(target)
    assert.equal(yield* fs.readFileString(join(target, '.effect-tsgo-activation-count')), '1')
    const rootManifest = parseJson(yield* fs.readFileString(join(target, 'package.json')))
    assert.equal(rootManifest.scripts.prepare, 'node activate-effect-tsgo.mjs')
    assert.equal(rootManifest.devDependencies['@effect/tsgo'], '0.19.0')
    assert.equal(rootManifest.devDependencies['@typescript/native'], 'npm:typescript@7.0.2')
    assert.equal(rootManifest.devDependencies.typescript, 'npm:@typescript/typescript6@6.0.2')
    if (name === 'monorepo') {
      for (const packageRoot of packageRoots) {
        const packageManifest = parseJson(yield* fs.readFileString(join(target, packageRoot, 'package.json')))
        assert.equal(packageManifest.scripts.prepare, undefined)
        assert.equal(packageManifest.devDependencies['@effect/tsgo'], undefined)
        assert.equal(packageManifest.devDependencies['@typescript/native'], undefined)
        assert.equal(packageManifest.devDependencies.typescript, undefined)
        assert.deepEqual(packageManifest.dependencies, selectedDependencies)
      }
    }
    const controlHandoffBytes = yield* fs.readFileString(controlHandoff)
    const adaptedConfigs = new Map<string, string>()
    for (const config of ['tsconfig.effect.json', ...packageRoots.map(root => root === '.' ? 'tsconfig.json' : `${root}/tsconfig.json`)])
      adaptedConfigs.set(config, yield* fs.readFileString(join(target, config)))
    for (const [config, original] of Object.entries(adaptation.authoringChoices)) {
      const adapted = parseJson(yield* fs.readFileString(join(target, config)))
      assert.deepEqual(adapted.compilerOptions, original.compilerOptions)
      assert.deepEqual(adapted.include, original.include)
      if (original.extends !== undefined) {
        assert.equal(Array.isArray(adapted.extends), true)
        assert.equal(adapted.extends[0], original.extends)
      }
    }
    const afterHandoff = parseJson((yield* cliRun(['plan', '--json'])).stdout)
    assert.equal(afterHandoff.converged, true)
    assert.equal(afterHandoff.outputs.length, 4)
    assert.deepEqual(afterHandoff.requirements, [])
    assert.deepEqual(afterHandoff.checks, [])
    assert.deepEqual(afterHandoff.issues, [])
    assert.equal(yield* fs.readFileString(approvedException), approvedExceptionBytes)

    const nativeIdentity = parseJson(yield* fs.readFileString(join(target, 'node_modules/@typescript/native/package.json')))
    const ts6Identity = parseJson(yield* fs.readFileString(join(target, 'node_modules/typescript/package.json')))
    const tsgoIdentity = parseJson(yield* fs.readFileString(join(target, 'node_modules/@effect/tsgo/package.json')))
    assert.deepEqual({ name: nativeIdentity.name, version: nativeIdentity.version }, { name: 'typescript', version: '7.0.2' })
    assert.deepEqual({ name: ts6Identity.name, version: ts6Identity.version, bin: ts6Identity.bin }, { name: '@typescript/typescript6', version: '6.0.2', bin: { tsc6: './bin/tsc6' } })
    assert.deepEqual({ name: tsgoIdentity.name, version: tsgoIdentity.version }, { name: '@effect/tsgo', version: '0.19.0' })
    const nativeVersion = yield* targetRun(process.execPath, ['node_modules/@typescript/native/bin/tsc', '--version'])
    assert.equal(nativeVersion.stdout.trim(), 'Version 7.0.2+effect-tsgo.0.19.0')
    const ts6Version = yield* targetRun(process.execPath, ['node_modules/typescript/bin/tsc6', '--version'])
    assert.match(ts6Version.stdout.trim(), /^Version 6\./u)

    assert.equal((yield* targetRun('pnpm', ['typecheck'])).exitCode, 0)
    const diagnosticProbe = join(diagnosticRoot, 'src/diagnostic-probe.ts')
    yield* fs.writeFileString(diagnosticProbe, unsuppressedDiagnosticSource)
    const failedTypecheck = yield* targetRun('pnpm', ['typecheck'], false)
    assert.notEqual(failedTypecheck.exitCode, 0)
    assert.match(`${failedTypecheck.stdout}\n${failedTypecheck.stderr}`, /error TS377001: This Effect value is neither yielded nor used in an assignment\. effect\(floatingEffect\)/u)
    yield* fs.remove(diagnosticProbe, { force: true })
    assert.equal((yield* targetRun('pnpm', ['typecheck'])).exitCode, 0)
    assert.equal(yield* fs.readFileString(approvedException), approvedExceptionBytes)
    assert.equal(adaptation.policy.diagnosticSeverity.floatingEffect, 'error')

    const lintProbe = join(diagnosticRoot, 'src/reference-import-probe.ts')
    yield* fs.writeFileString(lintProbe, `import effectSource from 'repos/effect/private'\nimport tsgoSource from '../repos/tsgo/private'\n\nexport { effectSource, tsgoSource }\n`)
    const failedLint = yield* targetRun('pnpm', ['lint'], false)
    assert.notEqual(failedLint.exitCode, 0)
    assert.match(`${failedLint.stdout}\n${failedLint.stderr}`, /never pinned Effect reference trees/u)
    assert.match(`${failedLint.stdout}\n${failedLint.stderr}`, /never its pinned reference tree/u)
    yield* fs.remove(lintProbe, { force: true })
    assert.equal((yield* targetRun('pnpm', ['lint'])).exitCode, 0)

    assert.deepEqual(
      parseJson(yield* fs.readFileString(join(target, workspace, 'managed/data/baseline.json'))),
      adaptation.baseline,
    )
    for (const [config, bytes] of adaptedConfigs)
      assert.equal(yield* fs.readFileString(join(target, config)), bytes)
    assert.deepEqual(parseJson(yield* fs.readFileString(join(target, 'tsconfig.effect.json'))).compilerOptions.plugins, [adaptation.policy])
    assert.equal(yield* fs.readFileString(join(target, '.effect-tsgo-activation-count')), '1')
    assert.equal((parseJson(controlHandoffBytes)).controlHandoff.authorization.status, 'approved')
    const checked = parseJson((yield* cliRun(['check', '--json'])).stdout)
    assert.deepEqual(checked.checks, [])

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
    assert.equal(yield* fs.readFileString(controlHandoff), controlHandoffBytes)
    for (const [config, bytes] of adaptedConfigs)
      assert.equal(yield* fs.readFileString(join(target, config)), bytes)
    assert.equal(yield* fs.readFileString(join(target, '.effect-tsgo-activation-count')), '1')
    yield* assertAbsent(join(target, workspace, 'receipt'))
    yield* assertAbsent(join(target, workspace, 'manifest'))
    yield* assertAbsent(join(target, workspace, 'dispatcher'))
    assert.equal((yield* targetRun('pnpm', ['verify'])).exitCode, 0)
    const finalCheck = parseJson((yield* cliRun(['check', '--json'])).stdout)
    assert.deepEqual(finalCheck.checks, [])
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
