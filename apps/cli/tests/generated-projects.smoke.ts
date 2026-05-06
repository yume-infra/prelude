import type { GeneratedSmokeCase, GeneratedSpecSmokeCase } from './support/generated-smoke-gate'
import assert from 'node:assert/strict'
import { constants } from 'node:fs'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
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

type WorkspacePackageKind = 'frontend-app' | 'backend-app' | 'cli-tool' | 'library-package' | 'worker-app'

type WorkspaceDependencyTarget
  = | {
    readonly by: 'id'
    readonly id: string
  }
  | {
    readonly by: 'name'
    readonly name: string
  }

interface WorkspaceInternalDependencySpec {
  readonly target: WorkspaceDependencyTarget
  readonly alias?: string
}

interface WorkspacePackageSpec {
  readonly id: string
  readonly name: string
  readonly kind: WorkspacePackageKind
  readonly internalDependencies?: readonly WorkspaceInternalDependencySpec[]
  readonly [key: string]: unknown
}

interface WorkspaceSmokeSpec {
  readonly shape: 'workspace'
  readonly packages: readonly WorkspacePackageSpec[]
}

interface GeneratedWorkspaceSmokeCase extends GeneratedSpecSmokeCase {
  readonly spec: WorkspaceSmokeSpec
}

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
    label: 'standalone backend full preset',
    preset: 'standalone-backend-full',
    projectName: 'smoke-backend-full',
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
  {
    label: 'standalone cli full preset',
    preset: 'standalone-cli-full',
    projectName: 'smoke-cli-full',
  },
  {
    label: 'standalone library minimal preset',
    preset: 'standalone-library-minimal',
    projectName: 'smoke-library-minimal',
  },
  {
    label: 'standalone library node preset',
    preset: 'standalone-library-node',
    projectName: 'smoke-library-node',
  },
]

