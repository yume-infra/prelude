import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { NodeRuntime, NodeServices } from '@effect/platform-node'
import { Data, Effect, FileSystem, Layer } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'

const expectedVersion = 'Version 7.0.2+effect-tsgo.0.19.0'

class TsgoRunnerError extends Data.TaggedError('prelude-workspace/tooling/run-tsgo/TsgoRunnerError')<{
  readonly message: string
}> {}

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  const processes = yield* ChildProcessSpawner.ChildProcessSpawner
  const packageJson = import.meta.resolve('@effect/tsgo/package.json')
  const runner = fileURLToPath(new URL('./dist/effect-tsgo.js', packageJson))
  const executable = (yield* processes.string(
    ChildProcess.make(process.execPath, [runner, 'get-exe-path']),
  )).trim()

  if (executable === '')
    return yield* new TsgoRunnerError({ message: 'effect-tsgo did not return a TypeScript-Go executable path' })

  yield* fs.chmod(executable, 0o755)
  const versionOutput = (yield* processes.string(ChildProcess.make(executable, ['--version']))).trim()
  if (versionOutput !== expectedVersion)
    return yield* new TsgoRunnerError({ message: `Expected ${expectedVersion}, got ${versionOutput}` })

  const exitCode = yield* processes.exitCode(ChildProcess.make(
    executable,
    process.argv.slice(2),
    { stdin: 'inherit', stdout: 'inherit', stderr: 'inherit' },
  ))
  if (exitCode !== 0)
    return yield* new TsgoRunnerError({ message: `TypeScript-Go exited with status ${exitCode}` })
})

const main = Effect.scoped(Effect.gen(function* () {
  const services = yield* Layer.build(NodeServices.layer)
  return yield* Effect.provide(program, services)
}))

NodeRuntime.runMain(main)
