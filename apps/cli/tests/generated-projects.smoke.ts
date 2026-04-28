import type { GeneratedSmokeCase } from './support/generated-smoke-gate'
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertGeneratedLintProject,
  assertGeneratedProjectPackage,
  assertNonInteractiveGeneration,
  generatedLintArgs,
  runGeneratedSmokePhase,
  shouldRunLintForPreset,
} from './support/generated-smoke-gate'

const smokePrefix = 'generated-smoke'
const testsDir = path.dirname(fileURLToPath(import.meta.url))
const cliDistPath = path.resolve(testsDir, '../dist/index.js')

const smokeCases: readonly GeneratedSmokeCase[] = [
  {
    label: 'react minimal preset',
    preset: 'react-minimal',
    projectName: 'smoke-react-minimal',
  },
  {
    label: 'react full preset',
    preset: 'react-full',
    projectName: 'smoke-react-full',
  },
  {
    label: 'vue minimal preset',
    preset: 'vue-minimal',
    projectName: 'smoke-vue-minimal',
  },
  {
    label: 'vue full preset',
    preset: 'vue-full',
    projectName: 'smoke-vue-full',
  },
]

async function runSmokeCase(rootDir: string, testCase: GeneratedSmokeCase) {
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
  await assertGeneratedProjectPackage(generatedDir, testCase, smokePrefix)

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
    phase: 'build',
    cwd: generatedDir,
    command: 'pnpm',
    args: ['build'],
  })

  if (shouldRunLintForPreset(testCase.preset)) {
    await assertGeneratedLintProject(generatedDir, testCase, smokePrefix)
    await runGeneratedSmokePhase({
      prefix: smokePrefix,
      testCase,
      phase: 'lint',
      cwd: generatedDir,
      command: 'pnpm',
      args: generatedLintArgs,
    })
    return
  }

  console.log(
    `[${smokePrefix}] ${testCase.preset} lint skipped: preset policy disables generated lint for ${testCase.projectName}`,
  )
}

async function assertBuiltCliAvailable() {
  try {
    await access(cliDistPath)
  }
  catch (error) {
    throw new Error(`[${smokePrefix}] Built CLI not found at ${cliDistPath}. Run pnpm --filter create-yume build before this smoke.`, { cause: error })
  }
}

async function main() {
  await assertBuiltCliAvailable()

  const rootDir = await mkdtemp(path.join(tmpdir(), 'create-yume-smoke-'))
  let passed = false

  try {
    for (const testCase of smokeCases) {
      await runSmokeCase(rootDir, testCase)
    }
    passed = true
    console.log(`[${smokePrefix}] all generated project checks passed in ${rootDir}`)
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
