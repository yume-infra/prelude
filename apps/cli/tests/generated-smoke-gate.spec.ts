import type { GeneratedSmokeCase, GeneratedSpecSmokeCase } from './support/generated-smoke-gate'
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assertGeneratedCliPackageContract,
  assertGeneratedEffectCliPackageContract,
  assertGeneratedExecutableBin,
  assertGeneratedLintProject,
  assertGeneratedNodePackageContract,
  assertGeneratedPackageLintContract,
  assertGeneratedProjectPackage,
  defaultGeneratedSmokeConcurrency,
  formatGeneratedSmokeError,
  generatedLintArgs,
  parseGeneratedSmokeConcurrency,
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

const nodeMinimalCase = {
  label: 'node minimal preset',
  preset: 'node-minimal',
  projectName: 'smoke-node-minimal',
} satisfies GeneratedSmokeCase

const cliMinimalCase = {
  label: 'cli minimal preset',
  preset: 'cli-minimal',
  projectName: 'smoke-cli-minimal',
} satisfies GeneratedSmokeCase

const cliEffectCase = {
  label: 'cli effect preset',
  preset: 'cli-effect',
  projectName: 'smoke-cli-effect',
} satisfies GeneratedSmokeCase

const workspaceSpecCase = {
  label: 'workspace spec',
  specLabel: 'workspace spec',
  projectName: 'smoke-workspace-spec',
} satisfies GeneratedSpecSmokeCase

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
    expect(shouldRunLintForPreset('standalone-backend-full'), 'standalone-backend-full must run generated lint').toBe(true)
    expect(shouldRunLintForPreset('standalone-cli-full'), 'standalone-cli-full must run generated lint').toBe(true)
    expect(shouldRunLintForPreset('workspace-cli-library'), 'workspace-cli-library must run generated lint at the workspace root').toBe(true)
    expect(shouldRunLintForPreset('workspace-fullstack-react'), 'workspace-fullstack-react must run generated lint at the workspace root').toBe(true)
    expect(shouldRunLintForPreset('workspace-fullstack-vue'), 'workspace-fullstack-vue must run generated lint at the workspace root').toBe(true)
    expect(shouldRunLintForPreset('react-minimal'), 'react-minimal is intentionally build-only').toBe(false)
    expect(shouldRunLintForPreset('vue-minimal'), 'vue-minimal is intentionally build-only').toBe(false)
    expect(shouldRunLintForPreset('node-minimal'), 'node-minimal is intentionally build-only').toBe(false)
    expect(shouldRunLintForPreset('cli-minimal'), 'cli-minimal is intentionally build-only').toBe(false)
    expect(shouldRunLintForPreset('cli-effect'), 'cli-effect is intentionally build-only').toBe(false)
    expect(shouldRunLintForPreset('standalone-library-minimal'), 'standalone-library-minimal is intentionally build-only').toBe(false)
    expect(shouldRunLintForPreset('standalone-library-node'), 'standalone-library-node is intentionally build-only').toBe(false)
  })

  it('locks generated-project lint invocation to zero warnings', () => {
    expect(generatedLintArgs).toEqual(['lint', '--max-warnings=0'])
  })

  it('parses generated smoke concurrency from an optional positive integer env var', () => {
    expect(parseGeneratedSmokeConcurrency(undefined, 'CREATE_YUME_SMOKE_CONCURRENCY')).toBe(defaultGeneratedSmokeConcurrency)
    expect(parseGeneratedSmokeConcurrency('', 'CREATE_YUME_SMOKE_CONCURRENCY')).toBe(defaultGeneratedSmokeConcurrency)
    expect(parseGeneratedSmokeConcurrency(' 3 ', 'CREATE_YUME_SMOKE_CONCURRENCY')).toBe(3)
  })

  it('rejects malformed generated smoke concurrency values', () => {
    expect(() => parseGeneratedSmokeConcurrency('0', 'CREATE_YUME_SMOKE_CONCURRENCY')).toThrow('positive integer')
    expect(() => parseGeneratedSmokeConcurrency('-1', 'CREATE_YUME_SMOKE_CONCURRENCY')).toThrow('positive integer')
    expect(() => parseGeneratedSmokeConcurrency('1.5', 'CREATE_YUME_SMOKE_CONCURRENCY')).toThrow('positive integer')
    expect(() => parseGeneratedSmokeConcurrency('fast', 'CREATE_YUME_SMOKE_CONCURRENCY')).toThrow('positive integer')
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
      prefix: 'generated-smoke',
      testCase: reactFullCase,
      phase: 'build',
      cwd: '/tmp/generated/react-full',
      command: 'pnpm',
      args: ['build'],
      error: 'unexpected failure shape',
    })

    expect(error.message).toContain('[generated-smoke] react-full build failed')
    expect(error.message).toContain('exitCode: unknown')
    expect(error.message).toContain('timedOut: false')
  })

  it('formats spec-driven smoke diagnostics without modeling specs as presets', () => {
    const error = formatGeneratedSmokeError({
      prefix: 'generated-smoke',
      testCase: workspaceSpecCase,
      phase: 'generation',
      cwd: '/tmp/generated/workspace',
      command: 'node',
      args: ['dist/index.js', '--spec', '{"shape":"workspace"}'],
      error: { exitCode: 1 },
    })

    expect(error.message).toContain('[generated-smoke] workspace spec generation failed')
    expect(error.message).toContain('label: workspace spec')
    expect(error.message).toContain('project: smoke-workspace-spec')
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

  it('accepts generated node package contracts', () => {
    expect(() => assertGeneratedNodePackageContract({
      name: 'smoke-node-minimal',
      type: 'module',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsdown --config tsdown.config.ts',
      },
    }, nodeMinimalCase, 'generated-smoke')).not.toThrow()
  })

  it('accepts generated cli package contracts and executable bins', async () => {
    expect(() => assertGeneratedCliPackageContract({
      name: 'smoke-cli-minimal',
      type: 'module',
      main: 'dist/index.js',
      bin: {
        'smoke-cli-minimal': 'dist/index.js',
      },
      scripts: {
        'build': 'tsdown --config tsdown.config.ts && node scripts/ensure-shebang.mjs',
        'smoke:bin': 'pnpm build && dist/index.js --help',
      },
    }, cliMinimalCase, 'generated-smoke')).not.toThrow()

    await withTempProject(async (dir) => {
      await mkdir(path.join(dir, 'dist'))
      const binPath = path.join(dir, 'dist/index.js')
      await writeFile(binPath, '#!/usr/bin/env node\nconsole.log("ok")\n', 'utf8')
      await chmod(binPath, 0o755)

      await expect(assertGeneratedExecutableBin(dir, cliMinimalCase, 'generated-smoke')).resolves.toBe(binPath)
    })
  })

  it('accepts generated effect cli package contracts', () => {
    expect(() => assertGeneratedEffectCliPackageContract({
      name: 'smoke-cli-effect',
      type: 'module',
      main: 'dist/index.js',
      bin: {
        'smoke-cli-effect': 'dist/index.js',
      },
      scripts: {
        'build': 'tsdown --config tsdown.config.ts && node scripts/ensure-shebang.mjs',
        'smoke:bin': 'pnpm build && dist/index.js --help',
      },
      dependencies: {
        '@effect/cli': '^0.75.1',
        '@effect/platform': '^0.96.0',
        '@effect/platform-node': '^0.106.0',
        '@effect/printer': '^0.49.0',
        '@effect/printer-ansi': '^0.49.0',
        'effect': '^3.21.1',
      },
    }, cliEffectCase, 'generated-smoke')).not.toThrow()
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
