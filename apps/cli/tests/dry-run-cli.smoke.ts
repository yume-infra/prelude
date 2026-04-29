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
const projectName = 'smoke-dry-run'

async function pathExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  }
  catch {
    return false
  }
}

function assertIncludes(output: string, expected: string) {
  if (!output.includes(expected)) {
    throw new Error(`[${smokePrefix}] expected output to include ${JSON.stringify(expected)}\nOutput:\n${output}`)
  }
}

async function assertBuiltCliAvailable() {
  if (!(await pathExists(cliDistPath))) {
    throw new Error(`[${smokePrefix}] Built CLI not found at ${cliDistPath}. Run pnpm --filter create-yume build before this smoke.`)
  }
}

async function main() {
  await assertBuiltCliAvailable()

  const rootDir = await mkdtemp(path.join(tmpdir(), 'create-yume-dry-run-'))
  const targetDir = path.join(rootDir, projectName)
  let passed = false

  try {
    console.log(`[${smokePrefix}] dry-run generation: node ${cliDistPath} --preset react-full --name ${projectName} --dry-run --install --git (cwd: ${rootDir})`)
    const result = await execFileAsync('node', [
      cliDistPath,
      '--preset',
      'react-full',
      '--name',
      projectName,
      '--dry-run',
      '--install',
      '--git',
    ], {
      cwd: rootDir,
      maxBuffer: 1024 * 1024 * 8,
      timeout: 30_000,
    })

    const output = `${result.stdout}\n${result.stderr}`
    assertIncludes(output, 'Dry run preview')
    assertIncludes(output, 'No files or directories will be written, and no commands will be executed.')
    assertIncludes(output, 'Post-generate command internal file effects are not fully shown.')
    assertIncludes(output, 'Planned files:')
    assertIncludes(output, '- json package.json')
    assertIncludes(output, 'owner: router, unit: json-text-mutation')
    assertIncludes(output, 'Post-generate commands:')
    assertIncludes(output, 'after-plan-apply: pnpm install')
    assertIncludes(output, 'after-plan-apply: git init')
    assertIncludes(output, 'after-plan-apply: pnpm exec husky init')
    assertIncludes(output, 'Post-generate file actions:')
    assertIncludes(output, 'after-post-generate-commands: write-file .husky/pre-commit (executable: false)')
    assertIncludes(output, 'after-post-generate-commands: write-file .husky/commit-msg (executable: true)')

    if (await pathExists(targetDir)) {
      throw new Error(`[${smokePrefix}] dry-run created target directory: ${targetDir}`)
    }

    passed = true
    console.log(`[${smokePrefix}] dry-run preview produced no target directory in ${rootDir}`)
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
