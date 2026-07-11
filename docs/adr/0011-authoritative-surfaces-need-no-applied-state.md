---
status: accepted
date: 2026-07-10
amended: 2026-07-12
---

# Coarse authoritative surfaces need no applied state directory

Selected Harness Artifacts and Integration config are the complete current desired truth. Prelude does not persist previous bases, receipts, drift history, seed handoffs, ownership transitions, or a managed output inventory.

A Managed Tree is the primary V1 authority unit. It references one static directory inside the selected Harness Artifact and one exclusive target root. Prelude compares tree digests, stages the complete Artifact tree, and replaces the target root as a unit. It does not model per-file add, replace, delete, rename, retirement, or handoff semantics inside that tree. File-level path and text differences are display evidence only.

Everything outside an authoritative root or bounded shared locator is target-owned by default. V1 has no `ExtensionSurface` contract type. For example, Effect may own `effect/managed/**` while `effect/feedback/**` remains ordinary target content; Psychogram may own `psychogram/managed/**` while real wikis remain target content under `psychogram/wikis/**`.

Tree-external shared outputs use narrow logical locators such as managed text blocks or structured values. In V1, omission means Prelude makes no request; it does not mean delete. The Prelude-owned upgrade/reconciliation skill compares old and new Plan Documents and handles suspicious residue after user approval.

## Consequences

Target edits inside a Managed Tree are unsupported and disappear on replacement. Target content outside managed authority is never changed by core merely because it is near a Harness namespace.

V1 does not define or create a `.prelude/` directory at all. The committed control plane is `prelude.config.jsonc`, `package.json`, and `pnpm-lock.yaml`; runtime locks and old/new Plan snapshots use process or operating-system temporary storage, and tree staging uses temporary siblings that are cleaned after the operation. A legacy `.prelude/` is old-architecture residue which a user-authorized reconciliation skill may propose deleting after inspection.

Effect Harness supplies a complete, directly maintained static target bundle for `effect/managed`. Psychogram supplies complete `harness/**`, complete `template/**`, and the complete Codex projection for `psychogram/managed`. Fixtures, source-repository maintenance material, and unrelated runtime projections remain Artifact-internal.
