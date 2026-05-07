# yume template/source-map fixer skill

## Goal

Create a future `yume-template-source-map-fixer` skill that starts from generated-output symptoms, maps failures back to the durable template/runtime owner, fixes the source, and verifies the affected generated surface.

## Requirements

- Use the `yume-` prefix for the skill.
- Build on, but do not assume correctness of, the existing generated scaffold audit workflow.
- Preserve the rule that agents fix generator source files, not ignored generated output.
- Include source-map reasoning from generated path or command output to template fragment, owner, manifest policy, or verification gate.

## Acceptance Criteria

- [x] Skill candidate has clear trigger conditions.
  - Evidence: `.agents/skills/yume-template-source-map-fixer/SKILL.md` includes trigger conditions for generated-output failures, audit handoffs, ignored generated workspace symptoms, durable template/runtime fixes, and ambiguous source-map work.
- [x] Workflow distinguishes audit/report work from source-fixing work.
  - Evidence: the skill routes report-only evidence gathering to `generated-scaffold-audit`, keeps generated output as symptom evidence, and limits this workflow to durable source fixes.
- [x] Verification guidance maps to affected generated surfaces.
  - Evidence: the skill maps template, planner, manifest, workspace, real generated smoke, full-preset lint, and broad-impact changes to targeted verification commands.

## Knowledge Sync Judgment

- `.trellis/spec/` update: no
  - Target: N/A
  - Reason: This change creates a project-local workflow skill that follows existing repository, template-system, generated smoke, and docs/spec sync contracts without changing the contracts themselves.
- `.trellis/user/` update: no
  - Target: N/A
  - Reason: No human-facing project scope, architecture, reading order, or operational behavior changed.
- Existing contract followed: generated output is evidence only; durable fixes belong in templates, owners, manifest policy, planner/materialization, or verification gates, and task/session notes are not stable project knowledge.
- Verification: `python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/yume-template-source-map-fixer` passed; manual cold read of the new skill and PRD completed.
- Residual risk: The skill is documentation-only and not executable, so future effectiveness depends on agents applying the workflow consistently.

## Out of Scope

- Changing generator source, generated output, existing skills, `.trellis/spec/`, or `.trellis/user/` in this pass.
