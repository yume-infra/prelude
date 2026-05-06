# Effect Testing

> Deterministic tests for Effect services and boundaries.

---

## Contracts

- Prefer explicit Effect layers and mocks over global mutation.
- Time-sensitive behavior must use deterministic clock control, such as `TestClock`, instead of real sleep.
- Keep `apps/cli/tests/support/clock.ts` as the shared helper for TestClock usage.
- Test decoded/provided contracts at the boundary where they enter the system.
- Prefer `Effect.runPromiseExit` when the expected result is a typed failure.

## Use When

- Testing service orchestration, config-driven behavior, command execution, file materialization, rollback, or schema failures.
- Adding timeouts, retries, delays, or other time-sensitive Effect behavior.
- Reviewing slow or flaky tests.

## Refactor Signals

- A test waits on real time.
- A test mutates `process.env`, filesystem state, or globals when an explicit layer would be clearer.
- Failure assertions inspect stringified generic errors instead of typed failure values.

