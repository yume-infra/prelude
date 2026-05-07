import assert from 'node:assert/strict'
import { constants } from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { execa } from 'execa'

export type GeneratedPreset
  = | 'react-minimal'
    | 'react-full'
    | 'vue-minimal'
    | 'vue-full'
    | 'node-minimal'
    | 'standalone-backend-full'
    | 'cli-minimal'
    | 'cli-effect'
    | 'standalone-cli-full'
    | 'standalone-library-minimal'
    | 'standalone-library-node'
    | 'workspace-cli-library'
    | 'workspace-fullstack-react'
    | 'workspace-fullstack-vue'

export type GeneratedSmokePhase = 'generation' | 'install' | 'build' | 'lint' | 'link' | 'invoke'

export interface GeneratedSmokeCaseBase {
  readonly label: string
  readonly projectName: string
}

export interface GeneratedSmokeCase extends GeneratedSmokeCaseBase {
  readonly preset: GeneratedPreset
}

export interface GeneratedSpecSmokeCase extends GeneratedSmokeCaseBase {
  readonly specLabel: string
}

export type GeneratedSmokeLogCase = GeneratedSmokeCase | GeneratedSpecSmokeCase

export interface GeneratedSmokeEnvOptions {
  readonly extraPath?: string
}

export interface RunGeneratedSmokePhaseOptions {
  readonly prefix: string
  readonly testCase: GeneratedSmokeLogCase
  readonly phase: GeneratedSmokePhase
  readonly cwd: string
  readonly command: string
  readonly args: readonly string[]
  readonly stdio?: 'inherit' | 'pipe'
  readonly timeoutMs?: number
  readonly env?: NodeJS.ProcessEnv
}

export const generatedSmokePhaseTimeoutMs = 300_000
export const defaultGeneratedSmokeConcurrency = 2
export const generatedLintArgs = ['lint', '--max-warnings=0'] as const

export function generatedSmokeEnv(options: GeneratedSmokeEnvOptions = {}) {
  return {
    ...process.env,
    CI: '1',
    FORCE_COLOR: '0',
    npm_config_frozen_lockfile: 'false',
    ...(options.extraPath ? { PATH: `${options.extraPath}${path.delimiter}${process.env.PATH ?? ''}` } : {}),
  }
}

export function shouldRunLintForPreset(preset: GeneratedPreset) {
  return preset === 'react-full'
    || preset === 'vue-full'
    || preset === 'standalone-backend-full'
    || preset === 'standalone-cli-full'
    || preset === 'workspace-cli-library'
    || preset === 'workspace-fullstack-react'
    || preset === 'workspace-fullstack-vue'
}

export function parseGeneratedSmokeConcurrency(rawValue: string | undefined, envName: string) {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    return defaultGeneratedSmokeConcurrency
  }

  const normalizedValue = rawValue.trim()

  if (!/^\d+$/.test(normalizedValue)) {
    throw new Error(`[generated-smoke] ${envName} must be a positive integer; received ${JSON.stringify(rawValue)}`)
  }

  const concurrency = Number.parseInt(normalizedValue, 10)

  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error(`[generated-smoke] ${envName} must be a positive integer; received ${JSON.stringify(rawValue)}`)
  }

  return concurrency
}

export function formatGeneratedCommand(command: string, args: readonly string[]) {
  return [command, ...args].join(' ')
}

