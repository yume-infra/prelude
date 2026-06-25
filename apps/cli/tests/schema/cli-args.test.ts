import { Effect, Either } from 'effect'
import { describe, expect, it } from 'vitest'
import { decodeCliArgs } from '../../src/schema/cli-args'

describe('cliArgsSchema', () => {
  it('decodes canonical spec and no-input flags', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        decodeCliArgs({
          spec: 'prelude.json',
          name: 'demo-workspace',
          noInput: true,
          printSpec: true,
        }),
      ),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.spec).toBe('prelude.json')
      expect(result.right.noInput).toBe(true)
      expect(result.right.printSpec).toBe(true)
    }
  })

  it('decodes removed flags as raw CLI shape without modeling preset products', async () => {
    const result = await Effect.runPromise(
      decodeCliArgs({
        preset: 'any-removed-preset-name',
        dryRun: true,
        install: false,
        git: false,
        rollback: false,
      }),
    )

    expect(result).toEqual({
      preset: 'any-removed-preset-name',
      dryRun: true,
      install: false,
      git: false,
      rollback: false,
    })
  })
})
