# dogfood yume ai infrastructure skills

## Goal

Run one real workflow pass using the newly added create-yume AI infrastructure skills, treating the recent skill-layer work as the release slice. Produce a blocker-first release readiness judgment, a docs/spec sync judgment, and a skill-improvement judgment based on actual usage evidence.

## What I Already Know

- The recent work added the `yume-` project-local skill layer for create-yume workflows.
- The skills available for this pass include `yume-release-readiness`, `yume-docs-spec-sync`, `yume-template-source-map-fixer`, `yume-preset-expansion-planning`, and `yume-skill-improver`.
- The prior task tree was archived and the working tree was clean before this task was created.
- This pass should exercise the new routing layer rather than change product runtime behavior.

## Requirements

- Use `yume-release-readiness` to review the current `dev` branch against `main`.
- Use `yume-docs-spec-sync` to decide whether this dogfood pass reveals missing `.trellis/spec/` or `.trellis/user/` updates.
- Use `yume-skill-improver` only if the pass produces concrete evidence that one of the new skills has weak trigger metadata, missing workflow steps, weak output, or validation gaps.
- Route generated-output symptoms to `yume-template-source-map-fixer` only if release readiness finds an actual generated scaffold symptom requiring durable source fixing.
- Route preset/supported-scope planning to `yume-preset-expansion-planning` only if release readiness finds a product-scope planning gap.
- Do not rename or edit existing skills unless concrete dogfood evidence justifies a scoped skill-improvement patch.

## Acceptance Criteria

- [x] Release readiness checklist is recorded with blockers, residual risks, verification evidence, and comparison summary.
- [x] Knowledge Sync Judgment is recorded.
- [x] Skill-improvement judgment is recorded, including whether any skill patch is needed.
- [x] Any verification commands run are recorded with pass/fail status.
- [x] Task is ready to archive after completion because no further implementation is needed.

## Definition of Done

- Working tree is clean or only contains committed task/journal/archive updates.
- Any skill changes, if made, pass `quick_validate.py` and `git diff --check`.
- If no skill changes are made, the PRD records why.
- Session journal records the dogfood pass.

## Out of Scope

- Broad product release preparation beyond this dogfood slice.
- Renaming `generated-scaffold-audit` or `update-template-deps`.
- Running generated scaffold source fixes without an observed generated-output symptom.
- Planning new presets without an observed supported-scope planning gap.

## Technical Notes

- Triggered skills: `yume-release-readiness`, `yume-docs-spec-sync`, and conditionally `yume-skill-improver`.
- Current base branch in task metadata is `dev`; release readiness will explicitly compare against `main` per skill guidance.

## Release Readiness: Ready With Risks

### Blockers

No P0/P1 release blockers found for the AI infrastructure slice.

### Residual Risks

- [P2] Dogfood task changes are still local until this task is committed and archived.
  - Evidence: `git status --short` shows `.trellis/tasks/05-07-dogfood-yume-ai-infrastructure-skills/` plus the dogfood patch to `yume-release-readiness`.
  - Acceptance rationale: these are task-local records plus a targeted skill-instruction fix; they do not affect generated runtime output.
  - Follow-up: commit this task, archive it, and record the session before treating the branch as release-clean.

- [P2] Release notes should mention internal AI workflow infrastructure if this branch is released as a maintainer-facing slice.
  - Evidence: `main...HEAD` adds `yume-docs-spec-sync`, `yume-template-source-map-fixer`, `yume-preset-expansion-planning`, `yume-release-readiness`, and `yume-skill-improver`.
  - Acceptance rationale: no package runtime or generated scaffold behavior changed, so this is not an end-user migration blocker.
  - Follow-up: summarize as internal/project workflow infrastructure in release notes if release notes include repository-maintainer changes.

### Verification Evidence

