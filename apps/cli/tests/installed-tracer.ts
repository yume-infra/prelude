/* eslint-disable style/max-statements-per-line */
import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import { execa } from 'execa'

const cliRoot = join(import.meta.dirname, '..')
const workspaceRoot = join(cliRoot, '../..')
const temp = await mkdtemp(join(tmpdir(), 'prelude-installed-'))
const packs = join(temp, 'packs')
const target = join(temp, 'target')

async function json(path: string, value: unknown) { await writeFile(path, `${JSON.stringify(value, null, 2)}\n`) }
async function run(args: ReadonlyArray<string>, options: { reject?: boolean } = {}) { return execa('pnpm', args, { cwd: target, reject: options.reject ?? true, env: { ...process.env, CI: '1' } }) }

try {
  await mkdir(packs); await mkdir(target)
  await execa('pnpm', ['--filter', '@sayoriqwq/prelude-contract', 'pack', '--pack-destination', packs], { cwd: workspaceRoot })
  await execa('pnpm', ['--filter', '@sayoriqwq/prelude', 'pack', '--pack-destination', packs], { cwd: workspaceRoot })
  const names = await readdir(packs); const contractTar = join(packs, names.find(name => name.includes('prelude-contract'))!); const cliTar = join(packs, names.find(name => /^sayoriqwq-prelude-\d/.test(name))!)
  const harnesses: Array<string> = []
  for (const [index, name] of ['alpha', 'beta'].entries()) {
    const root = join(temp, name); harnesses.push(root); await mkdir(join(root, 'assets'), { recursive: true })
    await writeFile(join(root, 'assets', `${name}.txt`), `${name} managed\n`)
    await json(join(root, 'package.json'), { name: `@synthetic/${name}`, version: '1.0.0', type: 'module', files: ['assets', 'prelude.js'], exports: { './prelude': index === 0 ? { import: './prelude.js' } : './prelude.js' }, dependencies: { '@sayoriqwq/prelude-contract': `file:${contractTar}`, 'effect': '4.0.0-beta.92' } })
    const packageRoot = index === 0 ? '.' : 'packages/app'
    await writeFile(join(root, 'prelude.js'), `
import { Effect } from 'effect'
export const harnessModule = {
  descriptor: { harnessId: '${name}', protocolVersion: 1, requiredFeatures: ['checks.argv','outputs.json-keyed-item','outputs.json-value','outputs.managed-block','outputs.managed-tree'] },
  plan: context => Effect.gen(function* () {
    const scope = yield* context.target.readText('scope.txt')
    const scopedManifest = yield* context.target.readPackageManifest('.')
    const failureProbe = yield* context.target.readText('enable-failing-check')
    return { outputs: [
    { kind: 'ManagedTree', id: 'tree', sourceRoot: 'assets', targetRoot: 'managed/${name}' },
    { kind: 'ManagedBlock', id: 'agents', path: 'AGENTS.md', blockId: '${name}', content: '# ${name}' },
    ${index === 0 ? `{ kind: 'JsonValue', id: 'compiler', path: 'tsconfig.json', pointer: '/compilerOptions/strict', value: true }, { kind: 'JsonKeyedItem', id: 'plugin', path: 'settings.json', collectionPointer: '/plugins', keyField: 'name', keyValue: '${name}', item: { name: '${name}', enabled: true } },` : ''}
  ], requirements: [], issues: scope === '${name} scope\\n' && scopedManifest?.name === '${index === 0 ? 'synthetic-target' : 'workspace-app'}' ? [] : [{ id: 'scope', summary: 'wrong Target scope' }], checks: [
    { id: 'verify', summary: '${name} files exist', packageRoot: '${packageRoot}', argv: ['node', '-e', "require('node:fs').accessSync('managed/${name}/${name}.txt')"] },
    ...(${index === 0 ? 'failureProbe !== undefined' : 'false'} ? [
      { id: 'a-missing', summary: 'missing executable is aggregated', packageRoot: '${packageRoot}', argv: ['prelude-command-that-does-not-exist'] },
      { id: 'z-after', summary: 'later check still executes', packageRoot: '${packageRoot}', argv: ['node', '-e', "require('node:fs').writeFileSync('check-after-ran', 'yes')"] }
    ] : [])
  ] }
  })
}
`)
    const packed = await execa('npm', ['pack', '--pack-destination', packs], { cwd: root })
    harnesses[index] = join(packs, packed.stdout.trim().split('\n').at(-1)!)
  }
  await json(join(target, 'package.json'), { name: 'synthetic-target', private: true, devDependencies: { '@sayoriqwq/prelude': `file:${cliTar}`, '@synthetic/alpha': `file:${harnesses[0]}`, '@synthetic/beta': `file:${harnesses[1]}` } })
  await writeFile(join(target, 'pnpm-workspace.yaml'), `packages: []\npackageImportMethod: copy\noverrides:\n  '@sayoriqwq/prelude-contract': 'file:${contractTar}'\n  '@effect/platform-node@4.0.0-beta.92>@effect/platform-node-shared': '4.0.0-beta.92'\ntrustPolicy: no-downgrade\ntrustPolicyExclude:\n  - effect@4.0.0-beta.92\n  - '@effect/platform-node@4.0.0-beta.92'\n  - '@effect/platform-node-shared@4.0.0-beta.92'\n`)
  await writeFile(join(target, 'prelude.config.jsonc'), `// installed two-Harness tracer\n{ "schemaVersion": 1, "integrations": [\n  { "id": "beta", "module": "@synthetic/beta/prelude", "packageRoot": "packages/app" },\n  { "id": "alpha", "module": "@synthetic/alpha/prelude", "packageRoot": "." },\n], }\n`)
  await mkdir(join(target, 'packages/app'), { recursive: true })
  await json(join(target, 'packages/app/package.json'), { name: 'workspace-app', private: true })
  await writeFile(join(target, 'scope.txt'), 'alpha scope\n')
  await writeFile(join(target, 'packages/app/scope.txt'), 'beta scope\n')
  await writeFile(join(target, 'tsconfig.json'), '{ "compilerOptions": {} }\n'); await writeFile(join(target, 'settings.json'), '{ "plugins": [] }\n')
  await run(['install'])
  for (const skill of ['prelude-bootstrap', 'prelude-repair', 'prelude-upgrade']) {
    const source = await readFile(join(target, 'node_modules/@sayoriqwq/prelude/skills', skill, 'SKILL.md'), 'utf8')
    assert.match(source, new RegExp(`^---\\nname: ${skill}\\ndescription: .+\\n---\\n`, 's'))
  }
  const cli = join(target, 'node_modules/.bin/prelude')
  const first = await execa(cli, ['plan', '--json'], { cwd: target }); const second = await execa(cli, ['plan', '--json'], { cwd: target })
  assert.equal(first.stdout, second.stdout, 'plan JSON must be byte-stable')
  const plan = JSON.parse(first.stdout); assert.equal(plan.integrations.length, 2); assert.equal(plan.outputs.length, 6); assert.equal(plan.blocked, false)
  const stale = await execa(cli, ['apply', '--plan-hash', '0'.repeat(64)], { cwd: target, reject: false }); assert.notEqual(stale.exitCode, 0); assert.equal(await readdir(target).then(entries => entries.includes('.prelude')), false)
  await execa(cli, ['apply', '--plan-hash', plan.executionHash, '--json'], { cwd: target })
  const converged = JSON.parse((await execa(cli, ['plan', '--json'], { cwd: target })).stdout); assert.equal(converged.outputs.every((output: { status: string }) => output.status === 'converged'), true)
  const checked = JSON.parse((await execa(cli, ['check', '--json'], { cwd: target })).stdout); assert.equal(checked.checks.length, 2)
  await writeFile(join(target, 'enable-failing-check'), 'enabled')
  const failedCheck = await execa(cli, ['check', '--json'], { cwd: target, reject: false })
  assert.notEqual(failedCheck.exitCode, 0)
  assert.equal(await readFile(join(target, 'check-after-ran'), 'utf8'), 'yes')
  assert.match(failedCheck.stderr, /a-missing/)
  assert.match(failedCheck.stderr, /z-after/)
  assert.match(failedCheck.stderr, /finalPlanHash/)
  assert.match(await readFile(join(target, 'AGENTS.md'), 'utf8'), /# alpha/); assert.match(await readFile(join(target, 'packages/app/AGENTS.md'), 'utf8'), /# beta/); assert.equal(JSON.parse(await readFile(join(target, 'tsconfig.json'), 'utf8')).compilerOptions.strict, true)
  assert.equal((await readdir(target)).some(name => name === '.prelude' || /manifest|receipt|journal|snapshot/.test(name)), false)
  console.log(`installed tracer passed: ${plan.executionHash}`)
}
finally { await rm(temp, { recursive: true, force: true }) }
