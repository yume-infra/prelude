---
status: accepted
date: 2026-07-10
amended: 2026-07-12
---

# Use static JSONC integration config

> V2 successor: the same static-config decision now lands at
> `.prelude/config.jsonc` and each Integration selects a nonempty collection of
> explicit `packageRoots`. See the active V2 Contract.

`prelude.config.jsonc` is the sole committed Harness Integration desired input. V1 contains a schema version and Integrations with only a stable id, exact Harness Module package export specifier, and exact target package root. Artifact versions remain exclusively in `package.json` and `pnpm-lock.yaml`. V1 has no Harness options; a later optional capability may be added only after a real Integration requires it.

JSONC keeps the configuration declarative and runtime-schema validated while allowing comments and trailing commas for human and agent maintenance. Prelude parses it with a comment-preserving structured parser. Semantic comparison and plan hashing use canonical parsed data, so comment-only or formatting-only edits do not change desired state.

The config cannot execute code, read environment variables, discover packages dynamically, or override individual Harness surfaces. `$schema` is editor metadata and does not enter semantic hashing. Only exact committed Integration entries enter target scope.

## Consequences

`package.json` remains package-manager state rather than Harness lifecycle configuration. TypeScript configuration modules and YAML are not supported. Prelude and authorized skills must preserve comments and formatting when editing `prelude.config.jsonc` instead of replacing it through parse/stringify serialization.
