# yume release readiness skill

## Goal

Create a future `yume-release-readiness` skill that lets agents review current `dev` against `main`, judge whether shipped behavior matches the product slice, and produce a release-blocker checklist with verification evidence.

## Requirements

- Use the `yume-` prefix for the skill.
- Compare implementation, tests, generated smoke, docs/spec/user knowledge, dependency state, and release notes risk.
- Prioritize actionable blockers over summary.
- Preserve create-yume-specific expected warnings and generated output policies.

## Acceptance Criteria

- [x] Skill candidate has clear trigger conditions.
  - Evidence: `.agents/skills/yume-release-readiness/SKILL.md` includes trigger conditions for release readiness, pre-release checks, `dev` versus `main` review, and release-blocker checklist work.
- [x] Workflow covers release blockers, residual risks, and minimum verification commands.
  - Evidence: The skill defines P0/P1/P2 blocker severity, a blocker-first review workflow, changed-surface comparisons, expected-warning handling, generated-output policy, and the create-yume verification matrix.
- [x] Output format can be consumed directly as a release readiness checklist.
  - Evidence: The skill includes a release checklist template with blockers, residual risks, verification evidence, comparison summary, generated-output judgment, dependency/release-notes judgment, and knowledge sync judgment.

## Knowledge Sync Judgment

- `.trellis/spec/` update: no
  - Target: n/a
  - Reason: This change adds a project-local workflow skill that follows existing repository and verification contracts; it does not create a new durable create-yume implementation rule.
- `.trellis/user/` update: no
  - Target: n/a
  - Reason: Human-facing project scope, architecture, reading order, and operating instructions are unchanged.
- Existing contract followed: Repository docs/spec source-of-truth rules and verification matrix from `.trellis/spec/create-yume/repository/index.md` and `.trellis/spec/create-yume/verification/index.md`.
- Verification: Passed `python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/yume-release-readiness` and `git diff --check`.
- Residual risk: The skill has not been exercised against a real release diff in this task.

## Out of Scope

- Modifying release code, generated scaffold output, or existing project-local skills such as `generated-scaffold-audit` and `update-template-deps`.
