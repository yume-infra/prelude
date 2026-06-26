import type { Input as DurationInput } from 'effect/Duration'
import { Effect } from 'effect'
import { TestClock } from 'effect/testing'

export function withTestClock<A, E, R>(effect: Effect.Effect<A, E, R>) {
  return effect.pipe(Effect.provide(TestClock.layer()))
}

export function adjustTestClock(duration: DurationInput) {
  return TestClock.adjust(duration)
}
