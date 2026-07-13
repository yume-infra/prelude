---
audience: [agent, human]
purpose: Define the V1 replacement plan across Prelude, Effect Harness, Psychogram, and Partita.
status: active
updated: 2026-07-12
---

# Prelude V1 Rebuild Plan

## Objective

Replace the current create/provider implementation with an Effect v4
multi-Harness convergence host. The complete release proof is Partita running
real Effect Harness and Psychogram Modules together through one Contract, Plan,
apply, and check lifecycle.

This is a product replacement. It is not a compatibility migration.

## Delivery Rules

1. Final observable behavior is authoritative; old interfaces and file layout
   are disposable.
2. Production runtime uses Effect v4, Effect Schema, and `@effect/platform`.
3. Prelude Core remains Harness-domain blind.
4. Every active Target mutation passes through global Prelude composition.
5. Effect Harness and Psychogram are both required before V1 is accepted.
6. Packed Artifacts and Partita behavior outrank synthetic unit fixtures.
7. No slice may restore create, provider, manifest, `.prelude/`, or TUI
   compatibility.

## Final Package Shape

```text
prelude-workspace
  apps/cli
    @sayoriqwq/prelude
  packages/harness-contract
    @sayoriqwq/prelude-contract
```

The root workspace remains private. Both published packages use the existing
changesets and release workflow.

## Slice 0: Delete The Retired Product

### Outcome

The production graph no longer contains or exposes project generation,
provider lifecycle, old maintain state, or the create workbench.

### Delete Or Replace

- `apps/cli/src/core/create/**`;
- create routes, spec input, capabilities, materializers, and generated-project
  verification;
- provider discovery, provider profile adapters, provider lifecycle state, and
  compatibility aliases;
- create/maintain manifest models and `.prelude/` readers/writers;
- fullscreen create workbench and prototype code;
- all tests and fixtures whose acceptance truth is CreateSpec, scaffold output,
  provider records, base snapshots, or old manifest behavior;
- old CLI commands and flags;
- scaffolding package descriptions, keywords, scripts, examples, and dead
  dependencies.

### Preserve

- repository tooling that still serves the rewritten packages;
- generic utilities only when they already satisfy the new Effect-native
  boundary without retaining old domain concepts;
- archived docs as non-authoritative history.

### Gate

- `rg` finds no active create/provider/manifest/TUI production import;
- CLI help exposes only the new convergence product;
- no test requires `.prelude/` or generated project fixtures.

## Slice 1: Publish The Shared Contract

### Outcome

Prelude and both Harness repositories compile and validate against one real npm
dependency instead of copied interfaces.

### Work

- add `packages/harness-contract` as `@sayoriqwq/prelude-contract`;
- define Effect Schema codecs for Module descriptor/context result, four Output
  capabilities, Requirements, Issues, Checks, and Plan-facing identity data;
- derive TypeScript types from schemas;
- expose the `defineHarnessModule`-style authoring helper only if it deepens the
  boundary; keep returned declarations plain data;
- encode protocol version and required-feature negotiation;
- provide conformance fixtures for duplicate package copies, malformed data,
  unsupported features, and unsafe paths;
- publish package exports, types, schema assets, and package metadata;
- add changesets for Contract and CLI release coordination.

### Gate

- Prelude, Effect Harness, and Psychogram consume the package dependency;
- neither Harness imports the Prelude CLI;
- Contract round trips through Effect Schema and JSON;
- no class or `instanceof` identity crosses the seam.

## Slice 2: Build The Effect V4 Host Skeleton

### Outcome

The built CLI can decode root config, resolve exact root-selected Harness
exports, run Modules read-only, and emit a schema-valid combined no-write plan.

### Runtime Boundaries

Implement Effect-native deep modules for behavior equivalent to:

- Control Root and config loading;
- pnpm package/lock observation;
- exact ESM Module resolution and loading;
- confined Artifact assets;
- read-only Target observation;
- Module execution and schema validation;
- plan rendering and JSON encoding.

The exact service names are implementation decisions. Use Effect services,
Layers, typed errors, scopes, and `@effect/platform` rather than global I/O or a
parallel Promise architecture.

### CLI

V1 commands are only:

- `prelude plan`;
- `prelude apply` with an exact approved execution hash;
- `prelude check`.

Human text and `--json` are views over the same Plan/Result schemas.

### Gate

