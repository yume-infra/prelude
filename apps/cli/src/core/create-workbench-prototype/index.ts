#!/usr/bin/env node

import process from 'node:process'

interface Variant {
  readonly key: string
  readonly title: string
  readonly render: (width: number, height: number) => readonly string[]
}

const variants: readonly Variant[] = [
  {
    key: '1',
    title: 'Three-pane workbench',
    render: renderThreePane,
  },
  {
    key: '2',
    title: 'Pipeline board',
    render: renderPipelineBoard,
  },
  {
    key: '3',
    title: 'Inspector console',
    render: renderInspectorConsole,
  },
]

let currentVariantIndex = 0

function renderThreePane(width: number, height: number): readonly string[] {
  const bodyHeight = Math.max(8, height - 8)
  const columnWidth = Math.max(24, Math.floor((width - 6) / 3))
  const lines: string[] = [
    header(width, 'prelude create - fullscreen workbench prototype'),
    row([
      cell('Run context', [
        'target: ./my-worker',
        'mode: preview -> apply',
        'output: human',
        'confirm: interactive',
        '',
        'Agent path:',
        'prelude create --spec',
        '  ./create-spec.json',
        '  --target ./my-worker',
        '  --json --yes',
      ], columnWidth),
      cell('CreateSpec draft', [
        'topology',
        '  [x] workspace',
        'packages',
        '  [x] apps/worker',
        'capabilities',
        '  [x] node-cli',
        '  [x] typescript',
        '  [x] lint',
        '  [x] knip',
        'maintain',
        '  [x] effect-harness',
      ], columnWidth),
      cell('Preview', [
        'resolved graph',
        '  root workspace',
        '  package apps/worker',
        '  maintain domain: effect',
        '',
        'create WritePlan',
        '  + package.json',
        '  + pnpm-workspace.yaml',
        '  + apps/worker/src/index.ts',
        '  + .prelude/manifest.json',
      ], columnWidth),
    ], bodyHeight),
    footer(width),
  ]

  return lines
}

function renderPipelineBoard(width: number, height: number): readonly string[] {
  const laneWidth = Math.max(18, Math.floor((width - 10) / 5))
  const laneHeight = Math.max(9, height - 9)

  return [
    header(width, 'prelude create - pipeline board prototype'),
    row([
      cell('1. Spec', [
        'workspace',
        'apps/worker',
        'node-cli',
        'typescript',
        'lint',
        'knip',
        'effect-harness',
      ], laneWidth),
      cell('2. Resolve', [
        'defaults',
        'package scopes',
        'surface choices',
        'maintain intent',
        '',
        'blockers: none',
      ], laneWidth),
      cell('3. Preview', [
        'files: 12',
        'structured: 5',
        'generated: 6',
        'initializeMaintain: 1',
        '',
        'writes not applied',
      ], laneWidth),
      cell('4. Apply', [
        'explicit confirm',
        'write project files',
        'run create verify',
        '',
        'ordinary scaffold',
        'handoff after verify',
      ], laneWidth),
      cell('5. Maintain', [
        'manifest owned here',
        'managed claims',
        'base snapshots',
        '',
        'update compares:',
        'desired/base/current',
      ], laneWidth),
    ], laneHeight),
    statusBar(width, [
      'This variant emphasizes flow order over dense editing.',
      'No real create logic is wired.',
    ]),
    footer(width),
  ]
}

function renderInspectorConsole(width: number, height: number): readonly string[] {
  const leftWidth = Math.max(22, Math.floor(width * 0.24))
  const rightWidth = Math.max(38, width - leftWidth - 5)
  const mainHeight = Math.max(10, height - 10)

  return [
    header(width, 'prelude create - inspector console prototype'),
    row([
      cell('Workbench', [
        '> Run context',
        '  CreateSpec draft',
        '  Resolved graph',
        '  WritePlan',
        '  Maintain init',
        '  Verification',
        '',
        'Shortcuts',
        '  p preview',
        '  a apply',
        '  s print spec',
      ], leftWidth),
      cell('Run context / current inspector', [
        'Human entry:',
        '  prelude create',
        '',
        'Agent entry:',
        '  prelude create --spec ./create-spec.json --target ./my-worker --json --yes',
        '',
        'CreateSpec summary:',
        '  topology: workspace',
        '  packages: apps/worker',
        '  create capabilities: node-cli, typescript, lint, knip',
        '  maintain domains: effect-harness',
        '',
        'Machine output contract:',
        '  status | blockers | resolvedGraph | writePlan | verification | maintainInit',
      ], rightWidth),
    ], mainHeight),
    cell('Static JSON-shaped preview', [
      '{',
      '  "status": "previewOnly",',
      '  "blockers": [],',
      '  "ordinaryScaffold": "handoffAfterCreateVerification",',
      '  "managedSurfaces": ["effect-harness"],',
      '  "note": "prototype has no resolver, writes, or maintain logic"',
      '}',
    ], width - 2).join('\n'),
    footer(width),
  ].flatMap(splitLines)
}

