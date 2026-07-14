---
audience: [agent, human]
authors: [codex]
reviewed_by: [sayori]
purpose: Define the authoritative Prelude V2 knowledge set and reading order.
status: active
updated: 2026-07-13
---

# Prelude Docs

## Authority

`docs/` is the only active project knowledge source. Everything under
`docs/archive/` is historical and non-authoritative. The released V1 packages
remain historical compatibility boundaries. The active implementation target
is the breaking V2 successor; V1 shapes are not loaded or adapted.

The current product is a narrow multi-Harness convergence host. It is not a
project generator and has no compatibility obligation to old Prelude commands,
models, manifests, tests, or TUI code.

## Read Order

1. [`CONTEXT.md`](./CONTEXT.md) - domain language and ownership boundaries.
2. [`v2-harness-convergence-contract.md`](./v2-harness-convergence-contract.md)
   - authoritative V2 Module/host lifecycle and Gate 1 seam; canonical tree
     archive framing is normative in the Contract package README linked there.
3. [`harness-convergence-goal.md`](./harness-convergence-goal.md) - north star,
   V1 outcome, scope, and non-goals.
4. [`multi-harness-convergence-architecture.md`](./multi-harness-convergence-architecture.md)
   - system boundaries and final operating model.
5. [`harness-module-contract.md`](./harness-module-contract.md) - shared Module
   contract and the four V1 Output capabilities.
6. [`harness-integration-lifecycle.md`](./harness-integration-lifecycle.md) -
   plan, approval, apply, check, bootstrap, and upgrade behavior.
7. [`prelude-rebuild-plan.md`](./prelude-rebuild-plan.md) - released V1 slices
   and cross-repository acceptance gates.
8. [`adr/`](./adr/) - accepted architectural decisions.
9. [`architecture-review.md`](./architecture-review.md) - pressure-test result
   and retained risks.
10. [`architecture-handoff.md`](./architecture-handoff.md) - compact continuation
   entry point for the implementation lead.

The V1-named documents remain useful released-baseline evidence. Where they
conflict, the V2 contract at item 2 has authority.

## V2 Gate Baseline

V2 Gate 1 is complete only when isolated single-package and pnpm-workspace
Targets select and run real packed Prelude and Effect Harness Artifacts.
It closed on 2026-07-14 through the release-level cross-repository Gate and is
published as Prelude `0.4.0`, Contract `0.2.2`, Effect Harness `0.2.1`, and
Partita `0.2.2`.

```text
root package.json + pnpm-lock.yaml
  -> root-selected Prelude, Effect Harness, and Psychogram Artifacts
  -> committed .prelude/config.jsonc with explicit packageRoots
  -> two read-only Harness Module plans
  -> global composition
  -> one visible, versioned, hashed Plan Document
  -> exact approval
  -> apply
  -> target-executed prelude check
```

The shared package `@sayoriqwq/prelude-contract` is the only integration seam.
Prelude does not know Effect or Psychogram domain semantics, and Harnesses do
not write active managed surfaces directly.

For reference publications, the authority chain is [Prelude Contract's
canonical protocol](../packages/harness-contract/README.md#canonical-tree-archive-protocol)
→ [Partita producer](https://github.com/sayoriqwq/partita#pins) → [Effect
Harness composer](https://github.com/sayoriqwq/effect-harness/blob/main/HARNESS.md)
→ [Prelude consumer](./v2-harness-convergence-contract.md#pinned-reference-trees).

V2 implements only:

- `ManagedTree`;
- `ManagedBlock`;
- `JsonValue`;
- `JsonKeyedItem`;
- `PinnedReferenceTree` for packed reference-only source snapshots;
- direct package Requirements;
- blocking Issues;
- post-convergence target command Checks.

The runtime is rewritten in Effect v4. Effect Schema defines committed config
and shared wire codecs; Effect and `@effect/platform` own orchestration, typed
failure, services, resources, filesystem access, and process execution.

## Explicit Absences

V2 has no:

- create, init, scaffold, preset, recipe, provider, or maintain product line;
- `CreateSpec`, create resolver, create WritePlan, or compatibility adapter;
- `.prelude/` runtime state, manifest, receipt, base snapshot, journal, or
  applied state; `.prelude/config.jsonc` and encoded Integration Workspaces are
  committed Target content;
- Owned File, Extension Surface, Manual Action, or general patch capability;
- Harness options in `prelude.config.jsonc`;
- executable-config AST merge;
- TUI delivery obligation;
- support promise for arbitrary third-party Harnesses or non-pnpm targets.

A future TUI may present the same Plan Document and plan/apply/check lifecycle.
It will be rebuilt from this baseline and will not revive project generation.

## Archive Policy

Archived files may contain words such as `active`, `MUST`, or `final`; those
markers have no current authority. Do not use archived requirements to fill a
gap. A missing current decision remains intentionally unspecified until a real
Effect Harness, Psychogram, or Partita case requires it.
