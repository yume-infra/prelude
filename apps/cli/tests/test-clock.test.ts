import { Effect, Fiber } from 'effect'
import { describe, expect, it } from 'vitest'
import { adjustTestClock, withTestClock } from './support/clock'

describe('test clock support', () => {
  it('advances delayed effects without waiting for real time', async () => {
    const result = await Effect.runPromise(
      withTestClock(Effect.gen(function* () {
        const fiber = yield* Effect.sleep('1 minute').pipe(
          Effect.as('done'),
          Effect.forkChild,
        )

        yield* adjustTestClock('1 minute')

        return yield* Fiber.join(fiber)
      })),
    )

    expect(result).toBe('done')
  })
})
