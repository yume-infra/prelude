import { Effect, Either } from 'effect'
import { describe, expect, it } from 'vitest'
import { decodeCliArgs, formatCliArgsError } from '../../src/schema/cli-args'

describe('cliArgsSchema', () => {
  it('returns a structured decode failure for an invalid preset fixture', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        decodeCliArgs({
          preset: 'solid-app',
          name: 'demo-app',
        }),
      ),
    )

    expect(Either.isLeft(result)).toBe(true)
    if (Either.isLeft(result)) {
      const formatted = formatCliArgsError(result.left)
      expect(formatted).toContain('CliArgs')
      expect(formatted).toContain('preset')
      expect(formatted).toContain('react-minimal')
    }
  })

  it('decodes the dry-run flag', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        decodeCliArgs({
          preset: 'react-full',
          name: 'demo-app',
          dryRun: true,
        }),
      ),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.dryRun).toBe(true)
    }
  })

  it('decodes the workspace root preset', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        decodeCliArgs({
          preset: 'workspace-root',
          name: 'demo-workspace',
        }),
      ),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.preset).toBe('workspace-root')
    }
  })
})
