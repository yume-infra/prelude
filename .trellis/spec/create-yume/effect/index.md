# Effect Runtime Style

> Local Effect style baseline for the create-yume CLI.

---

## Scope

Use this layer before changing Effect services, schema decoding, config, scoped cleanup, tests, or observability in `apps/cli/src/`.

## Detailed Baselines

- [Entrypoints](./entrypoints.md)
- [Composition](./composition.md)
- [Branching](./branching.md)
- [Brands](./brands.md)
- [Services](./services.md)
- [Config](./config.md)
- [Schema](./schema.md)
- [Scope and Cleanup](./scope-and-cleanup.md)
- [Testing](./testing.md)
- [Observability](./observability.md)

## Summary

| Area | Rule |
| --- | --- |
| Entrypoints | Keep runtime execution at the CLI boundary; do not spread `Effect.run*` through feature modules. |
| Composition | Prefer clear `Effect.gen` flows for service orchestration and typed failure channels. |
| Branching | Use exhaustive union handling for schema-constrained cases. |
| Brands | Use branded constructors for project names, target dirs, template paths, command names, and package names. |
| Services | Model reusable dependencies with small Effect services; do not leak platform dependencies through public APIs. |
| Config | Decode config at the boundary, redact sensitive values, and keep dynamic context separate from stable services. |
| Schema | Decode CLI, JSON, disk, and cross-layer input before business logic consumes it. |
| Scope/Cleanup | Attach rollback and cleanup to resource boundaries and preserve the original failure. |
| Testing | Test services through explicit layers, boundary assertions, and deterministic clocks. |
| Observability | Log inside the Effect that executes; keep smoke diagnostics concise and actionable. |

## Required Reading By Change

- Services or command/fs/template runtime: read `cli-runtime/index.md` too.
- Schema, create spec, presets: read `generation-model/index.md`.
- Plan/apply, rollback, post-generate actions: read `template-system/index.md` and `workspace-packages/index.md` as needed.

## Forbidden Patterns

- Do not let unvalidated external data flow into deeper planning logic.
- Do not add service abstractions without a reusable dependency boundary.
- Do not convert expected domain failures into generic thrown `Error` values.
