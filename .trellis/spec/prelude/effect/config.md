# Effect Config

> Runtime configuration boundaries for `@sayoriqwq/prelude`.

---

## Contracts

- Runtime config belongs at an explicit config boundary, currently `apps/cli/src/config/app-config.ts`.
- Prefer `Config.*` combinators over ad hoc environment parsing.
- Raw environment and config inputs should be parsed once at the boundary, then passed internally as typed config.
- Sensitive values must use redaction, as with tracing endpoints.
- Do not re-read raw environment variables in downstream services when `AppConfig` can carry the value.

## Use When

- Adding a config field, tracing option, concurrency limit, log level, or debug behavior.
- Reviewing direct `process.env` access.
- Testing config-driven behavior.

## Refactor Signals

- The same raw config is parsed in more than one place.
- A sensitive value can be logged as a plain string.
- A downstream service depends on environment shape instead of typed `AppConfig`.
