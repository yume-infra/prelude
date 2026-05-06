# Phase Roadmap Contracts

> Durable migration of former working-doc phase contracts into `.trellis/spec`.

---

## Purpose

This file preserves stable phase handoff and scheduling contracts that still affect generated scaffold quality, package manifest evolution, preview/dry-run behavior, command diagnostics, and post-generate file actions.

## Phase 2

Phase 2 handoff remains connected to:

- M005
- S04
- S05
- generated-scaffold-audit
- smoke:generated
- smoke:examples
- --max-warnings=0

The minimal preset lint policy must remain build-only. Tailwind/lightningcss evidence is a build/dependency warning family, not a lint warning. React Router static imports stay a closed strategy boundary unless a real smoke failure appears. JSON ordering strategy stays a closed strategy boundary unless a real smoke failure appears.

## Phase 3

M006: Structured Package Manifest Contributions.

- depends_on M005.
- Verification expectations: package manifest contribution tests, deterministic ordering, conflict diagnostics, and planner snapshots.

M007: Plan Preview and Dry Run.

- depends_on M006.
- M007 waits for M006 because preview must explain owner contribution and file action data instead of guessing runtime state.
- Verification expectations: PlanSpec projection tests, dry-run output assertions, and no-write/no-command checks.

## Phase 4

M008: Command Output Diagnostics.

- depends_on M005.
- Verification expectations: command failure tests preserving command, args, cwd, cause, stdout/stderr/output when available.

M009: Post-Generate File Task Normalization.

- depends_on M006 and M008.
- M009 remains draft/blocking until both M006 and M008 are complete, because file actions must be explainable in PlanSpec and preserve failure diagnostics.
- Verification expectations: command-before-file-action order, rollback on file action failure, dry-run visibility, and generated hook content checks.

## Parallel Scheduling

For `/gsd parallel start` style planning after M005:

- M006 and M008 are safe to run in parallel after M005.
- M007 waits for M006.
- M009 waits for both M006 and M008.

This scheduling contract is historical context only; new work should create current Trellis tasks and curate `implement.jsonl` / `check.jsonl` instead of depending on old working-doc folders.
