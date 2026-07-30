---
audience: [agent, human]
authors: [codex]
reviewed_by: [sayori]
purpose: Define the authoritative Prelude V2 knowledge set and reading order.
classification: normative-current
status: active
updated: 2026-07-31
---

# Prelude Docs

## Authority

`docs/` is the only project knowledge source, but documents within it have
different authority. Only documents classified `normative-current` define
current behavior. Rationale, completed plans, and history can explain a
decision but cannot override the normative set. Everything under
`docs/archive/` is historical and non-authoritative.

The current product is a narrow multi-Harness convergence host. It is not a
project generator and has no compatibility obligation to old Prelude commands,
models, manifests, tests, or TUI code.

## Minimum Normative V2 Reading Set

Read these four documents, in order, before changing current behavior:

1. [`README.md`](./README.md) - authority, classification, and reading rules.
2. [`CONTEXT.md`](./CONTEXT.md) - domain language and ownership boundaries.
3. [`v2-harness-convergence-contract.md`](./v2-harness-convergence-contract.md)
   - authoritative V2 Module/host lifecycle and Gate 1 seam.
4. [`adr/0018-control-handoff-separates-orchestration-from-target-adaptation.md`](./adr/0018-control-handoff-separates-orchestration-from-target-adaptation.md)
   - current ownership boundary between Prelude orchestration and
     Harness-delivered Target Adaptation.

No other architecture document is required to determine current behavior. For
the canonical tree archive protocol specifically, the Contract package
[`README.md`](../packages/harness-contract/README.md#canonical-tree-archive-protocol)
is the task-local normative source referenced by the V2 contract.

## Document Classification

| Document | Classification | Use |
| --- | --- | --- |
| [`README.md`](./README.md) | normative-current | Authority and navigation |
| [`CONTEXT.md`](./CONTEXT.md) | normative-current | Current domain language and ownership |
| [`v2-harness-convergence-contract.md`](./v2-harness-convergence-contract.md) | normative-current | Current protocol and lifecycle behavior |
| [`adr/0018-control-handoff-separates-orchestration-from-target-adaptation.md`](./adr/0018-control-handoff-separates-orchestration-from-target-adaptation.md) | normative-current | Current Control Handoff decision |
| [`harness-convergence-goal.md`](./harness-convergence-goal.md) | rationale | First-principles goal and released V1 examples |
| [`multi-harness-convergence-architecture.md`](./multi-harness-convergence-architecture.md) | rationale | Released V1 architecture |
| [`harness-module-contract.md`](./harness-module-contract.md) | rationale | Released V1 contract reasoning |
| [`harness-integration-lifecycle.md`](./harness-integration-lifecycle.md) | rationale | Released V1 lifecycle reasoning |
| [`architecture-review.md`](./architecture-review.md) | rationale | V1 pressure-test record |
| [`prelude-rebuild-plan.md`](./prelude-rebuild-plan.md) | implementation-plan | Completed V1 delivery plan |
| [`architecture-handoff.md`](./architecture-handoff.md) | history | Superseded V1 implementation handoff |
| [`adr/0001-*.md`](./adr/0001-prelude-is-the-target-mutation-host.md) through [`adr/0017-*.md`](./adr/0017-rewrite-the-v1-runtime-in-effect.md) | rationale | Accepted decision history; V2 contract and ADR-0018 govern conflicts |

Frontmatter is machine-checked. `status` records lifecycle while
`classification` records authority: an accepted ADR can therefore remain
accepted rationale without being current normative authority.

## V2 Gate Baseline

V2 Gate 1 is complete only when isolated single-package and pnpm-workspace
Targets select and run real packed Prelude and Effect Harness Artifacts.
It closed on 2026-07-14 through the release-level cross-repository Gate and is
published as Prelude `0.4.0`, Contract `0.2.2`, Effect Harness `0.3.0`, and
Partita `0.2.2`.

```text
root package.json + pnpm-lock.yaml
  -> root-selected Prelude and Effect Harness Artifacts
  -> committed .prelude/config.jsonc with explicit packageRoots
  -> one read-only Harness Module plan
  -> global composition
  -> one visible, versioned, hashed Plan Document
  -> exact approval
  -> apply
  -> target-executed prelude check
```

The shared package `@sayoriqwq/prelude-contract` is the only integration seam.
Prelude does not know Effect or Psychogram domain semantics, and Harnesses do
not write active managed surfaces directly.

Psychogram and multi-Harness composition remain architectural goals, not part
of the closed V2 Gate 1 proof above.

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

## Consistency Checklist

When architecture behavior changes:

1. Update the minimum normative V2 reading set first.
2. Classify any new architecture document in frontmatter and in the table
   above; do not silently expand the required reading set.
3. Keep rationale, plans, and history explanatory. If a statement is
   superseded, link its current replacement directly from that document.
4. Keep Gate descriptions consistent with the acceptance proof they describe.
5. Run the documentation-authority test with the normal Prelude verification
   suite.

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
