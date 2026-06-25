import { Effect, Either } from 'effect'
import { describe, expect, it } from 'vitest'
import { parseCliArgs, parseRawCliArgs } from '../../src/core/cli-args'
import { HELP_TEXT } from '../../src/core/cli-help'

describe('parseRawCliArgs', () => {
  it('normalizes canonical spec flags without old route defaults', () => {
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
      noInput: true,
      printSpec: true,
    })
  })

  it('preserves removed flags only so parseCliArgs can reject them', () => {
    expect(parseRawCliArgs([
      '--p',
      'react-full',
      '--dry-run',
      '--no-install',
      '--no-git',
      '--no-rollback',
    ])).toEqual({
      _: [],
      preset: 'react-full',
      dryRun: true,
      install: false,
      git: false,
      rollback: false,
    })
  })
})

describe('help text', () => {
  it('documents canonical spec input and removed legacy shortcuts', () => {
    expect(HELP_TEXT).toContain('--spec <file-or-json>')
    expect(HELP_TEXT).toContain('--no-input')
    expect(HELP_TEXT).toContain('--print-spec')
    expect(HELP_TEXT).toContain('Complete canonical CreateSpec')
    expect(HELP_TEXT).toContain('--dry-run')
    expect(HELP_TEXT).toContain('Removed; use --print-spec to inspect canonical input')
    expect(HELP_TEXT).toContain('--preset, --p')
    expect(HELP_TEXT).toContain('Removed; reusable shapes are complete CreateSpec files')
    expect(HELP_TEXT).not.toContain('standalone-react-full')
  })
})

describe('parseCliArgs', () => {
  it('decodes canonical direct spec input', async () => {
    const result = await Effect.runPromise(
      Effect.either(parseCliArgs([
        '--spec',
        '{"topology":"single-package","package":{"id":"app","name":"demo","capabilities":["minimal-node-package"]},"rootCapabilities":[],"providers":[],"overrides":{}}',
        '--name',
        'demo-app',
        '--no-input',
      ])),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.spec).toContain('"topology"')
      expect(result.right.name).toBe('demo-app')
      expect(result.right.noInput).toBe(true)
    }
  })

  it.each([
    ['--preset', ['--preset', 'solid-app']],
    ['--dry-run', ['--dry-run']],
    ['--install/--no-install', ['--no-install']],
    ['--git/--no-git', ['--no-git']],
    ['--rollback/--no-rollback', ['--no-rollback']],
  ] as const)('rejects removed %s input', async (flag, args) => {
    const result = await Effect.runPromise(
      Effect.either(parseCliArgs([
        '--spec',
        '{"topology":"single-package","package":{"id":"app","name":"demo","capabilities":["minimal-node-package"]},"rootCapabilities":[],"providers":[],"overrides":{}}',
        '--name',
        'demo-app',
        ...args,
      ])),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe('SchemaContractError')
      expect(result.left.message).toContain(flag)
      expect(result.left.message).toContain('removed')
    }
  })

  it('rejects removed yes aliases instead of silently accepting them', async () => {
    const result = await Effect.runPromise(
      Effect.either(parseCliArgs([
        '--spec',
        '{"topology":"single-package","package":{"id":"app","name":"demo","capabilities":["minimal-node-package"]},"rootCapabilities":[],"providers":[],"overrides":{}}',
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
})
