# @sayoriqwq/prelude

Prelude is an Effect v4 convergence host for independently versioned Harnesses.

A pnpm Target selects Prelude and several Harness Artifacts through its root
`package.json` and `pnpm-lock.yaml`. Each Harness exports one read-only Module
through `@sayoriqwq/prelude-contract`. Prelude composes every Module before
writing, shows one complete Plan, applies only its exact approved hash, and runs
the Target's combined verification.

```text
root-selected Artifacts + .prelude/config.jsonc
  -> read-only Harness Module plans
  -> global Output, Requirement, Issue, and Check composition
  -> versioned Plan Document + execution hash
  -> exact approval
  -> rerunnable apply
  -> target-executed prelude check
```

## V2

V2 is a breaking successor protocol. It accepts only V2 config, Module, tagged
locator, Plan, and execution-hash shapes; it does not adapt released V1
Harnesses. Gate 1 requires packed Prelude and Effect Harness Artifacts to pass
real plan/apply/check in isolated single-package and pnpm-workspace Targets.

V2 supports five Output capabilities:

- complete Managed Trees;
- bounded blocks in shared text files;
- logical JSON/JSONC values;
- stable-key JSON/JSONC collection items.
- complete reference-only Pinned Reference Trees with immutable provenance.

Package Requirements block missing or incompatible direct dependencies. Module
Issues are blockers. Checks are post-convergence target commands.

All other content is target-owned. Each Integration Workspace has neighboring
`managed/`, `repos/`, and Target-owned `feedback/` zones. Prelude has no
manifest, receipt, journal, rollback, or committed applied state.

## Configuration

Prelude and Harness packages are direct root `devDependencies`. The committed
config at `.prelude/config.jsonc` names exact package exports and explicit
approved package-root collections:

```jsonc
{
  "schemaVersion": 2,
  "integrations": [
    {
      "id": "effect",
      "module": "@sayoriqwq/effect-harness/prelude",
      "packageRoots": [".", "packages/app"]
    },
    {
      "id": "psychogram",
      "module": "@sayoriqwq/psychogram/prelude",
      "packageRoots": ["."]
    }
  ]
}
```

V2 config has no Harness options or package versions. The root package graph
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

## Checkpoint Status

The V2 Contract and host lifecycle are being completed as a local checkpoint.
Canonical ordinary-file archive transport avoids pnpm's loss of package
symlinks, and composed provenance represents the nested tsgo Source Pin without
Target Git or gitlinks. Gate 1 remains open until the packed Prelude and real
packed Effect Harness pass isolated single-package and monorepo acceptance.

## Documentation

Start with [the active docs index](./docs/README.md), then read:

- [goal](./docs/harness-convergence-goal.md)
- [V2 Contract and Gate](./docs/v2-harness-convergence-contract.md)
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
