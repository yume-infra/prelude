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
[`partita`](https://github.com/sayoriqwq/partita) running real Effect Harness
and Psychogram Artifacts together.

V1 supports four managed Output capabilities:

- complete Managed Trees;
- bounded blocks in shared text files;
- logical JSON/JSONC values;
- stable-key JSON/JSONC collection items.

Package Requirements block missing or incompatible direct dependencies. Module
Issues are blockers. Checks are post-convergence target commands.

All other content is target-owned, including Effect feedback and Psychogram
wiki content. The released packages are `@sayoriqwq/prelude-contract@0.1.0`
and `@sayoriqwq/prelude@0.2.3`. V1 does not create or require a `.prelude/`
directory or committed applied state; a tracked legacy root `.prelude/`
provider tree remains under reconciliation audit.

## Configuration

Prelude and Harness packages are direct root `devDependencies`. The committed
config names exact package exports and target package roots:

```jsonc
{
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

## Documentation

Start with [the active docs index](./docs/README.md), then read:

- [goal](./docs/harness-convergence-goal.md)
- [architecture](./docs/multi-harness-convergence-architecture.md)
- [Module contract](./docs/harness-module-contract.md)
- [lifecycle](./docs/harness-integration-lifecycle.md)
Everything under [`docs/archive/`](./docs/archive/) is historical and
non-authoritative, including the dated V1 implementation records.

## Development

```bash
pnpm install
pnpm verify
```

Publishing uses `.github/workflows/release.yml`. Local packed-Artifact tests
must pass before public release coordination across Prelude, Effect Harness,
Psychogram, and Partita.