const workspaceSmokeCases: readonly GeneratedWorkspaceSmokeCase[] = [
  {
    label: 'workspace react backend and shared library',
    specLabel: 'workspace spec',
    projectName: 'smoke-workspace-react-api-shared',
    spec: {
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
          id: 'api',
          name: '@smoke/api',
          kind: 'backend-app',
          backend: {
            framework: 'none',
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
    },
  },
  {
    label: 'workspace with multiple CLI tools',
    specLabel: 'workspace spec',
    projectName: 'smoke-workspace-multiple-cli',
    spec: {
      shape: 'workspace',
      packages: [
        {
          id: 'admin',
          name: '@smoke/admin',
          kind: 'cli-tool',
          cli: {
            toolkit: 'none',
          },
        },
        {
          id: 'ops',
          name: '@smoke/ops',
          kind: 'cli-tool',
          cli: {
            toolkit: 'none',
          },
        },
      ],
    },
  },
  {
    label: 'workspace frontend CLI and shared library with explicit links',
    specLabel: 'workspace spec',
    projectName: 'smoke-workspace-web-tool-shared',
    spec: {
      shape: 'workspace',
      packages: [
        {
          id: 'dashboard',
          name: '@smoke/dashboard',
          kind: 'frontend-app',
          frontend: {
            framework: 'vue',
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
    },
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

async function readGeneratedJson(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8')) as unknown
}

function workspacePackageTargetDirectory(packageSpec: WorkspacePackageSpec) {
  if (packageSpec.kind === 'library-package') {
    return `libs/${packageSpec.id}`
  }

  return `apps/${packageSpec.id}`
}

function workspacePackageBinName(packageSpec: WorkspacePackageSpec) {
  return packageSpec.name.split('/').at(-1) ?? packageSpec.id
}

function workspacePackageBuildArtifacts(packageSpec: WorkspacePackageSpec) {
  if (packageSpec.kind === 'frontend-app') {
    return ['dist/index.html'] as const
  }

  return ['dist/index.js', 'dist/index.d.ts'] as const
}

function findWorkspacePackage(packageSpecs: readonly WorkspacePackageSpec[], dependencyTarget: WorkspaceDependencyTarget) {
  const packageSpec = packageSpecs.find((candidate) => {
    if (dependencyTarget.by === 'id') {
      return candidate.id === dependencyTarget.id
    }

    return candidate.name === dependencyTarget.name
  })

  assert.ok(packageSpec, `[${smokePrefix}] workspace dependency target must resolve: ${JSON.stringify(dependencyTarget)}`)

  return packageSpec
}

function workspaceDependencyPackageName(
  dependencySpec: WorkspaceInternalDependencySpec,
  packageSpecs: readonly WorkspacePackageSpec[],
) {
  if (dependencySpec.alias !== undefined) {
    return dependencySpec.alias
  }

  if (dependencySpec.target.by === 'name') {
    return dependencySpec.target.name
  }

  return findWorkspacePackage(packageSpecs, dependencySpec.target).name
}

function expectedWorkspaceDependencyEntries(
  packageSpec: WorkspacePackageSpec,
  packageSpecs: readonly WorkspacePackageSpec[],
) {
  const entries: Record<string, string> = {}

  for (const dependencySpec of packageSpec.internalDependencies ?? []) {
    entries[workspaceDependencyPackageName(dependencySpec, packageSpecs)] = 'workspace:*'
  }

  return entries
}

function actualWorkspaceDependencyEntries(packageJson: Record<string, unknown>) {
  const dependencies = isRecord(packageJson.dependencies) ? packageJson.dependencies : {}
  const entries: Record<string, string> = {}

  for (const [dependencyName, dependencyRange] of Object.entries(dependencies)) {
    if (dependencyRange === 'workspace:*') {
      entries[dependencyName] = dependencyRange
    }
  }

  return entries
}

function assertPackageDependencyEntries(
  packageJson: unknown,
  testCase: GeneratedWorkspaceSmokeCase,
  packageSpec: WorkspacePackageSpec,
) {
  const targetDirectory = workspacePackageTargetDirectory(packageSpec)
  const expectedEntries = expectedWorkspaceDependencyEntries(packageSpec, testCase.spec.packages)

  assert.ok(isRecord(packageJson), `[${smokePrefix}] ${testCase.label} ${targetDirectory}/package.json must be an object`)
  assert.deepEqual(
    actualWorkspaceDependencyEntries(packageJson),
    expectedEntries,
    `[${smokePrefix}] ${testCase.label} ${targetDirectory} must include exactly the declared workspace:* dependencies`,
  )
}

function assertPackageBuildScript(
  packageJson: unknown,
  testCase: GeneratedWorkspaceSmokeCase,
  packageSpec: WorkspacePackageSpec,
) {
  const targetDirectory = workspacePackageTargetDirectory(packageSpec)

  assert.ok(isRecord(packageJson), `[${smokePrefix}] ${testCase.label} ${targetDirectory}/package.json must be an object`)
  assert.ok(isRecord(packageJson.scripts), `[${smokePrefix}] ${testCase.label} ${targetDirectory} must include scripts`)
  assert.equal(
    typeof packageJson.scripts.build,
    'string',
    `[${smokePrefix}] ${testCase.label} ${targetDirectory} must include a build script`,
  )
}

async function assertPackageBuildArtifacts(
  generatedDir: string,
  testCase: GeneratedWorkspaceSmokeCase,
  packageSpec: WorkspacePackageSpec,
) {
  const targetDirectory = workspacePackageTargetDirectory(packageSpec)

  for (const artifact of workspacePackageBuildArtifacts(packageSpec)) {
    const artifactPath = path.join(generatedDir, targetDirectory, artifact)

    try {
      await access(artifactPath)
    }
    catch (error) {
      throw new Error(
        `[${smokePrefix}] ${testCase.label} ${targetDirectory} must build ${artifact}`,
        { cause: error },
      )
    }
  }
}

async function assertWorkspacePackage(
  generatedDir: string,
  testCase: GeneratedWorkspaceSmokeCase,
  packageSpec: WorkspacePackageSpec,
) {
  const targetDirectory = workspacePackageTargetDirectory(packageSpec)
  const packageJsonPath = path.join(generatedDir, targetDirectory, 'package.json')
  const packageJson = await readGeneratedJson(packageJsonPath)

  assert.ok(isRecord(packageJson), `[${smokePrefix}] ${testCase.label} ${targetDirectory}/package.json must be an object`)
  assert.equal(
    packageJson.name,
    packageSpec.name,
    `[${smokePrefix}] ${testCase.label} ${targetDirectory} must preserve package spec name`,
  )
  assertPackageDependencyEntries(packageJson, testCase, packageSpec)
  assertPackageBuildScript(packageJson, testCase, packageSpec)
  await assertPackageBuildArtifacts(generatedDir, testCase, packageSpec)

  if (packageSpec.kind !== 'cli-tool') {
    return packageJson
  }

  const cliBin = workspacePackageBinName(packageSpec)

  assert.ok(isRecord(packageJson.bin), `[${smokePrefix}] ${testCase.label} ${targetDirectory} must include npm bin metadata`)
  assert.equal(
    packageJson.bin[cliBin],
    'dist/index.js',
    `[${smokePrefix}] ${testCase.label} ${targetDirectory} bin must point at dist/index.js`,
  )

  const binPath = path.join(generatedDir, targetDirectory, 'dist/index.js')
  await access(binPath, constants.X_OK)
  const content = await readFile(binPath, 'utf8')
  assert.ok(content.startsWith('#!/usr/bin/env node\n'), `[${smokePrefix}] ${testCase.label} ${targetDirectory} bin must preserve shebang`)

  const invocation = await runGeneratedSmokePhase({
    prefix: smokePrefix,
    testCase,
    phase: 'invoke',
    cwd: path.join(generatedDir, targetDirectory),
    command: binPath,
    args: ['--help'],
    stdio: 'pipe',
  })

  assert.ok(
    (invocation.stdout ?? '').includes(`Usage:\n  ${cliBin} [--name <name>]`),
    `[${smokePrefix}] ${testCase.label} ${targetDirectory} bin invocation must print usage`,
  )

  return packageJson
}

async function assertWorkspaceRootMaterialization(
  generatedDir: string,
  testCase: GeneratedWorkspaceSmokeCase,
) {
  await access(path.join(generatedDir, 'turbo.json'))
  const workspaceFilePath = path.join(generatedDir, 'pnpm-workspace.yaml')
  const workspaceFile = await readFile(workspaceFilePath, 'utf8')

  assert.ok(workspaceFile.includes('apps/*'), `[${smokePrefix}] ${testCase.label} pnpm-workspace.yaml must include apps/*`)
  assert.ok(workspaceFile.includes('libs/*'), `[${smokePrefix}] ${testCase.label} pnpm-workspace.yaml must include libs/*`)
}

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

  if (testCase.preset === 'node-minimal' || testCase.preset === 'standalone-backend-full') {
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

  if (testCase.preset === 'cli-minimal' || testCase.preset === 'cli-effect' || testCase.preset === 'standalone-cli-full') {
    assertGeneratedCliPackageContract(packageJson, testCase, smokePrefix)
    if (testCase.preset === 'cli-effect' || testCase.preset === 'standalone-cli-full') {
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

  if (testCase.preset === 'standalone-library-minimal' || testCase.preset === 'standalone-library-node') {
    assertGeneratedNodePackageContract(packageJson, testCase, smokePrefix)
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

async function runWorkspaceSmokeCase(rootDir: string, testCase: GeneratedWorkspaceSmokeCase) {
  const generatedDir = path.join(rootDir, testCase.projectName)

  const generation = await runGeneratedSmokePhase({
    prefix: smokePrefix,
    testCase,
    phase: 'generation',
    cwd: rootDir,
    command: 'node',
    args: [
      cliDistPath,
      '--spec',
      JSON.stringify(testCase.spec),
      '--name',
      testCase.projectName,
      '--no-input',
      '--no-install',
      '--no-git',
    ],
    stdio: 'pipe',
  })

  assertNonInteractiveGeneration(`${generation.stdout}\n${generation.stderr}`, testCase, smokePrefix)
  const rootPackageJson = await assertGeneratedProjectPackage(generatedDir, testCase, smokePrefix)

  assert.ok(isRecord(rootPackageJson), `[${smokePrefix}] ${testCase.label} root package.json must be an object`)
  assert.equal(rootPackageJson.private, true, `[${smokePrefix}] ${testCase.label} root package.json must be private`)
  await assertWorkspaceRootMaterialization(generatedDir, testCase)

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

  for (const packageSpec of testCase.spec.packages) {
    await assertWorkspacePackage(generatedDir, testCase, packageSpec)
  }
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
    for (const testCase of workspaceSmokeCases) {
      await runWorkspaceSmokeCase(rootDir, testCase)
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
