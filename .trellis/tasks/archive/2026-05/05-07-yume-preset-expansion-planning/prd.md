# yume preset expansion planning skill

## Goal

Create a future `yume-preset-expansion-planning` skill for planning new create-yume presets or scaffold families with explicit scope, contracts, validation matrix, docs/spec sync, and task decomposition.

## Requirements

- Use the `yume-` prefix for the skill.
- Capture planning steps for React/Vue/Node/CLI/library/workspace expansion.
- Force agents to identify affected schema, planner, template, package manifest, smoke, docs, and spec surfaces before implementation.
- Produce implementation-ready child PRDs when a preset expansion is broad.

## Acceptance Criteria

- [x] Skill candidate has clear trigger conditions.
  - Evidence: `.agents/skills/yume-preset-expansion-planning/SKILL.md` defines trigger conditions for new preset names, scaffold family support, workspace package graphs, unsupported-scope exposure, generated output policy, manifests, smoke coverage, and user-facing supported-scope docs.
- [x] Workflow prevents unsupported-scope claims from landing without docs/spec updates.
  - Evidence: the skill classifies unsupported-scope proposals separately, blocks implementation planning until missing spec/user-doc contracts are named, and requires a `yume-docs-spec-sync` Knowledge Sync Judgment.
- [x] Planning output includes verification and ownership boundaries.
  - Evidence: the skill includes an affected-surface checklist, child PRD template, verification matrix guidance, implementation ownership boundaries, and an output checklist.

## Superseded Planning Note

- The original planning pass marked implementation out of scope. Wave 1 Worker B was later assigned to implement the skill directly.

## Implementation Notes

- Implemented as `.agents/skills/yume-preset-expansion-planning/SKILL.md` during Wave 1.
- Kept changes scoped to this new skill and this task PRD.
- Lead validation used `python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/yume-preset-expansion-planning`, which passed, plus a manual cold-read of the skill frontmatter, trigger conditions, checklist coverage, child PRD template, verification guidance, and docs/spec sync judgment path.

## Knowledge Sync Judgment

- `.trellis/spec/` update: no
  - Target: n/a
  - Reason: this is a new project-local workflow skill that routes future planning through existing create-yume generation-model, template-system, workspace-packages, verification, CLI-runtime, and repository contracts; it does not change executable product behavior or durable repository policy.
- `.trellis/user/` update: no
  - Target: n/a
  - Reason: this change does not alter human-facing supported scaffold scope, project map, onboarding, commands, or architecture context.
- Existing contract followed: `yume-` prefix convention, `.trellis/spec/` versus `.trellis/user/` source-of-truth split, generated scaffold supported/unsupported scope, and verification matrix rules.
- Verification: `python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/yume-preset-expansion-planning` passed; manual cold-read completed.
- Residual risk: no automated validator enforces skill metadata or checklist completeness for this new skill yet.
