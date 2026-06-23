# Effect Services

> Service boundaries for reusable CLI capabilities.

---

## Contracts

- Model a capability as a service only when it has a reusable implementation boundary.
- Keep platform dependencies inside the service implementation. Public APIs should expose project language, not Node internals.
- Use contextual tags for dynamic invocation context, such as CLI args and target dir, instead of pretending they are stable application services.
- Keep service interfaces small enough to express a clear capability boundary.
- Tests should provide explicit layers or small mocks rather than mutating global process state.

## Use When

- Editing filesystem, command execution, template engine, planner, orchestrator, tracing, or observability services.
- Deciding whether a value belongs in `CliContext` or in a stable service.
- Adding new dependencies to plan or materialization code.

## Refactor Signals

- A service public method leaks low-level filesystem, process, or command runner details.
- A dynamic per-run value is stored in a singleton-like service.
- Tests can only exercise behavior by mutating globals.

