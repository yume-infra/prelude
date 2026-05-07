# Bootstrap: Trellis Source Of Truth Alignment

## Goal

Replace the pre-Trellis `docs/` simulation with Trellis-native knowledge:

- `.trellis/spec/` is the executable agent-facing source of truth.
- `.trellis/user/` is the human-facing project map.
- `AGENTS.md` and `README.md` route readers to Trellis, not `docs/`.

## Requirements

- Do not model create-yume as a traditional web app split.
- Restructure `create-yume` specs around CLI monorepo domains: CLI runtime, generation model, template system, workspace packages, verification, Effect, and repository rules.
- Preserve stable contracts from old docs in the new spec/user structure.
- Migrate generated scaffold audit and phase handoff tests away from `docs/working`.
- Remove `docs/` after all live references are gone.

## Acceptance Criteria

- [x] `.trellis/spec/create-yume/` contains domain-specific layers.
- [x] `.trellis/spec/examples/` describes generated smoke instead of generic app layers.
- [x] `.trellis/user/` exists and explains project map, supported scaffolds, and contribution workflow.
- [x] `AGENTS.md` and `README.md` point to `.trellis/` source of truth.
- [x] No active test, skill, README, or AGENTS entry depends on `docs/`.
- [x] Documentation contract tests pass.

## Technical Notes

The local Trellis scripts now treat context initialization as `spec-layer | all` first, with legacy aliases kept only for compatibility.
