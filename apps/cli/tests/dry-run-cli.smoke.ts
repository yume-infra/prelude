import type { Buffer } from 'node:buffer'
import { execFile } from 'node:child_process'
import { access, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const smokePrefix = 'dry-run-smoke'
const testsDir = path.dirname(fileURLToPath(import.meta.url))
const cliDistPath = path.resolve(testsDir, '../dist/index.js')

interface DryRunCase {
  readonly label: string
  readonly preset?: string
  readonly spec?: string
  readonly projectName: string
  readonly flags: readonly string[]
  readonly expected: readonly string[]
}

const workspaceSpecInput = JSON.stringify({
  shape: 'workspace',
  packages: [
    {
      id: 'web',
      name: '@smoke/web',
      kind: 'frontend-app',
      frontend: {
        framework: 'react',
        buildTool: 'vite',
        cssPreprocessor: 'less',
        cssFramework: 'none',
      },
      internalDependencies: [
        {
          target: {
            by: 'id',
            id: 'shared',
          },
        },
      ],
    },
    {
      id: 'tool',
      name: '@smoke/tool',
      kind: 'cli-tool',
      cli: {
        toolkit: 'none',
      },
      internalDependencies: [
        {
          target: {
            by: 'name',
            name: '@smoke/shared',
          },
        },
      ],
    },
    {
      id: 'shared',
      name: '@smoke/shared',
      kind: 'library-package',
      library: {
        toolkit: 'none',
      },
    },
  ],
})

const dryRunCases: readonly DryRunCase[] = [
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
  {
    label: 'cli effect preset',
    preset: 'cli-effect',
    projectName: 'smoke-cli-effect-dry-run',
    flags: [],
    expected: [
      'Dry run preview',
      '- render src/index.ts (owner: cli-scaffold, unit: fragment-render)',
      '- render scripts/ensure-shebang.mjs (owner: cli-scaffold, unit: fragment-render)',
      'owner: cli-scaffold, unit: json-text-mutation',
    ],
  },
  {
    label: 'workspace spec with child packages',
    spec: workspaceSpecInput,
    projectName: 'smoke-workspace-spec-dry-run',
    flags: ['--no-input'],
    expected: [
      'Dry run preview',
      'Root files:',
      '- json package.json (owner: workspace-bootstrap, unit: json-text-mutation)',
      '- render pnpm-workspace.yaml (owner: workspace-bootstrap, unit: fragment-render)',
      'Workspace package files:',
      '- json apps/web/package.json (owner: frontend-package, unit: json-text-mutation)',
      '- render apps/web/index.html (owner: frontend-scaffold, unit: fragment-render)',
      '- json apps/tool/package.json (owner: cli-package, unit: json-text-mutation)',
      '- render apps/tool/src/index.ts (owner: cli-scaffold, unit: fragment-render)',
      '- json libs/shared/package.json (owner: library-package, unit: json-text-mutation)',
      '- render libs/shared/src/index.ts (owner: library-package, unit: fragment-render)',
      'owner: cli-scaffold, unit: json-text-mutation',
      'owner: library-package, unit: json-text-mutation',
    ],
  },
]

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

function dryRunInputArgs(testCase: DryRunCase) {
  if (testCase.spec !== undefined) {
    return ['--spec', testCase.spec]
  }

  if (testCase.preset === undefined) {
    throw new Error(`${casePrefix(testCase)} must define either preset or spec input`)
  }

  return ['--preset', testCase.preset]
}

async function assertDryRunWroteNothing(testCase: DryRunCase, rootDir: string, targetDir: string, output: string) {
  if (await pathExists(targetDir)) {
    throw new Error(`${casePrefix(testCase)} dry-run created target directory: ${targetDir}\nOutput:\n${output}`)
  }

  const rootEntries = await readdir(rootDir)

  if (rootEntries.length > 0) {
    throw new Error(`${casePrefix(testCase)} dry-run wrote unexpected entries in ${rootDir}: ${rootEntries.join(', ')}\nOutput:\n${output}`)
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
    const inputArgs = dryRunInputArgs(testCase)
    console.log(`${casePrefix(testCase)} dry-run generation: node ${cliDistPath} ${inputArgs.join(' ')} --name ${testCase.projectName} --dry-run ${testCase.flags.join(' ')} (cwd: ${rootDir})`)
    let output = ''

    try {
      const result = await execFileAsync('node', [
        cliDistPath,
        ...inputArgs,
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

    await assertDryRunWroteNothing(testCase, rootDir, targetDir, output)

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
