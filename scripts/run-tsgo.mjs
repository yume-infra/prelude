import { spawnSync } from 'node:child_process'
import { chmodSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import process from 'node:process'

const require = createRequire(import.meta.url)
const packageRoot = dirname(require.resolve('@effect/tsgo/package.json'))
const runner = join(packageRoot, 'dist/effect-tsgo.js')
const expectedVersion = 'Version 7.0.2+effect-tsgo.0.19.0'
const fail = status => {
  process.exit(status && status > 0 ? status : 1)
}

const resolve = spawnSync(process.execPath, [runner, 'get-exe-path'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})
const resolvedPath = (resolve.stdout ?? '').trim()
if (resolve.status !== 0 || resolvedPath === '') {
  process.stderr.write(resolve.stderr || 'effect-tsgo did not return a TypeScript-Go executable path\n')
  fail(resolve.status)
}

const executable = resolvedPath
chmodSync(executable, 0o755)
const version = spawnSync(executable, ['--version'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})
const versionOutput = (version.stdout ?? '').trim()
const versionError = (version.stderr ?? '').trim()
if (version.status !== 0 || versionOutput !== expectedVersion) {
  process.stderr.write(`Expected ${expectedVersion}, got ${versionOutput || versionError}\n`)
  fail(version.status)
}

const result = spawnSync(executable, process.argv.slice(2), { stdio: 'inherit' })
if (result.status !== 0) {
  fail(result.status)
}