export function generatedSmokeInputName(testCase: GeneratedSmokeLogCase) {
  return 'preset' in testCase ? testCase.preset : testCase.specLabel
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readErrorField(error: unknown, field: string) {
  if (!isRecord(error) || !(field in error)) {
    return undefined
  }

  const value = error[field]
  return value === undefined ? undefined : String(value)
}

export function formatGeneratedSmokeError(options: {
  readonly prefix: string
  readonly testCase: GeneratedSmokeLogCase
  readonly phase: GeneratedSmokePhase
  readonly cwd: string
  readonly command: string
  readonly args: readonly string[]
  readonly error: unknown
}) {
  const exitCode = readErrorField(options.error, 'exitCode') ?? 'unknown'
  const timedOut = readErrorField(options.error, 'timedOut') ?? 'false'
  const inputName = generatedSmokeInputName(options.testCase)

  return new Error([
    `[${options.prefix}] ${inputName} ${options.phase} failed`,
    `label: ${options.testCase.label}`,
    `project: ${options.testCase.projectName}`,
    `cwd: ${options.cwd}`,
    `command: ${formatGeneratedCommand(options.command, options.args)}`,
    `exitCode: ${exitCode}`,
    `timedOut: ${timedOut}`,
  ].join('\n'), { cause: options.error })
}

export async function runGeneratedSmokePhase(options: RunGeneratedSmokePhaseOptions) {
  const inputName = generatedSmokeInputName(options.testCase)

  console.log(
    `[${options.prefix}] ${inputName} ${options.phase}: ${formatGeneratedCommand(options.command, options.args)} (cwd: ${options.cwd})`,
  )

  try {
    return await execa(options.command, options.args, {
      cwd: options.cwd,
      env: options.env ?? generatedSmokeEnv(),
      stdio: options.stdio ?? 'inherit',
      timeout: options.timeoutMs ?? generatedSmokePhaseTimeoutMs,
    })
  }
  catch (error) {
    throw formatGeneratedSmokeError({
      prefix: options.prefix,
      testCase: options.testCase,
      phase: options.phase,
      cwd: options.cwd,
      command: options.command,
      args: options.args,
      error,
    })
  }
}

export function assertNonInteractiveGeneration(output: string, testCase: GeneratedSmokeLogCase, prefix: string) {
  const inputName = generatedSmokeInputName(testCase)

  assert.ok(
    !output.includes('?'),
    `[${prefix}] ${inputName} generation must stay non-interactive and not print prompt questions`,
  )
  assert.ok(
    !output.toLowerCase().includes('choose a'),
    `[${prefix}] ${inputName} generation must not ask selection prompts`,
  )
}

export function assertGeneratedPackageProjectContract(packageJson: unknown, testCase: GeneratedSmokeLogCase, prefix: string) {
  const inputName = generatedSmokeInputName(testCase)

  assert.ok(isRecord(packageJson), `[${prefix}] ${inputName} package.json must be an object`)
  assert.equal(
    packageJson.name,
    testCase.projectName,
    `[${prefix}] ${inputName} package.json must use the generated project name`,
  )
}

export function assertGeneratedPackageLintContract(packageJson: unknown, testCase: GeneratedSmokeCase, prefix: string) {
  assertGeneratedPackageProjectContract(packageJson, testCase, prefix)
  assert.ok(isRecord(packageJson) && isRecord(packageJson.scripts), `[${prefix}] ${testCase.preset} package.json must include scripts`)
  assert.equal(
    packageJson.scripts.lint,
    'eslint',
    `[${prefix}] ${testCase.preset} must include a lint script for the lint-enabled full preset`,
  )
}

export async function assertGeneratedProjectPackage(generatedDir: string, testCase: GeneratedSmokeLogCase, prefix: string) {
  const packageJsonPath = path.join(generatedDir, 'package.json')
  const inputName = generatedSmokeInputName(testCase)

  try {
    await access(generatedDir)
    await access(packageJsonPath)
  }
  catch (error) {
    throw new Error(
      `[${prefix}] ${inputName} generated project must include package.json at ${packageJsonPath}`,
      { cause: error },
    )
  }

  const rawPackageJson = await readFile(packageJsonPath, 'utf8')
  const packageJson = JSON.parse(rawPackageJson) as unknown
  assertGeneratedPackageProjectContract(packageJson, testCase, prefix)

  return packageJson
}

export async function assertGeneratedLintProject(generatedDir: string, testCase: GeneratedSmokeCase, prefix: string) {
  const eslintConfigPath = path.join(generatedDir, 'eslint.config.mjs')
  const packageJson = await assertGeneratedProjectPackage(generatedDir, testCase, prefix)

  try {
    await access(eslintConfigPath)
  }
  catch (error) {
    throw new Error(
      `[${prefix}] ${testCase.preset} must include eslint.config.mjs for the lint-enabled full preset at ${eslintConfigPath}`,
      { cause: error },
    )
  }

  assertGeneratedPackageLintContract(packageJson, testCase, prefix)
}

export function assertGeneratedNodePackageContract(packageJson: unknown, testCase: GeneratedSmokeCase, prefix: string) {
  assertGeneratedPackageProjectContract(packageJson, testCase, prefix)
  assert.ok(isRecord(packageJson), `[${prefix}] ${testCase.preset} package.json must be an object`)
  assert.equal(packageJson.type, 'module', `[${prefix}] ${testCase.preset} package.json must be ESM`)
  assert.equal(packageJson.main, 'dist/index.js', `[${prefix}] ${testCase.preset} package.json must document dist/index.js as main`)
  assert.equal(packageJson.types, 'dist/index.d.ts', `[${prefix}] ${testCase.preset} package.json must document dist/index.d.ts as types`)
  assert.ok(isRecord(packageJson.scripts), `[${prefix}] ${testCase.preset} package.json must include scripts`)
  assert.equal(packageJson.scripts.build, 'tsdown --config tsdown.config.ts', `[${prefix}] ${testCase.preset} must build with tsdown`)
}

export function assertGeneratedCliPackageContract(packageJson: unknown, testCase: GeneratedSmokeCase, prefix: string) {
  assertGeneratedPackageProjectContract(packageJson, testCase, prefix)
  assert.ok(isRecord(packageJson), `[${prefix}] ${testCase.preset} package.json must be an object`)
  assert.equal(packageJson.type, 'module', `[${prefix}] ${testCase.preset} package.json must be ESM`)
  assert.equal(packageJson.main, 'dist/index.js', `[${prefix}] ${testCase.preset} package.json must document dist/index.js as main`)
  assert.ok(isRecord(packageJson.bin), `[${prefix}] ${testCase.preset} package.json must include npm bin metadata`)
  assert.equal(packageJson.bin[testCase.projectName], 'dist/index.js', `[${prefix}] ${testCase.preset} bin must point at dist/index.js`)
  assert.ok(isRecord(packageJson.scripts), `[${prefix}] ${testCase.preset} package.json must include scripts`)
  assert.equal(
    packageJson.scripts.build,
    'tsdown --config tsdown.config.ts && node scripts/ensure-shebang.mjs',
    `[${prefix}] ${testCase.preset} build must preserve a shebang after tsdown`,
  )
  assert.equal(packageJson.scripts['smoke:bin'], 'pnpm build && dist/index.js --help', `[${prefix}] ${testCase.preset} must include a bin smoke script`)
}

export function assertGeneratedEffectCliPackageContract(packageJson: unknown, testCase: GeneratedSmokeCase, prefix: string) {
  assertGeneratedCliPackageContract(packageJson, testCase, prefix)
  assert.ok(isRecord(packageJson), `[${prefix}] ${testCase.preset} package.json must be an object`)
  const dependencies = packageJson.dependencies
  assert.ok(isRecord(dependencies), `[${prefix}] ${testCase.preset} package.json must include runtime dependencies`)
  assert.equal(dependencies['@effect/cli'], '^0.75.1', `[${prefix}] ${testCase.preset} must depend on @effect/cli at runtime`)
  assert.equal(dependencies['@effect/platform'], '^0.96.1', `[${prefix}] ${testCase.preset} must depend on @effect/platform at runtime`)
  assert.equal(dependencies['@effect/platform-node'], '^0.106.0', `[${prefix}] ${testCase.preset} must depend on @effect/platform-node at runtime`)
  assert.equal(dependencies['@effect/printer'], '^0.49.0', `[${prefix}] ${testCase.preset} must depend on @effect/printer at runtime`)
  assert.equal(dependencies['@effect/printer-ansi'], '^0.49.0', `[${prefix}] ${testCase.preset} must depend on @effect/printer-ansi at runtime`)
  assert.equal(dependencies.effect, '^3.21.2', `[${prefix}] ${testCase.preset} must depend on effect at runtime`)
}

export async function assertGeneratedExecutableBin(generatedDir: string, testCase: GeneratedSmokeCase, prefix: string) {
  const binPath = path.join(generatedDir, 'dist/index.js')

  try {
    await access(binPath, constants.X_OK)
  }
  catch (error) {
    throw new Error(
      `[${prefix}] ${testCase.preset} generated bin must be executable at ${binPath}`,
      { cause: error },
    )
  }

  const content = await readFile(binPath, 'utf8')
  assert.ok(content.startsWith('#!/usr/bin/env node\n'), `[${prefix}] ${testCase.preset} generated bin must preserve a node shebang`)

  return binPath
}
