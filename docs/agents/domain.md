# Domain Docs

This repository uses a single-context docs layout rooted in `docs/`.

Engineering skills should consume project knowledge in this order:

1. Read `docs/README.md` for authority and archive boundaries.
2. Read `docs/CONTEXT.md` for the current domain vocabulary.
3. Read `docs/harness-convergence-goal.md` for product intent and scope.
4. Read `docs/multi-harness-convergence-architecture.md` for system ownership.
5. Read `docs/harness-module-contract.md` for the external extension seam.
6. Read `docs/harness-integration-lifecycle.md` for stateless planning,
   current-to-desired comparison, approval, apply, recovery, and target
   verification.
7. Read `docs/prelude-rebuild-plan.md` for implementation sequence and deletion
   gates.
8. Read accepted decisions under `docs/adr/`.
9. Read `docs/architecture-review.md` and `docs/architecture-handoff.md` when
   continuing the rebuild.

Everything under `docs/archive/` is historical and non-authoritative. Do not
use it to infer current requirements.

## Removed Local Skill Baseline

This repository does not maintain a project-local skill baseline. External
engineering skills may use these docs as context, but should not expect
`.agents/skills/` or workflow-state files to exist.

## Use Domain Vocabulary

When an output names a domain concept in an issue title, refactor proposal,
hypothesis, or test name, use the terms from `docs/CONTEXT.md`.

If a needed concept is absent, record it as an open design question instead of
borrowing a term from archived architecture.

Implementation work must use Effect v4, Effect Schema, and `@effect/platform`
as specified by the active architecture. Exact helper and service names are not
domain requirements; the Partita two-Harness end state is.

Do not preserve create/provider/TUI/state code to keep old tests green. Delete
retired tests and fixtures at the rebuild deletion gate.

## ADR Conflicts

If a recommendation contradicts an accepted ADR, surface the conflict
explicitly instead of silently overriding it.
