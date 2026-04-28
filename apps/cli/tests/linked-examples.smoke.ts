import type { GeneratedSmokeCase } from './support/generated-smoke-gate'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertGeneratedLintProject,
  assertNonInteractiveGeneration,
  generatedLintArgs,
  generatedSmokeEnv,
  runGeneratedSmokePhase,
} from './support/generated-smoke-gate'

interface LinkedSmokeCase extends GeneratedSmokeCase {
  readonly preset: 'react-full' | 'vue-full'
  readonly cliArgs: readonly string[]
}

const smokePrefix = 'linked-smoke'
const testsDir = path.dirname(fileURLToPath(import.meta.url))
const cliRoot = path.resolve(testsDir, '..')
const repoRoot = path.resolve(cliRoot, '../..')
const generatedRoot = path.join(repoRoot, 'apps/examples/.generated')
const generatedWorkspace = path.join(generatedRoot, 'pnpm-workspace.yaml')
const generatedNpmrc = path.join(generatedRoot, '.npmrc')

const linkedCliCase = {
  label: 'linked create-yume package',
  preset: 'react-full',
  projectName: 'create-yume-linked-bin',
} satisfies GeneratedSmokeCase

const linkedSmokeCases: readonly LinkedSmokeCase[] = [
  {
    label: 'react full preset via linked bin with install and git bootstrap',
    preset: 'react-full',
    projectName: 'react-full-linked',
    cliArgs: ['--install'],
  },
  {
    label: 'vue full preset via linked bin with install and git bootstrap',
    preset: 'vue-full',
    projectName: 'vue-full-linked',
    cliArgs: ['--install'],
  },
]

async function prepareGeneratedRoot() {
  await rm(generatedRoot, { recursive: true, force: true })
  await mkdir(generatedRoot, { recursive: true })
  await writeFile(generatedWorkspace, 'packages:\n  - "*"\n', 'utf8')
  await writeFile(generatedNpmrc, 'frozen-lockfile=false\n', 'utf8')
}

async function linkCli() {
  const globalBinResult = await runGeneratedSmokePhase({
    prefix: smokePrefix,
    testCase: linkedCliCase,
    phase: 'link',
    cwd: repoRoot,
    command: 'pnpm',
    args: ['bin', '--global'],
    stdio: 'pipe',
  })
  const globalBin = globalBinResult.stdout.trim()

  await runGeneratedSmokePhase({
    prefix: smokePrefix,
    testCase: linkedCliCase,
    phase: 'link',
    cwd: cliRoot,
    command: 'pnpm',
    args: ['link', '--global'],
  })

  const linkedBin = await runGeneratedSmokePhase({
    prefix: smokePrefix,
    testCase: linkedCliCase,
    phase: 'link',
    cwd: repoRoot,
    command: 'create-yume',
    args: ['--version'],
    stdio: 'pipe',
    env: generatedSmokeEnv({ extraPath: globalBin }),
  })

  if (linkedBin.stdout.trim().length === 0) {
    throw new Error(`[${smokePrefix}] linked create-yume bin resolved but returned an empty version string`)
  }

  return {
    globalBin,
    async unlink() {
      await runGeneratedSmokePhase({
        prefix: smokePrefix,
        testCase: linkedCliCase,
        phase: 'link',
        cwd: repoRoot,
        command: 'pnpm',
        args: ['remove', '--global', 'create-yume'],
        env: generatedSmokeEnv({ extraPath: globalBin }),
      })
    },
  }
}

async function runLinkedSmokeCase(testCase: LinkedSmokeCase, globalBin: string) {
  const generatedDir = path.join(generatedRoot, testCase.projectName)

  const generation = await runGeneratedSmokePhase({
    prefix: smokePrefix,
    testCase,
    phase: 'generation',
    cwd: generatedRoot,
    command: 'create-yume',
    args: [
      '--preset',
      testCase.preset,
      '--name',
      testCase.projectName,
      ...testCase.cliArgs,
    ],
    stdio: 'pipe',
    env: generatedSmokeEnv({ extraPath: globalBin }),
  })

  assertNonInteractiveGeneration(`${generation.stdout}\n${generation.stderr}`, testCase, smokePrefix)
  await assertGeneratedLintProject(generatedDir, testCase, smokePrefix)

  await runGeneratedSmokePhase({
    prefix: smokePrefix,
    testCase,
    phase: 'build',
    cwd: generatedDir,
    command: 'pnpm',
    args: ['build'],
    env: generatedSmokeEnv({ extraPath: globalBin }),
  })

  await runGeneratedSmokePhase({
    prefix: smokePrefix,
    testCase,
    phase: 'lint',
    cwd: generatedDir,
    command: 'pnpm',
    args: generatedLintArgs,
    env: generatedSmokeEnv({ extraPath: globalBin }),
  })
}

async function main() {
  await prepareGeneratedRoot()

  const link = await linkCli()
  let smokeError: unknown
  let unlinkError: unknown
  let passed = false

  try {
    for (const testCase of linkedSmokeCases) {
      await runLinkedSmokeCase(testCase, link.globalBin)
    }
    passed = true
    console.log(`\n[${smokePrefix}] all linked example checks passed in ${generatedRoot}`)
  }
  catch (error) {
    smokeError = error
  }
  finally {
    try {
      await link.unlink()
    }
    catch (error) {
      unlinkError = error
      if (smokeError !== undefined) {
        console.error(`[${smokePrefix}] unlink cleanup failed after smoke failure; preserving original failure`)
        console.error(error)
      }
    }

    if (!passed) {
      console.error(`[${smokePrefix}] kept failed generated root for inspection: ${generatedRoot}`)
    }
  }

  if (smokeError !== undefined) {
    throw smokeError
  }

  if (unlinkError !== undefined) {
    throw unlinkError
  }
}

await main()
