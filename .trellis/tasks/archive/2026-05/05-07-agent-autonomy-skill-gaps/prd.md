# brainstorm: agent autonomy skill gaps

## Goal

Identify what is missing from the project-local `.agents/skills` layer so future agents can operate more autonomously in this repository: discover repeatable workflows, choose the right procedure without relying on chat memory, preserve decisions as executable guidance, and reduce repeated manual orchestration by the user.

## What I already know

- The user wants to focus on `/Users/sayori/Desktop/create-yume/.agents/skills`.
- The two non-`trellis-` project-local skills are `generated-scaffold-audit` and `update-template-deps`.
- `generated-scaffold-audit` captures an output-first generated scaffold audit workflow with report templates, classification vocabulary, and generated quality boundaries.
- `update-template-deps` captures dependency maintenance for generated template manifests via a bundled `taze` probe/update script.
- Trellis-managed skills cover generic workflow phases: brainstorm, before-dev, check, continue, finish-work, break-loop, update-spec, and meta customization.
- Prior task context says project-local skills are intended to be discoverable and evolvable with the repository.

## Assumptions (temporary)

- "Agent autonomy vision" means agents should be able to run high-value recurring repository workflows with minimal user prompting, while still preserving quality gates, evidence, and handoff context.
- The missing layer is probably not another generic Trellis workflow skill; it is likely create-yume-specific operational knowledge that currently lives in the user's head, archived PRDs, or ad hoc session behavior.
- The useful output of this brainstorm may be a prioritized list of new candidate skills, not immediate implementation.

## Open Questions

- None for the current dispatch decision. The user selected implementation order and naming convention.

## Requirements (evolving)

- Inventory the existing project-local skills and identify what recurring repository workflows they already automate.
- Distinguish create-yume-specific skills from generic Trellis lifecycle skills.
- Propose concrete missing skill candidates with clear trigger conditions and expected agent behavior.
- Keep the first MVP narrow enough to implement as one or two durable skills later.
- Use `yume-` as the prefix for create-yume-specific project-local workflow skills, analogous to `trellis-` for Trellis lifecycle skills.
- Dispatch the four missing workflow skills as child tasks in this order: docs/spec sync, template/source-map fixer, preset expansion planning, release readiness.
- Do not assume the two existing non-`trellis-` skills are correct; review them in a separate follow-up child task.
- Add a final child task for a skill-improver workflow that helps future agents revise underperforming skills based on real execution problems.

## Acceptance Criteria (evolving)

- [x] Existing project-local skills are summarized by purpose, trigger, and covered failure mode.
- [x] Missing skill candidates are grouped by autonomy value and implementation cost.
- [x] MVP candidate selected: `yume-docs-spec-sync`.
- [x] Out-of-scope automation is explicitly named.
- [x] Child task sequence created under this parent task.

## Child Task Sequence

1. [`05-07-yume-docs-spec-sync`](../05-07-yume-docs-spec-sync/prd.md) — implement the docs/spec sync workflow skill first.
2. [`05-07-yume-template-source-map-fixer`](../05-07-yume-template-source-map-fixer/prd.md) — later implement source-map guided generated-template fixing.
3. [`05-07-yume-preset-expansion-planning`](../05-07-yume-preset-expansion-planning/prd.md) — later implement preset expansion planning.
4. [`05-07-yume-release-readiness`](../05-07-yume-release-readiness/prd.md) — later implement release readiness review.
5. [`05-07-yume-existing-skill-audit`](../05-07-yume-existing-skill-audit/prd.md) — later audit and potentially rename/refactor existing non-`trellis-` skills.
6. [`05-07-yume-skill-improver`](../05-07-yume-skill-improver/prd.md) — later implement a skill for revising underperforming skills.

## Lead Execution Summary

- `yume-docs-spec-sync` was already implemented before this lead execution pass.
- Wave 1 completed and was committed as `8069de4 feat: add yume wave 1 workflow skills`.
  - Added `yume-template-source-map-fixer`.
  - Added `yume-preset-expansion-planning`.
- Wave 2 completed and was committed as `64d5ed9 feat: add yume wave 2 workflow skills`.
  - Added `yume-release-readiness`.
  - Added `yume-skill-improver`.
- Wave 3 completed and was committed as `7373e7c docs: audit existing project-local skills`.
  - Audited `generated-scaffold-audit`.
  - Audited `update-template-deps`.
  - Recorded follow-up recommendations without renaming or editing existing skills.
- Validation included `quick_validate.py` for every new skill and for both audited existing skills, plus `git diff --check`.

## Decision (ADR-lite)

**Context**: The repository now has generic Trellis lifecycle skills and create-yume-specific skills mixed under `.agents/skills`.

**Decision**: Use `yume-` as the namespace prefix for create-yume-specific workflow skills. Implement new skills with that prefix. Existing non-prefixed skills will be audited later instead of assumed correct or renamed blindly.

**Consequences**: Skill routing becomes easier to reason about: `trellis-*` means lifecycle/workflow infrastructure, while `yume-*` means create-yume product/repository automation. Existing skill migration remains an explicit review task.

## Definition of Done (team quality bar)

- Tests added/updated if implementation follows from this brainstorm.
- Lint / typecheck / CI green if implementation follows from this brainstorm.
- Docs/notes updated if behavior changes.
- Rollout/rollback considered if risky.

## Out of Scope (explicit)

- Replacing Trellis core lifecycle skills.
- Adding scheduled/background automation unless explicitly selected later.
- Renaming or changing existing non-`trellis-` skills before the existing-skill audit task.

## Technical Notes

- Inspected `.agents/skills` directory.
- Inspected `.agents/skills/generated-scaffold-audit/SKILL.md`.
- Inspected `.agents/skills/update-template-deps/SKILL.md`.
- Inspected archived PRD for `update-template-deps`.
- Existing non-`trellis-` skills represent two proven patterns:
  - Evidence-producing audit workflow.
  - Script-backed maintenance workflow.
