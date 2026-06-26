import { Effect, Result } from 'effect'
import { assert, describe, it } from 'vitest'
import { parseCliArgs, parseRawCliArgs } from '../../src/core/cli-args'
import { HELP_TEXT } from '../../src/core/cli-help'

describe('parseRawCliArgs', () => {
  it('normalizes canonical spec flags without old route defaults', () => {
    assert.deepStrictEqual(
      parseRawCliArgs([
        '--spec',
        'prelude.json',
        '--name',
        'demo-workspace',
        '--no-input',
        '--print-spec',
        '--dry-run',
      ]),
      {
        _: [],
        spec: 'prelude.json',
        name: 'demo-workspace',
        noInput: true,
        printSpec: true,
        dryRun: true,
      },
    )
  })

  it('preserves removed flags only so parseCliArgs can reject them', () => {
    assert.deepStrictEqual(
      parseRawCliArgs([
        '--p',
        'react-full',
        '--no-install',
        '--no-git',
        '--no-rollback',
      ]),
      {
        _: [],
        preset: 'react-full',
        install: false,
        git: false,
        rollback: false,
      },
    )
  })
})

describe('help text', () => {
  it('documents canonical spec input and removed legacy shortcuts', () => {
    assert.ok(HELP_TEXT.includes('--spec <file-or-json>'))
    assert.ok(HELP_TEXT.includes('--no-input'))
    assert.ok(HELP_TEXT.includes('--print-spec'))
    assert.ok(HELP_TEXT.includes('Print WritePlan operations and blockers without writing files'))
    assert.ok(HELP_TEXT.includes('Complete canonical CreateSpec'))
    assert.ok(HELP_TEXT.includes('--dry-run'))
    assert.ok(HELP_TEXT.includes('--preset, --p'))
    assert.ok(HELP_TEXT.includes('Removed; reusable shapes are complete CreateSpec files'))
    assert.ok(!HELP_TEXT.includes('standalone-react-full'))
  })
})

describe('parseCliArgs', () => {
  it('decodes canonical direct spec input', async () => {
    const result = await Effect.runPromise(
      Effect.result(parseCliArgs([
        '--spec',
        '{"topology":"single-package","package":{"id":"app","name":"demo","capabilities":["minimal-node-package"]},"rootCapabilities":[],"providers":[],"overrides":{}}',
        '--name',
        'demo-app',
        '--no-input',
        '--dry-run',
      ])),
    )

    assert.equal(Result.isSuccess(result), true)
    if (Result.isSuccess(result)) {
      const spec = result.success.spec
      if (typeof spec !== 'string') {
        assert.fail('expected direct spec input to be a string')
      }
      assert.ok(spec.includes('"topology"'))
      assert.equal(result.success.name, 'demo-app')
      assert.equal(result.success.noInput, true)
      assert.equal(result.success.dryRun, true)
    }
  })

  it.each([
    ['--preset', ['--preset', 'solid-app']],
    ['--install/--no-install', ['--no-install']],
    ['--git/--no-git', ['--no-git']],
    ['--rollback/--no-rollback', ['--no-rollback']],
  ] as const)('rejects removed %s input', async (flag: string, args: readonly string[]) => {
    const result = await Effect.runPromise(
      Effect.result(parseCliArgs([
        '--spec',
        '{"topology":"single-package","package":{"id":"app","name":"demo","capabilities":["minimal-node-package"]},"rootCapabilities":[],"providers":[],"overrides":{}}',
        '--name',
        'demo-app',
        ...args,
      ])),
    )

    assert.equal(Result.isFailure(result), true)
    if (Result.isFailure(result)) {
      assert.equal(result.failure._tag, 'SchemaContractError')
      assert.ok(result.failure.message.includes(flag))
      assert.ok(result.failure.message.includes('removed'))
    }
  })

  it('rejects removed yes aliases instead of silently accepting them', async () => {
    const result = await Effect.runPromise(
      Effect.result(parseCliArgs([
        '--spec',
        '{"topology":"single-package","package":{"id":"app","name":"demo","capabilities":["minimal-node-package"]},"rootCapabilities":[],"providers":[],"overrides":{}}',
        '--name',
        'demo-app',
        '-y',
      ])),
    )

    assert.equal(Result.isFailure(result), true)
    if (Result.isFailure(result)) {
      assert.equal(result.failure._tag, 'SchemaContractError')
      assert.ok(result.failure.message.includes('--yes/-y has been removed'))
      assert.ok(result.failure.message.includes('complete canonical CreateSpec'))
    }
  })

  it('rejects project names that would escape the target directory boundary', async () => {
    const result = await Effect.runPromise(
      Effect.result(parseCliArgs([
        '--spec',
        '{"topology":"single-package","package":{"id":"app","name":"demo","capabilities":["minimal-node-package"]},"rootCapabilities":[],"providers":[],"overrides":{}}',
        '--name',
        '../outside',
      ])),
    )

    assert.equal(Result.isFailure(result), true)
    if (Result.isFailure(result)) {
      assert.equal(result.failure._tag, 'SchemaContractError')
      assert.ok(result.failure.message.includes('CliArgs'))
      assert.ok(result.failure.message.includes('name'))
    }
  })
})
