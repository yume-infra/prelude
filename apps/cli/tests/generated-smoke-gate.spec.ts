import type { GeneratedSmokeCase } from './support/generated-smoke-gate'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertGeneratedLintProject,
  assertGeneratedPackageLintContract,
  assertGeneratedProjectPackage,
  formatGeneratedSmokeError,
  generatedLintArgs,
  shouldRunLintForPreset,
} from './support/generated-smoke-gate'

const reactFullCase = {
  label: 'react full preset',
  preset: 'react-full',
  projectName: 'lint-strategy-react-full',
} satisfies GeneratedSmokeCase

const reactMinimalCase = {
  label: 'react minimal preset',
  preset: 'react-minimal',
  projectName: 'smoke-react-minimal',
} satisfies GeneratedSmokeCase

async function withTempProject(run: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(tmpdir(), 'create-yume-smoke-gate-spec-'))

  try {
    await run(dir)
  }
  finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe('generated smoke gate contract', () => {
  it('keeps full presets lint-enabled and minimal presets build-only', () => {
    expect(shouldRunLintForPreset('react-full'), 'react-full must run generated lint').toBe(true)
    expect(shouldRunLintForPreset('vue-full'), 'vue-full must run generated lint').toBe(true)
    expect(shouldRunLintForPreset('react-minimal'), 'react-minimal is intentionally build-only').toBe(false)
    expect(shouldRunLintForPreset('vue-minimal'), 'vue-minimal is intentionally build-only').toBe(false)
  })

  it('locks generated-project lint invocation to zero warnings', () => {
    expect(generatedLintArgs).toEqual(['lint', '--max-warnings=0'])
  })

  it('formats phase errors with local command diagnostics and no environment dump', () => {
    const error = formatGeneratedSmokeError({
      prefix: 'generated-smoke',
      testCase: reactFullCase,
      phase: 'lint',
      cwd: '/tmp/generated/react-full',
      command: 'pnpm',
      args: generatedLintArgs,
      error: { exitCode: 2, timedOut: true, env: { SECRET_TOKEN: 'must-not-leak' } },
    })

    expect(error.message).toContain('[generated-smoke] react-full lint failed')
    expect(error.message).toContain('label: react full preset')
    expect(error.message).toContain('project: lint-strategy-react-full')
    expect(error.message).toContain('cwd: /tmp/generated/react-full')
    expect(error.message).toContain('command: pnpm lint --max-warnings=0')
    expect(error.message).toContain('exitCode: 2')
    expect(error.message).toContain('timedOut: true')
    expect(error.message).not.toContain('SECRET_TOKEN')
    expect(error.message).not.toContain('env:')
  })

  it('formats malformed command errors without crashing', () => {
    const error = formatGeneratedSmokeError({
      prefix: 'linked-smoke',
      testCase: reactFullCase,
      phase: 'build',
      cwd: '/tmp/generated/react-full',
      command: 'pnpm',
      args: ['build'],
      error: 'unexpected failure shape',
    })

    expect(error.message).toContain('[linked-smoke] react-full build failed')
    expect(error.message).toContain('exitCode: unknown')
    expect(error.message).toContain('timedOut: false')
  })

  it('accepts generated minimal package manifests without requiring lint assets', async () => {
    await withTempProject(async (dir) => {
      await writeFile(path.join(dir, 'package.json'), JSON.stringify({
        name: 'smoke-react-minimal',
        scripts: {
          build: 'tsc -b && vite build',
        },
      }), 'utf8')

      await expect(assertGeneratedProjectPackage(dir, reactMinimalCase, 'generated-smoke')).resolves.toMatchObject({
        name: 'smoke-react-minimal',
      })
    })
  })

  it('rejects generated projects without package manifests', async () => {
    await withTempProject(async (dir) => {
      await expect(assertGeneratedProjectPackage(path.join(dir, 'missing-project'), reactFullCase, 'generated-smoke')).rejects.toThrow(
        '[generated-smoke] react-full generated project must include package.json',
      )
    })
  })

  it('accepts valid lint-enabled generated package contracts', () => {
    expect(() => assertGeneratedPackageLintContract({
      name: 'lint-strategy-react-full',
      scripts: {
        lint: 'eslint',
      },
    }, reactFullCase, 'generated-smoke')).not.toThrow()
  })

  it('rejects malformed package JSON for lint-enabled generated projects', () => {
    expect(
      () => assertGeneratedPackageLintContract(null, reactFullCase, 'generated-smoke'),
      'package JSON must be object-shaped',
    ).toThrow('[generated-smoke] react-full package.json must be an object')

    expect(
      () => assertGeneratedPackageLintContract({ name: 'wrong-name', scripts: { lint: 'eslint' } }, reactFullCase, 'generated-smoke'),
      'generated package name must match the requested project name',
    ).toThrow('[generated-smoke] react-full package.json must use the generated project name')

    expect(
      () => assertGeneratedPackageLintContract({ name: 'lint-strategy-react-full', scripts: {} }, reactFullCase, 'generated-smoke'),
      'full presets must expose their lint script',
    ).toThrow('[generated-smoke] react-full must include a lint script for the lint-enabled full preset')
  })

  it('rejects lint-enabled generated projects without eslint config', async () => {
    await withTempProject(async (dir) => {
      await writeFile(path.join(dir, 'package.json'), JSON.stringify({
        name: 'lint-strategy-react-full',
        scripts: {
          lint: 'eslint',
        },
      }), 'utf8')

      await expect(assertGeneratedLintProject(dir, reactFullCase, 'generated-smoke')).rejects.toThrow('eslint.config.mjs')
    })
  })
})
