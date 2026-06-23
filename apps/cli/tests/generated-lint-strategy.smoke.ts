import type { GeneratedSmokeCase } from './support/generated-smoke-gate'
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertGeneratedLintProject,
  assertNonInteractiveGeneration,
  generatedLintArgs,
  runGeneratedSmokePhase,
} from './support/generated-smoke-gate'

interface LintStrategySmokeCase extends GeneratedSmokeCase {
  readonly preset: 'react-full' | 'vue-full'
}

const smokePrefix = 'lint-strategy-smoke'
const testsDir = path.dirname(fileURLToPath(import.meta.url))
const cliDistPath = path.resolve(testsDir, '../dist/index.js')

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

async function runSmokeCase(rootDir: string, testCase: LintStrategySmokeCase) {
  const generatedDir = path.join(rootDir, testCase.projectName)

  const generation = await runGeneratedSmokePhase({
    prefix: smokePrefix,
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

  assertNonInteractiveGeneration(`${generation.stdout}\n${generation.stderr}`, testCase, smokePrefix)
  await assertGeneratedLintProject(generatedDir, testCase, smokePrefix)

  await runGeneratedSmokePhase({
    prefix: smokePrefix,
    testCase,
    phase: 'install',
    cwd: generatedDir,
    command: 'pnpm',
    args: ['install', '--ignore-scripts'],
  })

  await runGeneratedSmokePhase({
    prefix: smokePrefix,
    testCase,
    phase: 'lint',
    cwd: generatedDir,
    command: 'pnpm',
    args: generatedLintArgs,
  })
}

async function assertBuiltCliAvailable() {
  try {
    await access(cliDistPath)
  }
  catch (error) {
    throw new Error(`[${smokePrefix}] Built CLI not found at ${cliDistPath}. Run pnpm --filter @sayoriqwq/prelude build before this smoke.`, { cause: error })
  }
}

async function main() {
  await assertBuiltCliAvailable()

  const rootDir = await mkdtemp(path.join(tmpdir(), 'prelude-lint-strategy-'))
  let passed = false

  try {
    for (const testCase of smokeCases) {
      await runSmokeCase(rootDir, testCase)
    }
    passed = true
    console.log(`[${smokePrefix}] all lint-enabled generated project checks passed in ${rootDir}`)
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

await main()
