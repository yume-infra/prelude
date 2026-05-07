# yume template/source-map fixer skill

## Goal

Create a future `yume-template-source-map-fixer` skill that starts from generated-output symptoms, maps failures back to the durable template/runtime owner, fixes the source, and verifies the affected generated surface.

## Requirements

- Use the `yume-` prefix for the skill.
- Build on, but do not assume correctness of, the existing generated scaffold audit workflow.
- Preserve the rule that agents fix generator source files, not ignored generated output.
- Include source-map reasoning from generated path or command output to template fragment, owner, manifest policy, or verification gate.

## Acceptance Criteria

- [ ] Skill candidate has clear trigger conditions.
- [ ] Workflow distinguishes audit/report work from source-fixing work.
- [ ] Verification guidance maps to affected generated surfaces.

## Out of Scope

- Implementing this skill in the current pass.
