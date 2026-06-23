# Effect Schema

> Decode external and cross-layer data before planning logic consumes it.

---

## Contracts

- Decode CLI args, inline JSON, JSON files, template registry declarations, target scopes, plan projections, and package specs at their boundaries.
- Prefer explicit `Schema.decodeUnknown(..., { errors: 'all' })` style boundaries over silent coercion.
- Convert parse failures into typed, readable failures such as CLI usage or projection boundary errors.
- Keep schemas focused on serializable data contracts.
- Use annotations when they improve diagnostics for user-provided specs or generated plan projections.

## Use When

- Editing `apps/cli/src/schema/*`, `apps/cli/src/core/create-spec-input.ts`, JSON adapters, preset parsing, or plan projection code.
- Moving data between CLI args, `CreateSpec`, `ProjectConfig`, `Plan`, and `PlanSpec`.
- Accepting template registry metadata.

## Refactor Signals

- Unknown external data reaches planner or materialization logic.
- Invalid JSON or schema data becomes a generic thrown error.
- A schema accepts a value that later needs defensive fallback logic in core planning.