- config accepts only `schemaVersion` and `id/module/packageRoot` Integrations;
- all Modules resolve from direct root devDependencies;
- only named `harnessModule` exports load;
- planning performs no Target writes;
- malformed Modules fail with typed, inspectable errors.

## Slice 3: Compose The V1 Contract

### Outcome

Several Modules produce one deterministic Plan with complete conflict and
blocker evaluation.

### Work

- implement ManagedTree validation and current tree comparison;
- implement ManagedBlock parsing and shared text-file composition;
- implement JSON/JSONC semantic pointer comparison;
- implement stable-key collection item comparison;
- compose direct package Requirements by importer and package;
- treat every Module Issue as a blocker;
- compose independent target command Checks;
- detect all path and locator overlap before writing;
- define versioned Plan Document encoding and execution hashing;
- render additions, replacements, tree deletions, no-ops, blockers, ownership,
  and Checks as evidence.

Synthetic Modules should test conflict algebra, but only capabilities required
by Effect Harness and Psychogram belong in V1.

### Gate

- config order cannot choose a conflict winner;
- same inputs produce byte-identical Plan JSON and hash;
- comment-only JSONC config edits do not change semantic desired state;
- unsupported required features block before partial planning.

## Slice 4: Apply And Check

### Outcome

An approved Plan materializes all four Output types and executes composed Target
verification without committed Prelude state.

### Work

- acquire an exclusive Target write boundary;
- replan and compare the approved execution hash before writing;
- stage and publish shared text/JSON files;
- stage complete Managed Trees and replace their target roots;
- report detectable partial failure without claiming rollback;
- make rerun converge completed Outputs as no-ops;
- implement canonical serial Check execution and aggregate failures;
- replan after Checks to detect managed-surface mutation;
- use temporary storage and sibling staging without creating `.prelude/`.

### Failure Tests

- target changes between plan and apply;
- failure before any publication;
- failure after one bounded file publication;
- failure during tree replacement;
- rerun after partial publication;
- Check command failure;
- Check command mutates a managed surface;
- process interruption leaves no false success or durable applied-state claim.

### Gate

- only an exact current hash writes;
- partial apply is honest and rerunnable;
- `prelude check` runs commands only after structural convergence;
- no receipt, manifest, rollback journal, or `.prelude/` appears.

## Slice 5: Implement Both Real Harness Modules

Effect Harness and Psychogram work can proceed in parallel after the Contract
package shape is runnable. Neither Module receives a legacy adapter.

### Effect Harness Deliverables

- publish `@sayoriqwq/effect-harness/prelude` with named `harnessModule`;
- replace provider/discovery output with the shared Contract;
- maintain a complete static target bundle for `effect/managed/**`;
- plan one bounded root `AGENTS.md` routing block;
- plan exact tsconfig/editor JsonValue and JsonKeyedItem declarations required
  by the real Effect workflow;
- declare direct runtime/tool package Requirements;
- export a stable composable ESLint API;
- diagnose missing or incompatible target ESLint integration as a blocking
  Issue and ship guidance for the Prelude skill;
- declare target typecheck/lint/domain Checks;
- keep pinned Effect/tsgo sources and Source Diagnostics internal to the
  Artifact, outside normal Target projection;
- remove old provider compatibility from the release artifact.

### Psychogram Deliverables

- publish an npm Artifact with exact `./prelude` export and named
  `harnessModule`;
- use the shared Contract package;
- maintain one complete static Target bundle containing the accepted
  `harness/**`, `template/**`, and Codex projection source;
- plan that bundle into `psychogram/managed/**`;
- plan one distinct root `AGENTS.md` routing block;
- inspect target-owned wiki state only for domain Issues or Checks;
- never model wiki ids, registries, page types, or content as Prelude Outputs;
- exclude fixtures and unrelated runtime projections from the managed bundle;
- defer multi-wiki semantics.

### Gate

- both packed packages pass Contract conformance;
- neither package writes the Target during Module planning;
- neither Module relies on sibling repository paths;
- Prelude contains no Effect or Psychogram conditional branch.

## Slice 6: Ship Prelude-Owned Skills

### Outcome

An agent can prepare Partita for deterministic core without moving semantic
mutation into Harness packages.

### V1 Skills

- bootstrap: add exact root devDependencies and create minimal JSONC config;
- blocker repair: update package state through pnpm and patch target-owned
  executable config after showing the user a diff;
- upgrade/reconcile: capture old/new Plan Documents, update package state,
  inspect disappeared bounded declarations, propose cleanup, and return to
  plan/apply/check.

