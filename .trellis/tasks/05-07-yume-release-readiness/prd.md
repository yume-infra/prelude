# yume release readiness skill

## Goal

Create a future `yume-release-readiness` skill that lets agents review current `dev` against `main`, judge whether shipped behavior matches the product slice, and produce a release-blocker checklist with verification evidence.

## Requirements

- Use the `yume-` prefix for the skill.
- Compare implementation, tests, generated smoke, docs/spec/user knowledge, dependency state, and release notes risk.
- Prioritize actionable blockers over summary.
- Preserve create-yume-specific expected warnings and generated output policies.

## Acceptance Criteria

- [ ] Skill candidate has clear trigger conditions.
- [ ] Workflow covers release blockers, residual risks, and minimum verification commands.
- [ ] Output format can be consumed directly as a release readiness checklist.

## Out of Scope

- Implementing this skill in the current pass.
