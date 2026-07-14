import type { ChildProcessSpawner } from 'effect/unstable/process'
import { Data, Effect, Stream } from 'effect'
import { ChildProcess } from 'effect/unstable/process'

export interface ProcessResult {
  readonly exitCode: number
  readonly stderr: string
  readonly stdout: string
}

export interface RunProcessOptions {
  readonly cwd?: string
  readonly env?: Readonly<Record<string, string | undefined>>
  readonly inherit?: boolean
  readonly reject?: boolean
  readonly timeout?: `${number} ${'second' | 'seconds' | 'minute' | 'minutes'}`
}

export class AcceptanceProcessError extends Data.TaggedError('@sayoriqwq/prelude/tests/acceptance/process/AcceptanceProcessError')<{
  readonly message: string
}> {}

export function runProcess(
  command: string,
  args: ReadonlyArray<string>,
  options: RunProcessOptions = {},
): Effect.Effect<ProcessResult, Error, ChildProcessSpawner.ChildProcessSpawner> {
  const run = Effect.scoped(Effect.gen(function* () {
    const child = yield* ChildProcess.make(command, args, {
      cwd: options.cwd,
      env: options.env === undefined ? undefined : { ...options.env },
      extendEnv: true,
      stdin: options.inherit === true ? 'inherit' : 'ignore',
      stdout: options.inherit === true ? 'inherit' : 'pipe',
      stderr: options.inherit === true ? 'inherit' : 'pipe',
    })
    const [stdout, stderr, exitCode] = options.inherit === true
      ? ['', '', yield* child.exitCode]
      : yield* Effect.all([
        Stream.mkString(Stream.decodeText(child.stdout)),
        Stream.mkString(Stream.decodeText(child.stderr)),
        child.exitCode,
      ], { concurrency: 'unbounded' })
    const result = { exitCode, stderr, stdout }
    if (exitCode !== 0 && options.reject !== false) {
      return yield* new AcceptanceProcessError({
        message: `${command} ${args.join(' ')} exited with status ${exitCode}\n${stderr}`,
      })
    }
    return result
  }))
  return options.timeout === undefined ? run : run.pipe(Effect.timeout(options.timeout))
}
