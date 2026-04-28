import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { execa } from 'execa'

export type GeneratedPreset = 'react-minimal' | 'react-full' | 'vue-minimal' | 'vue-full'

export type GeneratedSmokePhase = 'generation' | 'install' | 'build' | 'lint' | 'link'

export interface GeneratedSmokeCase {
  readonly label: string
  readonly preset: GeneratedPreset
  readonly projectName: string
}

export interface GeneratedSmokeEnvOptions {
  readonly extraPath?: string
}

export interface RunGeneratedSmokePhaseOptions {
  readonly prefix: string
  readonly testCase: GeneratedSmokeCase
  readonly phase: GeneratedSmokePhase
  readonly cwd: string
  readonly command: string
  readonly args: readonly string[]
  readonly stdio?: 'inherit' | 'pipe'
  readonly timeoutMs?: number
  readonly env?: NodeJS.ProcessEnv
}

export const generatedSmokePhaseTimeoutMs = 300_000
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
  return preset === 'react-full' || preset === 'vue-full'
}

export function formatGeneratedCommand(command: string, args: readonly string[]) {
  return [command, ...args].join(' ')
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
  readonly testCase: GeneratedSmokeCase
  readonly phase: GeneratedSmokePhase
  readonly cwd: string
  readonly command: string
  readonly args: readonly string[]
  readonly error: unknown
}) {
  const exitCode = readErrorField(options.error, 'exitCode') ?? 'unknown'
  const timedOut = readErrorField(options.error, 'timedOut') ?? 'false'

  return new Error([
    `[${options.prefix}] ${options.testCase.preset} ${options.phase} failed`,
    `label: ${options.testCase.label}`,
    `project: ${options.testCase.projectName}`,
    `cwd: ${options.cwd}`,
    `command: ${formatGeneratedCommand(options.command, options.args)}`,
    `exitCode: ${exitCode}`,
    `timedOut: ${timedOut}`,
  ].join('\n'), { cause: options.error })
}

export async function runGeneratedSmokePhase(options: RunGeneratedSmokePhaseOptions) {
  console.log(
    `[${options.prefix}] ${options.testCase.preset} ${options.phase}: ${formatGeneratedCommand(options.command, options.args)} (cwd: ${options.cwd})`,
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

export function assertNonInteractiveGeneration(output: string, testCase: GeneratedSmokeCase, prefix: string) {
  assert.ok(
    !output.includes('?'),
    `[${prefix}] ${testCase.preset} generation must stay non-interactive and not print prompt questions`,
  )
  assert.ok(
    !output.toLowerCase().includes('choose a'),
    `[${prefix}] ${testCase.preset} generation must not ask selection prompts`,
  )
}

export function assertGeneratedPackageLintContract(packageJson: unknown, testCase: GeneratedSmokeCase, prefix: string) {
  assert.ok(isRecord(packageJson), `[${prefix}] ${testCase.preset} package.json must be an object`)
  assert.equal(
    packageJson.name,
    testCase.projectName,
    `[${prefix}] ${testCase.preset} package.json must use the generated project name`,
  )
  assert.ok(isRecord(packageJson.scripts), `[${prefix}] ${testCase.preset} package.json must include scripts`)
  assert.equal(
    packageJson.scripts.lint,
    'eslint',
    `[${prefix}] ${testCase.preset} must include a lint script for the lint-enabled full preset`,
  )
}

export async function assertGeneratedLintProject(generatedDir: string, testCase: GeneratedSmokeCase, prefix: string) {
  const packageJsonPath = path.join(generatedDir, 'package.json')
  const eslintConfigPath = path.join(generatedDir, 'eslint.config.mjs')

  await access(packageJsonPath)
  await access(eslintConfigPath)

  const rawPackageJson = await readFile(packageJsonPath, 'utf8')
  const packageJson = JSON.parse(rawPackageJson) as unknown
  assertGeneratedPackageLintContract(packageJson, testCase, prefix)
}
