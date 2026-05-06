import type { GeneratedSmokeCase } from './support/generated-smoke-gate'
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertGeneratedCliPackageContract,
  assertGeneratedEffectCliPackageContract,
  assertGeneratedExecutableBin,
  assertGeneratedLintProject,
  assertGeneratedNodePackageContract,
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
  {
    label: 'node minimal preset',
    preset: 'node-minimal',
    projectName: 'smoke-node-minimal',
  },
  {
    label: 'cli minimal preset',
    preset: 'cli-minimal',
    projectName: 'smoke-cli-minimal',
  },
  {
    label: 'cli effect preset',
    preset: 'cli-effect',
    projectName: 'smoke-cli-effect',
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
  const packageJson = await assertGeneratedProjectPackage(generatedDir, testCase, smokePrefix)

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

  if (testCase.preset === 'node-minimal') {
    assertGeneratedNodePackageContract(packageJson, testCase, smokePrefix)
    const invocation = await runGeneratedSmokePhase({
      prefix: smokePrefix,
      testCase,
      phase: 'invoke',
      cwd: generatedDir,
      command: 'node',
      args: ['dist/index.js', 'create-yume'],
      stdio: 'pipe',
    })
    if (!(invocation.stdout ?? '').includes('Hello, create-yume!')) {
      throw new Error(`[${smokePrefix}] ${testCase.preset} node invocation did not print the expected greeting`)
    }
  }

  if (testCase.preset === 'cli-minimal' || testCase.preset === 'cli-effect') {
    assertGeneratedCliPackageContract(packageJson, testCase, smokePrefix)
    if (testCase.preset === 'cli-effect') {
      assertGeneratedEffectCliPackageContract(packageJson, testCase, smokePrefix)
    }
    const binPath = await assertGeneratedExecutableBin(generatedDir, testCase, smokePrefix)
    const invocation = await runGeneratedSmokePhase({
      prefix: smokePrefix,
      testCase,
      phase: 'invoke',
      cwd: generatedDir,
      command: binPath,
      args: ['--help'],
      stdio: 'pipe',
    })
    const output = `${invocation.stdout ?? ''}\n${invocation.stderr ?? ''}`
    if (!output.includes(testCase.projectName)) {
      throw new Error(`[${smokePrefix}] ${testCase.preset} bin invocation did not print usage`)
    }
  }

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
