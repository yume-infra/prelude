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
  it('documents canonical spec input and removed legacy shortcuts', () => {
    expect(HELP_TEXT).toContain('--dry-run')
    expect(HELP_TEXT).toContain('--spec <file-or-json>')
    expect(HELP_TEXT).toContain('--no-input')
    expect(HELP_TEXT).toContain('--print-spec')
    expect(HELP_TEXT).toContain('Complete canonical CreateSpec')
    expect(HELP_TEXT).toContain('Rejected on the canonical create route')
    expect(HELP_TEXT).toContain('--preset, --p')
    expect(HELP_TEXT).toContain('Removed; reusable shapes are complete CreateSpec files')
    expect(HELP_TEXT).not.toContain('standalone-react-full')
  })
})

describe('parseCliArgs', () => {
  it('rejects preset input before decoding old preset values', async () => {
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
      expect(result.left.message).toContain('--preset has been removed')
      expect(result.left.message).not.toContain('react-minimal')
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
      expect(result.left.message).toContain('complete canonical CreateSpec')
    }
  })

  it('rejects project names that would escape the target directory boundary', async () => {
    const result = await Effect.runPromise(
      Effect.either(parseCliArgs([
        '--spec',
        '{"topology":"single-package","package":{"id":"app","name":"demo","capabilities":["minimal-node-package"]},"rootCapabilities":[],"providers":[],"overrides":{}}',
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

  it('rejects preset input as removed even when spec input is present', async () => {
    const result = await Effect.runPromise(
      Effect.either(parseCliArgs([
        '--spec',
        '{"topology":"single-package","package":{"id":"app","name":"demo","capabilities":["minimal-node-package"]},"rootCapabilities":[],"providers":[],"overrides":{}}',
        '--preset',
        'workspace-root',
        '--name',
        'demo-workspace',
      ])),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('SchemaContractError')
      expect(result.left.message).toContain('--preset has been removed')
    }
  })
})
