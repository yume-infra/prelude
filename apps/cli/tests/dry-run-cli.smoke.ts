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
    expectedOwnership: 'owner: react-scaffold, unit: json-text-mutation',
  },
  {
    label: 'vue full preset',
    preset: 'vue-full',
    projectName: 'smoke-vue-dry-run',
    expectedOwnership: 'owner: vue-scaffold, unit: json-text-mutation',
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
  assertIncludes(testCase, output, 'Post-generate command internal file effects are not fully shown.')
  assertIncludes(testCase, output, 'Planned files:')
  assertIncludes(testCase, output, '- json package.json (owner: workspace-bootstrap, unit: json-text-mutation)')
  assertIncludes(testCase, output, testCase.expectedOwnership)
  assertIncludes(testCase, output, 'Post-generate commands:')
  assertIncludes(testCase, output, 'after-plan-apply: pnpm install')
  assertIncludes(testCase, output, 'after-plan-apply: git init')
  assertIncludes(testCase, output, 'after-plan-apply: pnpm exec husky init')
  assertIncludes(testCase, output, 'Post-generate file actions:')
  assertIncludes(testCase, output, 'after-post-generate-commands: write-file .husky/pre-commit (executable: false)')
  assertIncludes(testCase, output, 'after-post-generate-commands: write-file .husky/commit-msg (executable: true)')
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
    console.log(`${casePrefix(testCase)} dry-run generation: node ${cliDistPath} --preset ${testCase.preset} --name ${testCase.projectName} --dry-run --install --git (cwd: ${rootDir})`)
    let output = ''

    try {
      const result = await execFileAsync('node', [
        cliDistPath,
        '--preset',
        testCase.preset,
        '--name',
        testCase.projectName,
        '--dry-run',
        '--install',
        '--git',
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
      console.error(`${casePrefix(testCase)} kept failed temp root for inspection: ${rootDir}`)
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
