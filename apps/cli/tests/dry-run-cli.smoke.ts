import type { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const smokePrefix = 'dry-run-smoke'
const testsDir = path.dirname(fileURLToPath(import.meta.url))
const cliDistPath = path.resolve(testsDir, '../dist/index.js')

const dryRunCases = [
  {
    label: 'react full preset',
    preset: 'react-full',
    projectName: 'smoke-react-dry-run',
    flags: ['--install', '--git'],
    expected: [
      'Dry run preview',
      '- json package.json (owner: workspace-bootstrap, unit: json-text-mutation)',
      'owner: react-scaffold, unit: json-text-mutation',
      'Post-generate commands:',
      'after-plan-apply: pnpm install',
      'after-plan-apply: git init',
      'after-plan-apply: pnpm exec husky init',
      'Post-generate file actions:',
      'after-post-generate-commands: write-file .husky/pre-commit (executable: false)',
      'after-post-generate-commands: write-file .husky/commit-msg (executable: true)',
    ],
  },
  {
    label: 'vue full preset',
    preset: 'vue-full',
    projectName: 'smoke-vue-dry-run',
    flags: ['--install', '--git'],
    expected: [
      'Dry run preview',
      '- json package.json (owner: workspace-bootstrap, unit: json-text-mutation)',
      'owner: vue-scaffold, unit: json-text-mutation',
    ],
  },
  {
    label: 'workspace root preset',
    preset: 'workspace-root',
    projectName: 'smoke-workspace-root-dry-run',
    flags: ['--install', '--git'],
    expected: [
      'Dry run preview',
      '- render pnpm-workspace.yaml (owner: workspace-bootstrap, unit: fragment-render)',
      '- render turbo.json (owner: workspace-bootstrap, unit: fragment-render)',
      '- json package.json (owner: workspace-bootstrap, unit: json-text-mutation)',
    ],
  },
  {
    label: 'node minimal preset',
    preset: 'node-minimal',
    projectName: 'smoke-node-dry-run',
    flags: [],
    expected: [
      'Dry run preview',
      '- render src/index.ts (owner: node-scaffold, unit: fragment-render)',
      '- render tsconfig.json (owner: node-scaffold, unit: fragment-render)',
      '- render tsdown.config.ts (owner: node-scaffold, unit: fragment-render)',
      'owner: node-scaffold, unit: json-text-mutation',
    ],
  },
  {
    label: 'cli minimal preset',
    preset: 'cli-minimal',
    projectName: 'smoke-cli-dry-run',
    flags: [],
    expected: [
      'Dry run preview',
      '- render src/index.ts (owner: cli-scaffold, unit: fragment-render)',
      '- render scripts/ensure-shebang.mjs (owner: cli-scaffold, unit: fragment-render)',
      'owner: cli-scaffold, unit: json-text-mutation',
    ],
  },
] as const

type DryRunCase = typeof dryRunCases[number]

type ExecFailure = Error & {
  readonly stdout?: string | Buffer
  readonly stderr?: string | Buffer
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  }
  catch {
    return false
  }
}

function casePrefix(testCase: DryRunCase) {
  return `[${smokePrefix}] ${testCase.label}`
}

function formatOutput(stdout: string | Buffer | undefined, stderr: string | Buffer | undefined) {
  return `${stdout?.toString() ?? ''}\n${stderr?.toString() ?? ''}`
}

function assertIncludes(testCase: DryRunCase, output: string, expected: string) {
  if (!output.includes(expected)) {
    throw new Error(`${casePrefix(testCase)} expected output to include ${JSON.stringify(expected)}\nOutput:\n${output}`)
  }
}

function assertPreviewContract(testCase: DryRunCase, output: string) {
  assertIncludes(testCase, output, 'Dry run preview')
  assertIncludes(testCase, output, 'No files or directories will be written, and no commands will be executed.')
  assertIncludes(testCase, output, 'Planned files:')

  for (const expected of testCase.expected) {
    assertIncludes(testCase, output, expected)
  }
}

async function assertBuiltCliAvailable() {
  if (!(await pathExists(cliDistPath))) {
    throw new Error(`[${smokePrefix}] Built CLI not found at ${cliDistPath}. Run pnpm --filter create-yume build before this smoke.`)
  }
}

async function runDryRunCase(testCase: DryRunCase) {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'create-yume-dry-run-'))
  const targetDir = path.join(rootDir, testCase.projectName)
  let passed = false

  try {
    console.log(`${casePrefix(testCase)} dry-run generation: node ${cliDistPath} --preset ${testCase.preset} --name ${testCase.projectName} --dry-run ${testCase.flags.join(' ')} (cwd: ${rootDir})`)
    let output = ''

    try {
      const result = await execFileAsync('node', [
        cliDistPath,
        '--preset',
        testCase.preset,
        '--name',
        testCase.projectName,
        '--dry-run',
        ...testCase.flags,
      ], {
        cwd: rootDir,
        maxBuffer: 1024 * 1024 * 8,
        timeout: 30_000,
      })
      output = formatOutput(result.stdout, result.stderr)
    }
    catch (error) {
      const execError = error as ExecFailure
      output = formatOutput(execError.stdout, execError.stderr)
      throw new Error(`${casePrefix(testCase)} CLI dry-run failed: ${execError.message}\nstdout/stderr:\n${output}`)
    }

    assertPreviewContract(testCase, output)

    if (await pathExists(targetDir)) {
      throw new Error(`${casePrefix(testCase)} dry-run created target directory: ${targetDir}\nOutput:\n${output}`)
    }

    passed = true
    console.log(`${casePrefix(testCase)} dry-run preview produced no target directory in ${rootDir}`)
  }
  finally {
    if (passed) {
      await rm(rootDir, { recursive: true, force: true })
    }
    else {
      console.error(`[${smokePrefix}] kept failed temp root for inspection: ${rootDir}`)
    }
  }
}

async function main() {
  await assertBuiltCliAvailable()

  for (const testCase of dryRunCases) {
    await runDryRunCase(testCase)
  }
}

await main()
