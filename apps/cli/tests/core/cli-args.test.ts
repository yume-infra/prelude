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
})

describe('hELP_TEXT', () => {
  it('documents the dry-run flag and safety promise', () => {
    expect(HELP_TEXT).toContain('--dry-run')
    expect(HELP_TEXT).toContain('node-minimal')
    expect(HELP_TEXT).toContain('cli-minimal')
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
})
