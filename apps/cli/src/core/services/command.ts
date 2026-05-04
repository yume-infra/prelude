import type { StandardCommand } from '@effect/platform/Command'
import type { CommandName } from '@/brand/command-name'
// 借助平台能力，但转化为领域错误
import { Command } from '@effect/platform'
import { CommandExecutor } from '@effect/platform/CommandExecutor'
import { Effect, Option } from 'effect'
import { CommandError } from '@/core/errors'

interface CommandServiceShape {
  readonly make: (cmd: CommandName, ...args: string[]) => StandardCommand
  readonly execute: (command: StandardCommand) => Effect.Effect<string, CommandError>
}

type CommandOutputDiagnostics = Pick<CommandError, 'stdout' | 'stderr' | 'output'>

function asStringRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null)
    return undefined

  return value as Record<string, unknown>
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function extractCommandOutputDiagnostics(error: unknown): CommandOutputDiagnostics {
  const record = asStringRecord(error)
  if (!record)
    return {}

  const stdout = stringField(record, 'stdout')
  const stderr = stringField(record, 'stderr')
  const output = stringField(record, 'output')

  return {
    ...(stdout !== undefined ? { stdout } : {}),
    ...(stderr !== undefined ? { stderr } : {}),
    ...(output !== undefined ? { output } : {}),
  }
}

export class CommandService extends Effect.Service<CommandService>()('CommandService', {
  effect: Effect.gen(function* () {
    const executor = yield* CommandExecutor
    const make: CommandServiceShape['make'] = (cmd, ...args) => {
      const command = Command.make(cmd, ...args)
      // 只有使用 Command.pipeTo 或者 command.pipe 才会导致类型发生变动，暂时没有这种需求
      return command as StandardCommand
    }

    const execute: CommandServiceShape['execute'] = (command) => {
      // 必须把日志与命令执行组合进同一个 Effect，单独调用 Effect.logInfo 不会执行
      return Effect.gen(function* () {
        yield* Effect.logInfo(`Executing command: ${command.command} ${command.args.join(' ')}`)

        const output = yield* Command
          .string(command)
          .pipe(
            Effect.provideService(CommandExecutor, executor),
            Effect.mapError(error => new CommandError({
              command: command.command,
              args: [...command.args],
              ...(Option.isSome(command.cwd) ? { cwd: command.cwd.value } : {}),
              ...extractCommandOutputDiagnostics(error),
              cause: error,
            })),
          )

        // 只有在真正得到结果后再输出
        yield* Effect.logDebug(`Command output: ${output}`)
        return output
      }).pipe(
        Effect.withSpan('command.execute'),
        Effect.annotateLogs({
          command: command.command,
          args: command.args.join(' '),
          ...(Option.isSome(command.cwd) ? { cwd: command.cwd.value } : {}),
        }),
        Effect.annotateSpans({
          command: command.command,
          args: command.args.join(' '),
          ...(Option.isSome(command.cwd) ? { cwd: command.cwd.value } : {}),
        }),
      )
    }

    return { make, execute } satisfies CommandServiceShape
  }),
}) {}

export const CommandLive = CommandService.Default
