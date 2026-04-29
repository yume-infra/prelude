import type {
  ContributionTraceSpec,
  PlanOperationSpec,
  PlanSpec,
  PlanTaskSpec,
  PostGenerateCommandSpec,
  PostGenerateFileActionSpec,
} from '@/schema/plan-spec'

function formatOwnership(ownership?: ContributionTraceSpec) {
  if (!ownership)
    return ''

  return ` (owner: ${ownership.owner}, unit: ${ownership.unit})`
}

function formatArgs(args: readonly string[]) {
  return args.length > 0 ? ` ${args.join(' ')}` : ''
}

function formatOperation(operation: PlanOperationSpec, label: string) {
  return `  - ${label}: ${operation.reducer}${formatOwnership(operation.ownership)}`
}

function formatTaskOperations(task: PlanTaskSpec) {
  if (task.kind === 'json') {
    return [
      ...task.reducers.map(reducer => formatOperation(reducer, 'reducer')),
      ...(task.finalize ? [formatOperation(task.finalize, 'finalize')] : []),
    ]
  }

  if (task.kind === 'text') {
    return task.transforms.map(transform => formatOperation(transform, 'transform'))
  }

  return []
}

function formatTask(task: PlanTaskSpec) {
  const lines = [`- ${task.kind} ${task.path}${formatOwnership(task.ownership)}`]
  lines.push(...formatTaskOperations(task))
  return lines
}

function formatCommand(command: PostGenerateCommandSpec) {
  return `- ${command.phase}: ${command.command}${formatArgs(command.args)}${formatOwnership(command.ownership)}`
}

function formatFileAction(action: PostGenerateFileActionSpec) {
  const executable = action.executable ?? false
  return `- ${action.phase}: ${action.kind} ${action.path} (executable: ${executable})${formatOwnership(action.ownership)}`
}

export function formatDryRunPreview(planSpec: PlanSpec) {
  const lines = [
    'Dry run preview',
    'No files or directories will be written, and no commands will be executed.',
    'Post-generate command internal file effects are not fully shown.',
    '',
    'Planned files:',
  ]

  if (planSpec.tasks.length === 0) {
    lines.push('- (none)')
  }
  else {
    for (const task of planSpec.tasks) {
      lines.push(...formatTask(task))
    }
  }

  lines.push('', 'Post-generate commands:')

  const commands = planSpec.postGenerateCommands ?? []
  if (commands.length === 0) {
    lines.push('- (none)')
  }
  else {
    lines.push(...commands.map(formatCommand))
  }

  lines.push('', 'Post-generate file actions:')

  const fileActions = planSpec.postGenerateFileActions ?? []
  if (fileActions.length === 0) {
    lines.push('- (none)')
  }
  else {
    lines.push(...fileActions.map(formatFileAction))
  }

  return `${lines.join('\n')}\n`
}
