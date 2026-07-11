# @sayoriqwq/prelude

Prelude is an Effect v4 convergence host for independently versioned Harnesses.

A pnpm Target selects Prelude and several Harness Artifacts through its root
`package.json` and `pnpm-lock.yaml`. Each Harness exports one read-only Module
through `@sayoriqwq/prelude-contract`. Prelude composes every Module before
writing, shows one complete Plan, applies only its exact approved hash, and runs
the Target's combined verification.

```text
root-selected Artifacts + prelude.config.jsonc
  -> read-only Harness Module plans
  -> global Output, Requirement, Issue, and Check composition
  -> versioned Plan Document + execution hash
  -> exact approval
  -> rerunnable apply
  -> target-executed prelude check
```

## V1

The V1 release proof is
[`partita`](https://github.com/yume-infra/partita) running real Effect Harness
and Psychogram Artifacts together.

V1 supports four managed Output capabilities:

- complete Managed Trees;
- bounded blocks in shared text files;
- logical JSON/JSONC values;
- stable-key JSON/JSONC collection items.

Package Requirements block missing or incompatible direct dependencies. Module
Issues are blockers. Checks are post-convergence target commands.

All other content is target-owned, including Effect feedback and Psychogram
wiki content. Prelude has no `.prelude/` directory or committed applied state.

## Configuration

Prelude and Harness packages are direct root `devDependencies`. The committed
config names exact package exports and target package roots:

```jsonc
{
  "$schema": "./node_modules/@sayoriqwq/prelude/prelude-config.schema.json",
  "schemaVersion": 1,
  "integrations": [
    {
      "id": "effect",
      "module": "@sayoriqwq/effect-harness/prelude",
      "packageRoot": "."
    },
    {
      "id": "psychogram",
      "module": "@sayoriqwq/psychogram/prelude",
      "packageRoot": "."
    }
  ]
}
```

V1 config has no Harness options or package versions. The root package graph
owns Artifact selection.

## Target CLI

The replacement public surface is:

```text
prelude plan
prelude apply
prelude check
```

`plan --json` is a versioned machine contract. `apply` requires an exact current
execution hash. `check` first proves managed convergence, then executes all
Harness-declared target checks.

## Rebuild Status

The architecture is frozen, but the checked-in CLI still primarily implements
the retired create/provider product. That code, its TUI, manifests, fixtures,
and compatibility surfaces are scheduled for wholesale deletion. They are not
public contract evidence.

Prelude V1 is being rewritten around Effect v4, Effect Schema, and
`@effect/platform`. Final Partita behavior is authoritative over old TypeScript
interfaces or module layout.

## Documentation

Start with [the active docs index](./docs/README.md), then read:

- [goal](./docs/harness-convergence-goal.md)
- [architecture](./docs/multi-harness-convergence-architecture.md)
- [Module contract](./docs/harness-module-contract.md)
- [lifecycle](./docs/harness-integration-lifecycle.md)
- [rebuild plan](./docs/prelude-rebuild-plan.md)
- [architecture handoff](./docs/architecture-handoff.md)

Everything under [`docs/archive/`](./docs/archive/) is historical and
non-authoritative.

## Development

```bash
pnpm install
pnpm verify
```

Publishing uses `.github/workflows/release.yml`. Local packed-Artifact tests
must pass before public release coordination across Prelude, Effect Harness,
Psychogram, and Partita.
