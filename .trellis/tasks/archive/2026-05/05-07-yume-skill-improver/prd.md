# yume skill improver skill

## Goal

Create `yume-skill-improver`, a project-local skill for revising another project-local skill when a user observes that it performed poorly, missed context, asked bad questions, produced weak outputs, or caused rework.

## Requirements

- Use the `yume-` prefix for the skill.
- Start from concrete execution evidence: user complaint, transcript excerpt, bad output, missed file, wrong trigger, failed command, or weak handoff.
- Diagnose whether the issue is trigger metadata, missing workflow steps, missing reference material, missing scripts, over-broad instructions, stale project knowledge, or insufficient validation.
- Patch the skill with minimal durable changes and validate it.
- Prefer forward-testing with subagents when the revision is behaviorally complex.

## Acceptance Criteria

- [x] Skill candidate has clear trigger conditions.
  - Evidence: `.agents/skills/yume-skill-improver/SKILL.md` includes frontmatter trigger metadata plus positive and negative trigger conditions.
- [x] Workflow turns real failures into concrete skill changes.
  - Evidence: the skill starts from execution evidence, classifies failures with a diagnosis taxonomy, and maps each class to a durable fix shape before patching.
- [x] Output includes validation evidence and residual risk.
  - Evidence: the output template requires validation, forward-test status, knowledge sync judgment, and residual risk.

## Implementation Notes

- Implemented as a single `SKILL.md` with no bundled resources; the workflow is concise enough that extra references or scripts would add clutter.
- Forward-testing guidance prefers isolated subagents for complex behavioral revisions, but this implementation pass did not require spawning a subagent.

## Knowledge Sync Judgment

- `.trellis/spec/` update: no
  - Target: n/a
  - Reason: this change adds a project-local workflow skill and follows existing repository knowledge-source rules; it does not create a new executable repository, generated-output, dependency, or verification contract.
- `.trellis/user/` update: no
  - Target: n/a
  - Reason: the change does not affect human-facing project navigation, supported scaffold scope, architecture, or operating commands.
- Existing contract followed: project-local skill creation uses the `yume-` prefix convention from the parallel plan and follows `.trellis/spec/create-yume/repository/index.md` documentation ownership rules.
- Verification: `python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/yume-skill-improver` passed; `git diff --check` passed; `git diff --no-index --check -- /dev/null .agents/skills/yume-skill-improver/SKILL.md` passed for the new untracked skill file.
- Residual risk: the skill has not been forward-tested against a future real poor-skill transcript; first use should confirm the diagnosis taxonomy covers the observed failure.
