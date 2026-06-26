import { assert, describe, it } from '@effect/vitest'
import { Effect, Result } from 'effect'
import { decodeCliArgs } from '../../src/schema/cli-args'

describe('cliArgsSchema', () => {
  it('decodes canonical spec and no-input flags', async () => {
    const result = await Effect.runPromise(
      Effect.result(
        decodeCliArgs({
          spec: 'prelude.json',
          name: 'demo-workspace',
          noInput: true,
          printSpec: true,
          dryRun: true,
        }),
      ),
    )

    assert.equal(Result.isSuccess(result), true)
    if (Result.isSuccess(result)) {
      assert.equal(result.success.spec, 'prelude.json')
      assert.equal(result.success.noInput, true)
      assert.equal(result.success.printSpec, true)
      assert.equal(result.success.dryRun, true)
    }
  })

  it('decodes removed flags as raw CLI shape without modeling preset products', async () => {
    const result = await Effect.runPromise(
      decodeCliArgs({
        preset: 'any-removed-preset-name',
        install: false,
        git: false,
        rollback: false,
      }),
    )

    assert.deepStrictEqual(result, {
      preset: 'any-removed-preset-name',
      install: false,
      git: false,
      rollback: false,
    })
  })
})
