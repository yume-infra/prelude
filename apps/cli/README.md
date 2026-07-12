# @sayoriqwq/prelude CLI

This package contains Prelude's Effect v4 multi-Harness convergence host.

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

## Agent Skills

The Target-selected Artifact provides version-matched skills at
`node_modules/@sayoriqwq/prelude/skills/<name>/SKILL.md`:

- `prelude-bootstrap` prepares exact root package selection and minimal
  Integration config; it does not approve or apply a plan.
- `prelude-repair` handles plan blockers and target-owned executable-config
  preparation after a concrete, authorized diff; it does not edit managed
  Outputs.
- `prelude-upgrade` compares temporary old/new Plans around a package update
  and separates any residue cleanup from that update for its own authorization.

## Implementation Constraint

The runtime is a new Effect v4 implementation using Effect Schema and
`@effect/platform`. Exact service and file names follow Effect-native module
design; preserving the old imperative helper graph is not a goal.

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

`pnpm smoke:installed` packs the CLI and Contract, installs two synthetic
Harness Artifacts into a temporary pnpm Target, and exercises plan, stale-hash
rejection, apply, and check across root and workspace Integration scopes.
