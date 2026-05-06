# Effect Entrypoints

> Runtime execution boundaries for the `create-yume` CLI.

---

## Contracts

- `apps/cli/src/index.ts` is the application execution boundary. It may use `NodeRuntime.runMain`.
- Feature modules under `apps/cli/src/core/`, `apps/cli/src/schema/`, `apps/cli/src/config/`, and `apps/cli/src/brand/` should return `Effect` values or pure values instead of running them.
- `Effect.runSync` is allowed only when the work is explicitly synchronous and already decoded at the boundary.
- If a boundary may touch prompts, file IO, command execution, template rendering, tracing, or async services, use the async runtime path.
- Tests may use `Effect.runPromise` or `Effect.runPromiseExit` at the test boundary; do not copy those runners into production helpers.

## Use When

- Adding a CLI mode, prompt path, or non-interactive preset path.
- Moving logic between `index.ts`, `core/commands`, `core/services`, and schema adapters.
- Reviewing helpers that call `Effect.run*`.

## Refactor Signals

- A helper executes an Effect before the CLI has provided its layers.
- A service hides async work behind `runSync`.
- Feature logic becomes hard to test because execution happens before dependencies can be provided.

