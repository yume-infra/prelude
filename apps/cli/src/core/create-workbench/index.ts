import type { Buffer } from 'node:buffer'
import type { ProjectName } from '@/brand/project-name'
import type { TargetDir } from '@/brand/target-dir'
import type { CreateSpec } from '@/core/create'
import process from 'node:process'
import { makePackageName } from '@/brand/package-name'

// Production v1 shell. The static throwaway prototype remains under create-workbench-prototype.

interface CreateWorkbenchOptions {
  readonly initialProjectName?: ProjectName
  readonly targetDir?: TargetDir
}

interface CreateWorkbenchSubmitted {
  readonly kind: 'submitted'
  readonly spec: CreateSpec
  readonly targetName: string
}

interface CreateWorkbenchCancelled {
  readonly kind: 'cancelled'
}

interface CreateWorkbenchUnavailable {
  readonly kind: 'unavailable'
  readonly reason: string
}

type CreateWorkbenchResult
  = | CreateWorkbenchSubmitted
    | CreateWorkbenchCancelled
    | CreateWorkbenchUnavailable

interface TerminalState {
  readonly stdin: typeof process.stdin
  readonly stdout: typeof process.stdout
  readonly defaultName: string
  readonly explicitTargetDir: string | undefined
  name: string
  hasEditedName: boolean
  view: 'main' | 'details' | 'export'
  validationMessage: string | undefined
}

const fallbackProjectName = 'my-worker'

const includes = [
  'Workspace with one Node CLI package',
  'TypeScript CLI baseline',
  'ESLint quality checks',
  'Knip project hygiene',
  'pnpm workspace setup',
] as const

const managedSupport = [
  'application source is handed to you after create',
  'Effect harness support is available in the direct Effect starter',
  'workspace maintain support will be enabled by a later slice',
] as const

const nextActions = [
  'pnpm install',
  'pnpm verify',
  'edit apps/tool/src/index.ts',
] as const

export function runCreateWorkbench(options: CreateWorkbenchOptions = {}): Promise<CreateWorkbenchResult> {
  const stdin = process.stdin
  const stdout = process.stdout

  if (!stdin.isTTY) {
    return Promise.resolve({
      kind: 'unavailable',
      reason: 'stdin is not a TTY',
    })
  }

  if (!stdout.isTTY) {
    return Promise.resolve({
      kind: 'unavailable',
      reason: 'stdout is not a TTY',
    })
  }

  if (typeof stdin.setRawMode !== 'function') {
    return Promise.resolve({
      kind: 'unavailable',
      reason: 'raw TTY mode is unavailable',
    })
  }

  const defaultName = String(options.initialProjectName ?? fallbackProjectName)
  const state: TerminalState = {
    stdin,
    stdout,
    defaultName,
    explicitTargetDir: options.targetDir === undefined ? undefined : String(options.targetDir),
    name: defaultName,
    hasEditedName: false,
    view: 'main',
    validationMessage: undefined,
  }

  return new Promise<CreateWorkbenchResult>((resolve) => {
    let finished = false

    function finish(result: CreateWorkbenchResult): void {
      if (finished) {
        return
      }

      finished = true
      cleanup(state, onData, onResize)
      resolve(result)
    }

    function onResize(): void {
      render(state)
    }

    function onData(chunk: Buffer | string): void {
      for (const key of splitInput(String(chunk))) {
        if (key === '\u0003') {
          finish({ kind: 'cancelled' })
          return
        }

        if (key.startsWith('\x1B')) {
          continue
        }

        if (key === '\r' || key === '\n') {
          const projectName = normalizedProjectName(state)
          if (!isProjectNameInput(projectName)) {
            state.validationMessage = 'Project name can only contain letters, numbers, underscores, and hyphens.'
            render(state)
            continue
          }

          finish({
            kind: 'submitted',
            spec: createWorkbenchSpec(projectName),
            targetName: projectName,
          })
          return
        }

        if (key === 'q' && !state.hasEditedName) {
          finish({ kind: 'cancelled' })
          return
        }

        if (key === '\u0010') {
          state.view = state.view === 'details' ? 'main' : 'details'
          state.validationMessage = undefined
          render(state)
          continue
        }

        if (key === '\u0005') {
          state.view = state.view === 'export' ? 'main' : 'export'
          state.validationMessage = undefined
          render(state)
          continue
        }

        if (key === '\u007F' || key === '\b') {
          state.name = state.hasEditedName ? state.name.slice(0, -1) : ''
          state.hasEditedName = true
          state.validationMessage = undefined
          render(state)
          continue
        }

        if (key === '\u0015') {
          state.name = ''
          state.hasEditedName = true
          state.validationMessage = undefined
          render(state)
          continue
        }

        if (isPrintableKey(key)) {
          state.name = state.hasEditedName ? `${state.name}${key}` : key
          state.hasEditedName = true
          state.view = 'main'
          state.validationMessage = undefined
          render(state)
        }
      }
    }

    try {
      enterFullscreen(state)
      stdin.on('data', onData)
      stdout.on('resize', onResize)
      render(state)
    }
    catch {
      finish({
        kind: 'unavailable',
        reason: 'failed to enter raw fullscreen terminal mode',
      })
    }
  })
}

function createWorkbenchSpec(projectName: string): CreateSpec {
  return {
    topology: 'workspace',
    packages: [
      {
        id: 'tool',
        name: makePackageName(`@${projectName}/tool`),
        capabilities: ['cli-tool'],
        internalDependencies: [],
      },
    ],
    rootCapabilities: ['package-manager:pnpm', 'linting', 'knip'],
    providers: [],
    overrides: {},
  }
}

