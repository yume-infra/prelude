---
audience: [agent, human]
authors: [codex]
reviewed_by: [sayori]
purpose: Define the authoritative Prelude V1 knowledge set and reading order.
status: active
updated: 2026-07-13
---

# Prelude Docs

## Authority

`docs/` is the only active project knowledge source. Everything under
`docs/archive/` is historical and non-authoritative. The released V1 baseline
is implemented and published as `@sayoriqwq/prelude-contract@0.1.0` and
`@sayoriqwq/prelude@0.2.3`; the tracked legacy root `.prelude/` provider tree
remains under reconciliation audit and is not evidence of the V1 contract.

The current product is a narrow multi-Harness convergence host. It is not a
project generator and has no compatibility obligation to old Prelude commands,
models, manifests, tests, or TUI code.

## Read Order

1. [`CONTEXT.md`](./CONTEXT.md) - domain language and ownership boundaries.
2. [`harness-convergence-goal.md`](./harness-convergence-goal.md) - north star,
   V1 outcome, scope, and non-goals.
3. [`multi-harness-convergence-architecture.md`](./multi-harness-convergence-architecture.md)
   - system boundaries and final operating model.
4. [`harness-module-contract.md`](./harness-module-contract.md) - shared Module
   contract and the four V1 Output capabilities.
5. [`harness-integration-lifecycle.md`](./harness-integration-lifecycle.md) -
   plan, approval, apply, check, bootstrap, and upgrade behavior.
6. [`next-protocol-host-contract.md`](./next-protocol-host-contract.md) -
   accepted post-V1 control and scope semantics plus the remaining design
   branches.
7. [`adr/`](./adr/) - accepted architectural decisions.

Completed implementation records are archived under
[`archive/2026-07-12-v1-release/`](./archive/2026-07-12-v1-release/): the
rebuild plan, architecture review, and architecture handoff. They are retained
for history, not as active requirements.

## V1 Baseline

V1 is complete only when `/Users/sayori/Desktop/yume-infra/partita` selects and
runs real Effect Harness and Psychogram Artifacts at the same time.

```text
root package.json + pnpm-lock.yaml
  -> root-selected Prelude, Effect Harness, and Psychogram Artifacts
  -> committed prelude.config.jsonc
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

V1 implements only:

- `ManagedTree`;
- `ManagedBlock`;
- `JsonValue`;
- `JsonKeyedItem`;
- direct package Requirements;
- blocking Issues;
- post-convergence target command Checks.

The runtime is rewritten in Effect v4. Effect Schema defines committed config
and shared wire codecs; Effect and `@effect/platform` own orchestration, typed
failure, services, resources, filesystem access, and process execution.

## Explicit Absences

V1 has no:

- create, init, scaffold, preset, recipe, provider, or maintain product line;
- `CreateSpec`, create resolver, create WritePlan, or compatibility adapter;
- `.prelude/` directory, manifest, receipt, base snapshot, journal, or applied
  state;
- Owned File, Extension Surface, Manual Action, or general patch capability;
- Harness options in `prelude.config.jsonc`;
- executable-config AST merge;
- TUI delivery obligation;
- support promise for arbitrary third-party Harnesses or non-pnpm targets.

These are V1 behavior and scope statements, not a claim that the tracked
legacy root `.prelude/` provider tree has already been removed; that residue
remains under reconciliation audit.

A future TUI may present the same Plan Document and plan/apply/check lifecycle.
It will be rebuilt from this baseline and will not revive project generation.

## Archive Policy

Archived files may contain words such as `active`, `MUST`, or `final`; those
markers have no current authority. Do not use archived requirements to fill a
gap. A missing current decision remains intentionally unspecified until a real
Effect Harness, Psychogram, or Partita case requires it.