function cell(title: string, content: readonly string[], width: number): readonly string[] {
  const innerWidth = Math.max(1, width - 4)
  const lines = [
    `+${repeat('-', width - 2)}+`,
    `| ${padRight(title, innerWidth)} |`,
    `+${repeat('-', width - 2)}+`,
    ...content.map(line => `| ${padRight(line, innerWidth)} |`),
    `+${repeat('-', width - 2)}+`,
  ]

  return lines
}

function row(columns: readonly (readonly string[])[], minHeight: number): string {
  const height = Math.max(minHeight, ...columns.map(column => column.length))
  const paddedColumns = columns.map(column => padLines(column, height))
  const rows: string[] = []

  for (let index = 0; index < height; index += 1) {
    rows.push(paddedColumns.map(column => column[index]).join('  '))
  }

  return rows.join('\n')
}

function header(width: number, title: string): string {
  const variant = getCurrentVariant()
  return [
    repeat('=', width),
    padRight(`${title} | variant ${variant.key}: ${variant.title}`, width),
    padRight('PROTOTYPE ONLY - static terminal mock, no create/maintain logic', width),
    repeat('=', width),
  ].join('\n')
}

function statusBar(width: number, messages: readonly string[]): string {
  return [
    repeat('-', width),
    ...messages.map(message => padRight(message, width)),
  ].join('\n')
}

function footer(width: number): string {
  return [
    repeat('-', width),
    '[1] three-pane  [2] pipeline  [3] inspector  [left/right] switch  [q] quit',
  ].map(line => padRight(line, width)).join('\n')
}

function render(): void {
  const width = Math.max(90, process.stdout.columns ?? 110)
  const height = Math.max(28, process.stdout.rows ?? 34)
  const variant = getCurrentVariant()
  const lines = variant.render(width, height).flatMap(splitLines)
  const croppedLines = lines.slice(0, height - 1)

  if (process.stdout.isTTY) {
    process.stdout.write('\x1B[2J\x1B[H')
  }

  process.stdout.write(`${croppedLines.join('\n')}\n`)
}

function getCurrentVariant(): Variant {
  const variant = variants[currentVariantIndex]
  if (variant !== undefined) {
    return variant
  }

  currentVariantIndex = 0
  const firstVariant = variants[0]
  if (firstVariant !== undefined) {
    return firstVariant
  }

  throw new Error('Prototype variants are missing.')
}

function splitLines(value: string): readonly string[] {
  return value.split('\n')
}

function padLines(lines: readonly string[], height: number): readonly string[] {
  const width = Math.max(...lines.map(line => line.length))
  return Array.from({ length: height }, (_, index) => padRight(lines[index] ?? '', width))
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

function nextVariant(): void {
  currentVariantIndex = (currentVariantIndex + 1) % variants.length
}

function previousVariant(): void {
  currentVariantIndex = (currentVariantIndex + variants.length - 1) % variants.length
}

function exit(): never {
  process.stdout.write('\x1B[?25h\x1B[?1049l')
  process.exit(0)
}

if (process.stdout.isTTY && typeof process.stdin.setRawMode === 'function') {
  process.stdout.write('\x1B[?1049h\x1B[?25l')
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (key) => {
    if (key === '\u0003' || key === 'q') {
      exit()
    }

    if (key === '1') {
      currentVariantIndex = 0
    }
    else if (key === '2') {
      currentVariantIndex = 1
    }
    else if (key === '3') {
      currentVariantIndex = 2
    }
    else if (key === '\x1B[C') {
      nextVariant()
    }
    else if (key === '\x1B[D') {
      previousVariant()
    }

    render()
  })
  process.stdout.on('resize', render)
  process.on('exit', () => {
    process.stdout.write('\x1B[?25h\x1B[?1049l')
  })

  render()
}
else {
  render()
  process.stdout.write('\nInteractive raw terminal mode is unavailable; rendered variant 1 once.\n')
}