function enterFullscreen(state: TerminalState): void {
  state.stdout.write('\x1B[?1049h\x1B[?25l')
  state.stdin.setRawMode(true)
  state.stdin.resume()
  state.stdin.setEncoding('utf8')
}

function cleanup(
  state: TerminalState,
  onData: (chunk: Buffer | string) => void,
  onResize: () => void,
): void {
  state.stdin.off('data', onData)
  state.stdout.off('resize', onResize)

  if (typeof state.stdin.setRawMode === 'function') {
    state.stdin.setRawMode(false)
  }

  state.stdin.pause()
  state.stdout.write('\x1B[?25h\x1B[?1049l')
}

function render(state: TerminalState): void {
  const width = Math.max(80, state.stdout.columns ?? 100)
  const height = Math.max(24, state.stdout.rows ?? 30)
  const lines = renderLines(state, width)
  const visibleLines = lines.slice(0, height - 1)

  state.stdout.write('\x1B[2J\x1B[H')
  state.stdout.write(`${visibleLines.map(line => fit(line, width)).join('\n')}\n`)
}

function renderLines(state: TerminalState, width: number): readonly string[] {
  const contentWidth = Math.max(40, width - 4)
  const name = normalizedProjectName(state)
  const target = state.explicitTargetDir ?? `./${name}`

  if (state.view === 'details') {
    return frame('prelude create', [
      'Preview details',
      '',
      'Create route will still resolve, plan, apply, and verify after this screen submits.',
      'The workbench only drafts the CreateSpec input for the existing route.',
      '',
      'Shape',
      `  ${name}`,
      `  ${target}`,
      '  workspace / apps/tool',
      '',
      'Secondary detail',
      '  canonical CreateSpec draft is available with ctrl+e',
      '  resolved graph, WritePlan, and manifest stay out of the primary screen',
      '  this first shell creates the current executable workspace starter',
      '  workspace + effect-harness maintain remains a tracked v1 implementation gap',
      '',
      ...footerLines(),
    ], contentWidth)
  }

  if (state.view === 'export') {
    return frame('prelude create', [
      'CreateSpec draft',
      '',
      ...JSON.stringify(createWorkbenchSpec(name), null, 2).split('\n'),
      '',
      ...footerLines(),
    ], contentWidth)
  }

  return frame('prelude create', [
    'Create a project start',
    '',
    field('Project', name),
    field('Location', target),
    field('Starting point', 'workspace with one Node CLI package'),
    '',
    'Included capabilities',
    ...includes.map(item => `  [x] ${item}`),
    '',
    'Generated result',
    '  root package and pnpm workspace',
    '  apps/tool package with CLI source, tsconfig, and tsdown',
    '  root lint and Knip config',
    '',
    'Managed support',
    ...managedSupport.map(item => `  - ${item}`),
    '',
    'Next actions',
    ...nextActions.map(item => `  ${item}`),
    '',
    ...(state.validationMessage === undefined ? [] : [`Error: ${state.validationMessage}`, '']),
    ...footerLines(),
  ], contentWidth)
}

function frame(title: string, body: readonly string[], width: number): readonly string[] {
  const innerWidth = Math.max(1, width - 4)

  return [
    `+${repeat('-', width - 2)}+`,
    `| ${padRight(title, innerWidth)} |`,
    `+${repeat('-', width - 2)}+`,
    ...body.flatMap(line => wrap(line, innerWidth)).map(line => `| ${padRight(line, innerWidth)} |`),
    `+${repeat('-', width - 2)}+`,
  ]
}

function footerLines(): readonly string[] {
  return [
    'enter create  ctrl+p preview details  ctrl+e export spec  q quit',
    'type to replace the project name; backspace edits; ctrl+u clears',
  ]
}

function field(label: string, value: string): string {
  return `${label}: ${value}`
}

function normalizedProjectName(state: TerminalState): string {
  const value = state.name.trim()
  return value.length === 0 ? state.defaultName : value
}

function isProjectNameInput(value: string): boolean {
  return /^[\w-]+$/u.test(value)
}

function splitInput(input: string): readonly string[] {
  const keys: string[] = []

  for (let index = 0; index < input.length; index += 1) {
    const value = input[index]
    if (value === '\x1B') {
      let sequence = value
      while (index + 1 < input.length && sequence.length < 6) {
        index += 1
        sequence = `${sequence}${input[index] ?? ''}`
        if (/[A-Za-z~]$/u.test(sequence)) {
          break
        }
      }
      keys.push(sequence)
      continue
    }

    if (value !== undefined) {
      keys.push(value)
    }
  }

  return keys
}

function isPrintableKey(key: string): boolean {
  return key.length === 1 && key >= ' ' && key !== '\u007F'
}

function fit(value: string, width: number): string {
  if (value.length >= width) {
    return value.slice(0, width)
  }

  return padRight(value, width)
}

function padRight(value: string, width: number): string {
  if (value.length >= width) {
    return value.slice(0, width)
  }

  return `${value}${repeat(' ', width - value.length)}`
}

function repeat(value: string, count: number): string {
  return value.repeat(Math.max(0, count))
}

function wrap(value: string, width: number): readonly string[] {
  if (value.length <= width) {
    return [value]
  }

  const words = value.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const next = current.length === 0 ? word : `${current} ${word}`
    if (next.length > width) {
      if (current.length > 0) {
        lines.push(current)
      }
      current = word
    }
    else {
      current = next
    }
  }

  if (current.length > 0) {
    lines.push(current)
  }

  return lines
}
