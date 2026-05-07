# Parallel Plan: Yume Agent Autonomy Skills

## Lead Goal

Implement the `yume-` create-yume-specific workflow skill layer with maximum useful parallelism while avoiding file ownership conflicts and unstable references.

## Naming Decision

- `trellis-*` remains reserved for Trellis lifecycle/workflow infrastructure.
- `yume-*` marks create-yume-specific repository and product workflow skills.
- Existing non-prefixed project-local skills are not assumed correct. They are reviewed in a later serialized audit task.

## Task Order

Requested conceptual order:

1. `05-07-yume-docs-spec-sync` (gap 4)
2. `05-07-yume-template-source-map-fixer` (gap 2)
3. `05-07-yume-preset-expansion-planning` (gap 3)
4. `05-07-yume-release-readiness` (gap 1)
5. `05-07-yume-existing-skill-audit`
6. `05-07-yume-skill-improver`

## Completed Baseline

`05-07-yume-docs-spec-sync` is implemented as `.agents/skills/yume-docs-spec-sync`.

This establishes:

- `yume-` prefix convention.
- create-yume knowledge sync judgment format.
- source-of-truth split for `.trellis/spec/`, `.trellis/user/`, and no `docs/` source of truth.

## Wave Plan

### Wave 1: Parallel Skill Creation

Run these in parallel:

| Task | Write ownership | Notes |
| --- | --- | --- |
| `05-07-yume-template-source-map-fixer` | `.agents/skills/yume-template-source-map-fixer/**`, its task PRD/context | May read `generated-scaffold-audit`, but must not edit or rename it. |
| `05-07-yume-preset-expansion-planning` | `.agents/skills/yume-preset-expansion-planning/**`, its task PRD/context | May read roadmap/archive specs, but must not edit shared existing skills. |

Why parallel:

- Both create new disjoint skill directories.
- Both can share the `yume-` naming convention and skill structure without touching the same files.
- Neither should make decisions about existing skill renames.

### Wave 2: Parallel Higher-Level Workflows

Run these after Wave 1 lands:

| Task | Write ownership | Notes |
| --- | --- | --- |
| `05-07-yume-release-readiness` | `.agents/skills/yume-release-readiness/**`, its task PRD/context | Can reference the new Wave 1 skills as release-review surfaces. |
| `05-07-yume-skill-improver` | `.agents/skills/yume-skill-improver/**`, its task PRD/context | Can use the completed `yume-docs-spec-sync` and Wave 1 skills as realistic examples. |

Why parallel:

- Write sets are disjoint.
- Release readiness and skill improvement are related conceptually but do not need to edit each other.
- Both benefit from Wave 1 examples, so starting them earlier would reduce quality.

### Wave 3: Serialized Existing Skill Audit

Run last:

| Task | Write ownership | Notes |
| --- | --- | --- |
| `05-07-yume-existing-skill-audit` | Audit report and any explicitly approved follow-up edits | May propose renaming or revising `generated-scaffold-audit` and `update-template-deps`. |

Why serialized:

- It may decide whether existing non-prefixed skills should be renamed to `yume-*`, split, or revised.
- Those decisions can affect references from newly created skills.
- Running it in parallel with source-map or release-readiness work would create unstable naming and reference targets.

## Conflict Rules

- Each worker owns exactly one `.agents/skills/yume-*/` directory.
- Workers may read existing skills and specs but must not edit files outside their ownership unless their task PRD explicitly authorizes it.
- Do not rename `generated-scaffold-audit` or `update-template-deps` before `05-07-yume-existing-skill-audit`.
- Do not edit `.trellis/spec/` or `.trellis/user/` unless the task includes an explicit knowledge sync judgment and the change is required.
- If two workers need to update the same parent PRD or shared plan file, the lead agent serializes that update after both workers finish.
- Validate every new skill with `quick_validate.py` before handoff.

## Lead Integration Checklist

After each wave:

- Review worker summaries and changed paths.
- Run `git status --short` and confirm write ownership was respected.
- Validate each new skill with `quick_validate.py`.
- Check task PRDs include acceptance criteria status and knowledge sync judgment.
- Commit each wave separately unless the changes are too small to justify separate commits.
- Start the next wave only after shared references are stable.
