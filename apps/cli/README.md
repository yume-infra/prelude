# @sayoriqwq/prelude CLI

This package will contain Prelude's Effect v4 multi-Harness convergence host.

## Public Surface

V1 exposes only:

- `prelude plan`: load every configured Harness Module, compose declarations,
  compare current state, and emit one Plan Document and execution hash;
- `prelude apply`: replan under the Target write boundary and materialize only
  an exact approved hash;
- `prelude check`: require structural convergence and execute all composed
  target command Checks.

Configuration is the root `prelude.config.jsonc`. Prelude and every Harness
Artifact are direct root `devDependencies` selected by the Target lockfile.
Modules implement the separately published `@sayoriqwq/prelude-contract`.

## Implementation Constraint

The runtime is a new Effect v4 implementation using Effect Schema and
`@effect/platform`. Exact service and file names follow Effect-native module
design; preserving the old imperative helper graph is not a goal.

The checked-in package still contains the retired create/provider
implementation. Delete its create routes, workbench, materializers, provider
adapters, manifests, fixtures, commands, and tests at the rebuild deletion gate.
Do not add compatibility around them.

V1 has no create, init, maintain, provider, remove, TUI, generic confirmation,
or `.prelude/` product surface.

Read [the active docs](../../docs/README.md) and
[the rebuild plan](../../docs/prelude-rebuild-plan.md) before editing production
code.

## Local Development

```bash
pnpm install
pnpm --filter @sayoriqwq/prelude build
pnpm verify
```

Current generated-project smoke tests describe code scheduled for deletion and
do not define V1 acceptance. The real gate is the packed two-Harness Partita
tracer.
