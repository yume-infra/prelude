---
audience: [agent, human]
purpose: Hand off the accepted Prelude V1 baseline to the implementation lead.
status: active
updated: 2026-07-12
---

# Architecture Handoff

## Status

Architecture alignment is complete. Stop interviewing for additional minor
field or helper decisions. Implement the observable final state and let Effect
Schema and Effect-native module design determine exact TypeScript shapes.

The current branch is `dev`. The repository still contains the old
create/provider implementation; it is explicitly disposable. Active docs and
ADRs are the implementation authority.

## Objective

Deliver Prelude V1 as an Effect v4 multi-Harness convergence host proven by
real Effect Harness and Psychogram Artifacts running together in Partita.

## Accepted End State

```text
Partita root package graph
  -> @sayoriqwq/prelude
  -> @sayoriqwq/effect-harness
  -> @sayoriqwq/psychogram
  -> shared @sayoriqwq/prelude-contract
  -> two read-only Module plans
  -> one globally composed Plan Document
  -> exact hash approval
  -> apply
  -> composed prelude check
```

## Non-Negotiable Decisions

- Prelude Core knows only the shared Contract, never Harness domain identity.
- Effect Harness and Psychogram are both required in the first release proof.
- The Contract is a separate package in the Prelude monorepo.
- Prelude and Harness packages are direct Control Root devDependencies.
- Config contains only schema version and `id/module/packageRoot` Integrations.
- Modules are exact ESM package exports with named `harnessModule`.
- V1 Outputs are ManagedTree, ManagedBlock, JsonValue, and JsonKeyedItem only.
- Bounded Output omission does not delete; ManagedTree is exact within its root.
- Package Requirements require direct declaration, lock resolution, and install
  consistency.
- Every Issue blocks; there is no severity or persisted lifecycle.
- Checks are independent no-shell argv commands run after convergence.
- Plan JSON and execution hash are public, versioned contracts.
- Apply replans under the write boundary and accepts only the approved hash.
- Partial apply is honest and rerunnable; there is no rollback journal.
- `.prelude/` does not exist in V1.
- Executable config is target-owned; Harnesses export stable APIs and Prelude
  skills patch integration after authorization.
- Effect feedback and Psychogram wiki content are target-owned.
- Psychogram V1 proves one real wiki; multi-wiki is deferred.
- The runtime and Contract codecs use Effect v4, Effect Schema, and
  `@effect/platform`.
- Existing code structure and interfaces have no preservation value.

## Delete Without Compatibility

- create routes and `CreateSpec`;
- project materializers and generated-project fixtures;
- provider discovery and lifecycle adapters;
- manifests, receipts, bases, journals, and `.prelude/` code;
- create/maintain commands and legacy flags;
- current fullscreen create workbench and prototype;
- old tests, scripts, README text, package metadata, and dead dependencies;
- any old GitHub issue assumption used as implementation truth.

Issue #47 remains UX evidence for a possible future TUI. Issues #46, #48, and
#49 describe the retired create baseline and are not V1 requirements.

## Repository Work

### Prelude

1. Delete the old production graph.
2. Add `packages/harness-contract`.
3. Rebuild CLI/Core in Effect v4.
4. Implement contract composition, Plan JSON/hash, apply, and check.
5. Ship bootstrap/blocker/upgrade skills with the Prelude Artifact.
6. Rewrite active package metadata and READMEs.

### Effect Harness

1. Depend on the shared Contract.
2. Export `./prelude` with named `harnessModule`.
3. Maintain the exact Effect managed target bundle.
4. Return real tree, block, structured config, Requirement, Issue, and Check
   declarations.
5. Export stable ESLint config API and integration guidance.
6. Delete old provider compatibility from the published artifact.

### Psychogram

1. Become an installable Harness Artifact.
2. Depend on the shared Contract and export `./prelude`.
3. Build the exact managed protocol bundle.
4. Return a tree, root agent block, Issues, and Checks.
5. Leave `psychogram/wikis/**` target-owned and avoid multi-wiki modeling.

### Partita

1. Select packed/published packages as direct root devDependencies.
2. Add minimal two-Integration JSONC config.
3. Let the Prelude skill repair package and ESLint blockers.
4. Plan and approve one combined hash.
5. Apply both Harness managed surfaces.
6. Create/use one real target-owned Psychogram wiki.
7. Run composed check and the Artifact upgrade tracer.

## Implementation Guidance

Use Effect-native deep modules rather than a one-to-one rewrite of old helpers.
The behavioral boundaries are config, Artifact loading, read-only observation,
Module planning, composition, Plan encoding, materialization, and checking. The
exact service and file names are intentionally not specified.

Prefer external acceptance tests over internal mock choreography. Fake Modules
exist to prove conflict algebra; they do not define the product.

Do not add an abstraction, compatibility layer, field, or lifecycle state for a
case not exercised by Effect Harness, Psychogram, or Partita.

## Verification Gate

Before declaring V1 complete:

- run `pnpm verify` in Prelude, Effect Harness, Psychogram, and Partita;
- pack every published package and test installed exports/assets;
- run Partita `prelude plan --json`, approved apply, and `prelude check`;
- inject partial apply and stale-hash failures;
- scan active surfaces for create/provider/manifest/`.prelude`/OwnedFile/TUI
  residue;
- verify no source-repository absolute path is required;
- verify both complete managed documentation trees are readable in Partita.

## Current Verification Note

`pnpm verify` passed before the final architecture documentation amendments.
The latest documentation set still needs its own link/term scan and repository
verification before commit. No implementation work should assume the current
old test suite remains relevant after the deletion gate.

## Residual Risks

- compatible cross-repository package publication order;
- Effect v4 API movement;
- robust Harness-side ESLint policy diagnosis;
- honest handling of process death during tree publication;
- complete and useful target documentation bundles.

These are implementation and release risks, not unresolved architecture
questions.
