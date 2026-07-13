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
7. Read accepted decisions under `docs/adr/`.

Everything under `docs/archive/` is historical and non-authoritative. Do not
use it to infer current requirements.

The dated V1 archive contains completed implementation, review, and handoff
records that may be consulted as optional historical evidence only. Archived
documents cannot supply current requirements or override active docs and ADRs.

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

Do not preserve create/provider/TUI/state code to keep old tests green. Treat
remaining retired surfaces as rejection evidence and keep them outside the V1
product contract.

## ADR Conflicts

If a recommendation contradicts an accepted ADR, surface the conflict
explicitly instead of silently overriding it.
