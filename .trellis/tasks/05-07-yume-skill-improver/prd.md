# yume skill improver skill

## Goal

Create a future `yume-skill-improver` skill for revising a project-local skill when a user observes that it performed poorly, missed context, asked bad questions, produced weak outputs, or caused rework.

## Requirements

- Use the `yume-` prefix for the skill.
- Start from concrete execution evidence: user complaint, transcript excerpt, bad output, missed file, wrong trigger, failed command, or weak handoff.
- Diagnose whether the issue is trigger metadata, missing workflow steps, missing reference material, missing scripts, over-broad instructions, stale project knowledge, or insufficient validation.
- Patch the skill with minimal durable changes and validate it.
- Prefer forward-testing with subagents when the revision is behaviorally complex.

## Acceptance Criteria

- [ ] Skill candidate has clear trigger conditions.
- [ ] Workflow turns real failures into concrete skill changes.
- [ ] Output includes validation evidence and residual risk.

## Out of Scope

- Implementing this skill in the current pass.
