import { Effect, Either } from 'effect'
import { describe, expect, it } from 'vitest'
import { parseCliArgs, parseRawCliArgs } from '../../src/core/cli-args'
import { HELP_TEXT } from '../../src/core/cli-help'

describe('parseRawCliArgs', () => {
  it('normalizes aliases and negated booleans for the non-interactive preset flow', () => {
    expect(parseRawCliArgs([
      '--preset',
      'react-full',
      '--name',
      'demo-app',
      '--no-install',
      '--no-git',
      '--no-rollback',
      '--dry-run',
      '-h',
    ])).toEqual({
      _: [],
      preset: 'react-full',
      name: 'demo-app',
      install: false,
      git: false,
      help: true,
      rollback: false,
      dryRun: true,
    })
  })

  it('normalizes the short preset alias', () => {
    expect(parseRawCliArgs([
      '--p',
      'vue-full',
      '--name',
      'demo-app',
    ])).toEqual({
      _: [],
      preset: 'vue-full',
      name: 'demo-app',
      rollback: true,
    })
  })
  it('normalizes the dry-run negated boolean', () => {
    expect(parseRawCliArgs([
      '--preset',
      'react-full',
      '--name',
      'demo-app',
      '--no-dry-run',
    ])).toEqual({
      _: [],
      preset: 'react-full',
      name: 'demo-app',
      rollback: true,
      dryRun: false,
    })
  })

  it('normalizes the workspace root preset flow', () => {
    expect(parseRawCliArgs([
      '--preset',
      'workspace-root',
      '--name',
      'demo-workspace',
      '--dry-run',
    ])).toEqual({
      _: [],
      preset: 'workspace-root',
      name: 'demo-workspace',
      rollback: true,
      dryRun: true,
    })
  })

  it('normalizes structured spec, no-input, and print-spec flags', () => {
    expect(parseRawCliArgs([
      '--spec',
      'prelude.json',
      '--name',
      'demo-workspace',
      '--no-input',
      '--print-spec',
    ])).toEqual({
      _: [],
      spec: 'prelude.json',
      name: 'demo-workspace',
      rollback: true,
      noInput: true,
      printSpec: true,
    })
  })
})

describe('hELP_TEXT', () => {
  it('documents the dry-run flag and safety promise', () => {
    expect(HELP_TEXT).toContain('--dry-run')
    expect(HELP_TEXT).toContain('standalone-react-full')
    expect(HELP_TEXT).toContain('standalone-backend-minimal')
    expect(HELP_TEXT).toContain('workspace-cli-library')
    expect(HELP_TEXT).toContain('workspace-fullstack-react')
    expect(HELP_TEXT).toContain('workspace-fullstack-vue')
    expect(HELP_TEXT).toContain('standalone-library-minimal')
    expect(HELP_TEXT).toContain('standalone-library-node')
    expect(HELP_TEXT).toContain('standalone-backend-full')
    expect(HELP_TEXT).toContain('standalone-cli-effect')
    expect(HELP_TEXT).toContain('standalone-cli-full')
    expect(HELP_TEXT).toContain('node-minimal')
    expect(HELP_TEXT).toContain('cli-minimal')
    expect(HELP_TEXT).toContain('cli-effect')
    expect(HELP_TEXT).toContain('--spec <file-or-json>')
    expect(HELP_TEXT).toContain('--no-input')
    expect(HELP_TEXT).toContain('--print-spec')
    expect(HELP_TEXT).toContain('without writing files or running commands')
    expect(HELP_TEXT).toContain('workspace-root')
  })
})

describe('parseCliArgs', () => {
  it('surfaces schema contract failures for unsupported preset values', async () => {
    const result = await Effect.runPromise(
      Effect.either(parseCliArgs([
        '--preset',
        'solid-app',
        '--name',
        'demo-app',
      ])),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('SchemaContractError')
      expect(result.left.message).toContain('CliArgs')
      expect(result.left.message).toContain('react-minimal')
    }
  })

  it('rejects removed yes aliases instead of silently accepting them', async () => {
    const result = await Effect.runPromise(
      Effect.either(parseCliArgs([
        '--preset',
        'react-full',
        '--name',
        'demo-app',
        '-y',
      ])),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('SchemaContractError')
      expect(result.left.message).toContain('--yes/-y has been removed')
      expect(result.left.message).toContain('--preset or --p')
    }
  })

  it('rejects project names that would escape the target directory boundary', async () => {
    const result = await Effect.runPromise(
      Effect.either(parseCliArgs([
        '--p',
        'react-full',
        '--name',
        '../outside',
      ])),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('SchemaContractError')
      expect(result.left.message).toContain('CliArgs')
      expect(result.left.message).toContain('name')
    }
  })

  it('rejects ambiguous spec and preset input', async () => {
    const result = await Effect.runPromise(
      Effect.either(parseCliArgs([
        '--spec',
        '{"shape":"workspace","packages":[]}',
        '--preset',
        'workspace-root',
        '--name',
        'demo-workspace',
      ])),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('SchemaContractError')
      expect(result.left.message).toContain('--spec and --preset are mutually exclusive')
    }
  })
})
