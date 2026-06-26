import type { CliArgs } from '@/schema/cli-args'
import { Context, Layer } from 'effect'

export interface CliContextShape {
  readonly args: CliArgs
  readonly isInteractive: boolean
}

export const CliContext = Context.Service<CliContextShape>('CliContext')

export function CliContextLive(context: CliContextShape) {
  return Layer.succeed(CliContext, context)
}