| Surface | Required command | Result | Evidence |
| --- | --- | --- | --- |
| Release baseline | `git fetch origin --prune`; `git rev-parse main origin/main HEAD`; `git merge-base main HEAD` | pass | `main` and `origin/main` both at `9dbb2dd`; merge base is `9dbb2dd`; `HEAD` is `7cfb55b` before this dogfood task commit. |
| Changed project-local skills | `python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/<skill-name>` | pass | Passed for all five `yume-*` skills and both existing support skills: `generated-scaffold-audit`, `update-template-deps`. |
| Dogfood skill patch | `python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/yume-release-readiness` | pass | Passed after adding project-local skill verification guidance. |
| Whitespace/diff hygiene | `git diff --check` | pass | Passed before and after the dogfood skill patch. |
| Repository verification | `pnpm verify` | pass | Build passed; Vitest passed with 33 files and 300 tests; eslint and knip completed successfully. |
| Task context | `python3 ./.trellis/scripts/task.py validate 05-07-dogfood-yume-ai-infrastructure-skills` | pass | `implement.jsonl` 8 entries and `check.jsonl` 5 entries validated. |

### Comparison Summary

- Base: `main` / `origin/main` at `9dbb2ddb08653a1d57ab40116df4d3fbd34532e2`
- Head before dogfood task commit: `dev` at `7cfb55b81412ec940d68b4e05a2670661a9d8716`
- Merge base: `9dbb2ddb08653a1d57ab40116df4d3fbd34532e2`
- Commit range: `main..dev`
- Changed surfaces:
  - `.agents/skills/yume-*`
  - `.trellis/tasks/archive/**`
  - `.trellis/workspace/sayoriqwq/**`
- Working tree during checklist: contains only this dogfood task plus a targeted `yume-release-readiness` skill-improvement patch.

### Generated Output And Warning Judgment

- Generated surfaces reviewed: none changed in this dogfood slice.
- Smoke selectors used: none; no template, planner, package manifest, CLI runtime, or generated output behavior changed.
- Expected warnings: none observed.
- Unexpected warnings or failures: none observed.
- Generated-output policy followed: no generated output was edited, and no generated-output source-map fix was needed. `yume-template-source-map-fixer` did not trigger beyond routing consideration.

### Dependency And Release Notes Judgment

- Dependency state: no dependency or catalog changes in the AI infrastructure slice.
- Catalog or generated manifest impact: none.
- Release notes required: optional maintainer-facing note for new project-local AI workflow skills.
- Migration or breaking-change notes: none.

## Skill Improvement Summary

- Target skill: `.agents/skills/yume-release-readiness`
- Evidence used: while dogfooding a release-readiness pass for project-local AI infrastructure, the workflow required validating `.agents/skills/**` changes but the skill did not explicitly name project-local skill validation as a changed surface.
- Primary diagnosis: validation gap.
- Patch shape: added a project-local skills comparison surface and a minimum validation command using `quick_validate.py`, `git diff --check`, and manual cold read.
- Files changed: `.agents/skills/yume-release-readiness/SKILL.md`
- Validation: `quick_validate.py .agents/skills/yume-release-readiness` passed; `git diff --check` passed.
- Forward test: this dogfood pass is the forward test; the updated instruction now directly covers the changed surface encountered here.
- Knowledge sync judgment: see below.
- Residual risk: the updated guidance validates skill structure and routing, but does not prove future release reviewers will choose all relevant behavioral checks for complex bundled scripts.

## Skill Routing Judgment

- `yume-release-readiness`: triggered and used as the primary workflow.
- `yume-docs-spec-sync`: triggered for the knowledge-sync decision below.
- `yume-skill-improver`: triggered by concrete dogfood evidence and produced a targeted patch.
- `yume-template-source-map-fixer`: not triggered for implementation because no generated-output symptom was found.
- `yume-preset-expansion-planning`: not triggered for implementation because no new preset, scaffold family, or supported-scope expansion was found.

## Knowledge Sync Judgment

- `.trellis/spec/` update: no
  - Target: n/a
  - Reason: this pass changes project-local workflow skill instructions and task records. It does not create a new executable create-yume product, generated-output, dependency, CLI, template, or verification contract outside the skill itself.
- `.trellis/user/` update: no
  - Target: n/a
  - Reason: human-facing project architecture, supported scaffold scope, onboarding, and operating commands are unchanged.
- Existing contract followed: `.trellis/spec/` remains the executable source of truth, `.trellis/user/` remains human-facing project context, and project-local skill changes are validated with the skill validator plus manual cold read.
- Verification: `quick_validate.py` for changed/relevant skills, `git diff --check`, `task.py validate`, and `pnpm verify`.
- Residual risk: no generated smoke was run because no generated output surface changed; this is acceptable for a skill/task infrastructure slice.