Skills ship with the selected Prelude Artifact. Harness Artifacts may provide
guidance files but no competing target mutator.

### Gate

- skills never approve a Plan on behalf of the user;
- all managed-surface writes still go through Prelude apply;
- broad target-owned patches require explicit authorization;
- direct package updates remain possible but document weaker residue guarantees.

## Slice 7: Prove The Partita Tracer

### Setup

- install packed or published Prelude, Contract, Effect Harness, and Psychogram
  packages as direct Partita root devDependencies;
- commit the resulting `package.json` and `pnpm-lock.yaml` selection;
- create minimal `prelude.config.jsonc` with Effect and Psychogram Integrations
  at package root `.`;
- use the Prelude skill to reconcile Partita's existing ESLint entry point and
  any package blockers;
- create one real target-owned wiki under `psychogram/wikis/**`.

### Required Initial Plan

The one plan must visibly include:

- Effect and Psychogram Artifact identities and Integration owners;
- two Managed Trees;
- two nonoverlapping root `AGENTS.md` blocks;
- Effect structured config Outputs;
- package Requirement status;
- executable-config Issue status;
- both Harnesses' Checks;
- one execution hash.

### Apply And Verification

- approve the exact hash;
- apply without `.prelude/`;
- run `prelude check` from Partita;
- prove the Effect managed bundle is complete and readable;
- prove the Psychogram protocol bundle is complete;
- prove Effect feedback and Psychogram wiki content remain untouched;
- prove no absolute sibling-source or npm-cache path enters Plan or output.

### Upgrade Proof

- change at least one packed Harness Artifact's managed tree and one bounded
  declaration;
- capture old/new plans through the upgrade skill;
- inspect and approve the new hash;
- apply and check again;
- demonstrate that target-owned feedback/wiki content survives.

### Gate

V1 is not releasable until this complete two-Harness tracer passes.

## Slice 8: Release Cleanup

- rewrite root and CLI README around convergence only;
- ensure AGENTS and all active docs agree;
- remove old scripts, fixtures, examples, dependencies, and Knip exceptions;
- scan active surfaces for retired terms;
- run full verification in Prelude, Effect Harness, Psychogram, and Partita;
- pack all published packages and repeat the tracer from installed Artifacts;
- add release changesets and publish through repository workflows;
- confirm public package contents and exports after release.

## Test Strategy

Prioritize tests in this order:

1. Partita installed-Artifact tracer.
2. Built CLI plan/apply/check acceptance.
3. Cross-package Contract conformance.
4. Output composition and failure injection.
5. Focused Effect service/unit tests.

Do not preserve tests merely because they cover deleted code. A passing old
create/provider test is negative evidence if it prevents deletion.

## Verification Commands

At minimum:

```bash
pnpm verify
pnpm pack
pnpm exec prelude plan --json
pnpm exec prelude apply --plan-hash <approved-hash>
pnpm exec prelude check
```

Run repository-specific verification in all four repositories. Public npm
publication is a release gate, not a prerequisite for local packed integration
proof.

## Completion Matrix

| Capability | Required proof |
| --- | --- |
| Shared dependency | All three producer/consumer repos use `@sayoriqwq/prelude-contract` |
| Effect runtime | Core uses Effect v4/Platform/Schema boundaries rather than old imperative architecture |
| Multi-Harness | Real Effect Harness and Psychogram run together in Partita |
| Artifact selection | Direct root dependencies and lockfile select exact exports |
| Read-only planning | Module planning changes no Target bytes |
| Composition | Four Output types conflict and compose globally |
| Approval | Apply rejects every hash except the current approved hash |
| Apply | Managed Trees and bounded Outputs converge without committed state |
| Recovery | Partial failure is reported and a new plan is rerunnable |
| Verification | Both Harness Check sets run through one `prelude check` |
| Ownership | Effect feedback and Psychogram wiki content remain target-owned |
| Deletion | No create/provider/TUI/manifest/`.prelude` active surface remains |
| Packaging | Packed and published package exports contain the complete runtime/assets |

## Deferred

Do not implement these incidentally:

- TUI;
- project creation;
- Integration removal;
- Harness config options;
- Owned File or executable AST merge;
- Extension Surface declarations;
- multi-wiki modeling;
- automatic package mutation in core;
- durable multi-file transactions;
- arbitrary third-party Harness sandboxing;
- non-pnpm targets.
