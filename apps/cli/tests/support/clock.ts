import type { Input as DurationInput } from 'effect/Duration'
import { Clock, Effect } from 'effect'
import { TestClock } from 'effect/testing'

export function withTestClock<A, E, R>(effect: Effect.Effect<A, E, R>) {
  return Effect.scoped(Effect.gen(function* () {
    const testClock = yield* TestClock.make()
    return yield* effect.pipe(
      Effect.provideService(Clock.Clock, testClock),
    )
  }))
}

export function adjustTestClock(duration: DurationInput) {
  return TestClock.adjust(duration)
}
