import type { ProjectName } from '@/brand/project-name'
import { Context } from 'effect'

export interface CliArgs {
  readonly spec?: string
  readonly name?: ProjectName
  readonly preset?: string
  readonly install?: boolean
  readonly git?: boolean
  readonly rollback?: boolean
  readonly yes?: boolean
  readonly noInput?: boolean
  readonly dryRun?: boolean
  readonly printSpec?: boolean
}

export interface CliContextShape {
  readonly args: CliArgs
  readonly isInteractive: boolean
}

export class CliContext extends Context.Service<CliContext, CliContextShape>()('@sayoriqwq/prelude/core/cli-context/CliContext') {}
