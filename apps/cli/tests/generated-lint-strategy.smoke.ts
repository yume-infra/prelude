import assert from 'node:assert/strict'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'

interface LintStrategySmokeCase {
  readonly label: string
  readonly preset: 'react-full' | 'vue-full'
  readonly projectName: string
}

type SmokePhase = 'generation' | 'install' | 'lint'

const testsDir = path.dirname(fileURLToPath(import.meta.url))
const cliDistPath = path.resolve(testsDir, '../dist/index.js')
const phaseTimeoutMs = 300_000

const smokeCases: readonly LintStrategySmokeCase[] = [
  {
    label: 'react full preset',
    preset: 'react-full',
    projectName: 'lint-strategy-react-full',
  },
  {
    label: 'vue full preset',
    preset: 'vue-full',
    projectName: 'lint-strategy-vue-full',
  },
]

function smokeEnv() {
  return {
    ...process.env,
    CI: '1',
    FORCE_COLOR: '0',
    npm_config_frozen_lockfile: 'false',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function formatCommand(command: string, args: readonly string[]) {
  return [command, ...args].join(' ')
}

function readErrorField(error: unknown, field: string) {
  if (!isRecord(error) || !(field in error)) {
    return undefined
  }

  const value = error[field]
  return value === undefined ? undefined : String(value)
}

function formatSmokeError(options: {
  readonly testCase: LintStrategySmokeCase
  readonly phase: SmokePhase
  readonly cwd: string
  readonly command: string
  readonly args: readonly string[]
  readonly error: unknown
}) {
  const exitCode = readErrorField(options.error, 'exitCode') ?? 'unknown'
  const timedOut = readErrorField(options.error, 'timedOut') ?? 'false'

  return new Error([
    `[lint-strategy-smoke] ${options.testCase.preset} ${options.phase} failed`,
    `label: ${options.testCase.label}`,
    `cwd: ${options.cwd}`,
    `command: ${formatCommand(options.command, options.args)}`,
    `exitCode: ${exitCode}`,
    `timedOut: ${timedOut}`,
  ].join('\n'), { cause: options.error })
}

async function runPhase(options: {
  readonly testCase: LintStrategySmokeCase
  readonly phase: SmokePhase
  readonly cwd: string
  readonly command: string
  readonly args: readonly string[]
  readonly stdio?: 'inherit' | 'pipe'
}) {
  console.log(`[lint-strategy-smoke] ${options.testCase.preset} ${options.phase}: ${formatCommand(options.command, options.args)} (cwd: ${options.cwd})`)

  try {
    return await execa(options.command, options.args, {
      cwd: options.cwd,
      env: smokeEnv(),
      stdio: options.stdio ?? 'inherit',
      timeout: phaseTimeoutMs,
    })
  }
  catch (error) {
    throw formatSmokeError({
      testCase: options.testCase,
      phase: options.phase,
      cwd: options.cwd,
      command: options.command,
      args: options.args,
      error,
    })
  }
}

async function readPackageJson(packageJsonPath: string, testCase: LintStrategySmokeCase) {
  const rawPackageJson = await readFile(packageJsonPath, 'utf8')
  const packageJson = JSON.parse(rawPackageJson) as unknown

  assert.ok(isRecord(packageJson), `[lint-strategy-smoke] ${testCase.preset} package.json must be an object`)
  assert.equal(packageJson.name, testCase.projectName, `[lint-strategy-smoke] ${testCase.preset} package.json must use the generated project name`)
  assert.ok(isRecord(packageJson.scripts), `[lint-strategy-smoke] ${testCase.preset} package.json must include scripts`)
  assert.equal(packageJson.scripts.lint, 'eslint', `[lint-strategy-smoke] ${testCase.preset} must include a lint script for the lint-enabled full preset`)

  return packageJson
}

function assertNonInteractiveGeneration(output: string, testCase: LintStrategySmokeCase) {
  assert.ok(
    !output.includes('?'),
    `[lint-strategy-smoke] ${testCase.preset} generation must stay non-interactive and not print prompt questions`,
  )
  assert.ok(
    !output.toLowerCase().includes('choose a'),
    `[lint-strategy-smoke] ${testCase.preset} generation must not ask selection prompts`,
  )
}

async function assertGeneratedLintProject(generatedDir: string, testCase: LintStrategySmokeCase) {
  const packageJsonPath = path.join(generatedDir, 'package.json')

  await access(packageJsonPath)
  await access(path.join(generatedDir, 'eslint.config.mjs'))
  await readPackageJson(packageJsonPath, testCase)
}

async function runSmokeCase(rootDir: string, testCase: LintStrategySmokeCase) {
  const generatedDir = path.join(rootDir, testCase.projectName)

  const generation = await runPhase({
    testCase,
    phase: 'generation',
    cwd: rootDir,
    command: 'node',
    args: [
      cliDistPath,
      '--preset',
      testCase.preset,
      '--name',
      testCase.projectName,
      '--no-install',
      '--no-git',
    ],
    stdio: 'pipe',
  })

  assertNonInteractiveGeneration(`${generation.stdout}\n${generation.stderr}`, testCase)
  await assertGeneratedLintProject(generatedDir, testCase)

  await runPhase({
    testCase,
    phase: 'install',
    cwd: generatedDir,
    command: 'pnpm',
    args: ['install', '--ignore-scripts'],
  })

  await runPhase({
    testCase,
    phase: 'lint',
    cwd: generatedDir,
    command: 'pnpm',
    args: ['lint', '--max-warnings=0'],
  })
}

async function assertBuiltCliAvailable() {
  try {
    await access(cliDistPath)
  }
  catch (error) {
    throw new Error(`[lint-strategy-smoke] Built CLI not found at ${cliDistPath}. Run pnpm --filter create-yume build before this smoke.`, { cause: error })
  }
}

async function main() {
  await assertBuiltCliAvailable()

  const rootDir = await mkdtemp(path.join(tmpdir(), 'create-yume-lint-strategy-'))
  let passed = false

  try {
    for (const testCase of smokeCases) {
      await runSmokeCase(rootDir, testCase)
    }
    passed = true
    console.log(`[lint-strategy-smoke] all lint-enabled generated project checks passed in ${rootDir}`)
  }
  finally {
    if (passed) {
      await rm(rootDir, { recursive: true, force: true })
    }
    else {
      console.error(`[lint-strategy-smoke] kept failed temp root for inspection: ${rootDir}`)
    }
  }
}

await main()
