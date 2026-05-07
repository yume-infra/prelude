# yume docs/spec sync skill

## Goal

Create `.agents/skills/yume-docs-spec-sync`, a create-yume-specific workflow skill that helps agents decide whether a change requires `.trellis/spec/`, `.trellis/user/`, or no knowledge update, then produce an explicit Phase 3.3-style judgment with concrete file targets.

## Requirements

- Add a project-local skill named `yume-docs-spec-sync`.
- Trigger the skill when work changes create-yume supported scope, architecture, generated behavior, verification rules, package roles, onboarding/reading order, or agent-facing implementation contracts.
- Keep the workflow create-yume-specific; do not duplicate generic `trellis-update-spec`.
- Encode the repository source-of-truth split:
  - `.trellis/spec/` stores executable agent-facing contracts.
  - `.trellis/user/` stores Simplified Chinese human-facing project context.
  - `docs/` is not a project knowledge source of truth.
- Require agents to inspect the changed surface and relevant specs before deciding.
- Require an explicit final judgment: spec update needed, user doc update needed, both, or neither.
- Provide lightweight output templates for the sync judgment and handoff.
- Add `agents/openai.yaml` metadata for the skill.

## Acceptance Criteria

- [x] `.agents/skills/yume-docs-spec-sync/SKILL.md` exists with valid skill frontmatter.
- [x] The skill names concrete trigger conditions and create-yume-specific knowledge boundaries.
- [x] The skill instructs agents to inspect changed files and relevant `.trellis/spec/create-yume/**` indexes before making a judgment.
- [x] The skill includes a concise final judgment format.
- [x] Skill validation passes with `quick_validate.py`.

## Definition of Done

- Validate skill structure.
- Cold-read the skill for trigger clarity and non-duplication with `trellis-update-spec`.
- Record whether additional spec/user docs need updates for this skill-only change.

## Out of Scope

- Editing generic Trellis lifecycle skills.
- Automatically modifying specs or user docs via a script.
- Renaming existing non-prefixed skills.
- Implementing the later skill-improver workflow.

## Technical Notes

- Relevant spec references: `.trellis/spec/create-yume/repository/index.md`, `.trellis/spec/create-yume/verification/index.md`, `.trellis/spec/guides/index.md`.
- Related skills: `.agents/skills/trellis-update-spec/SKILL.md`, `.agents/skills/trellis-check/SKILL.md`, `.agents/skills/trellis-finish-work/SKILL.md`.
- The skill should be small and procedural; references/scripts are not required for the MVP.
- Implemented `.agents/skills/yume-docs-spec-sync/SKILL.md`.
- Added `.agents/skills/yume-docs-spec-sync/agents/openai.yaml`.
- Validation: `python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/yume-docs-spec-sync` passed.

## Knowledge Sync Judgment

- `.trellis/spec/` update: no
  - Target: none
  - Reason: this task adds a project-local skill that restates and operationalizes existing repository/verification knowledge boundaries; it does not change create-yume product behavior, generated output contracts, or verification policy.
- `.trellis/user/` update: no
  - Target: none
  - Reason: this does not change how humans should understand the create-yume package map, supported scope, architecture, or onboarding path.
- Existing contract followed: repository source-of-truth split between `.trellis/spec/` and `.trellis/user/`, plus skill validation from `skill-creator`.
- Verification: skill quick validation plus manual cold read.
- Residual risk: the current Codex session's injected skill list will not include the new skill until a future discovery/session refresh, but the project-local skill files are present.
