## Current Knowledge Source Override

`docs/` is the active project knowledge source. The Trellis block below is
historical reference only and is superseded by the project notes after it.

<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/user/` — human-facing project context docs (project map, reading order, architecture notes)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

## Subagents

- ALWAYS wait for all subagents to complete before yielding.
- Spawn subagents automatically when:
  - Parallelizable work (e.g., install + verify, npm test + typecheck, multiple tasks from plan)
  - Long-running or blocking tasks where a worker can run independently.
  - Isolation for risky changes or checks

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

## Project Notes

- Current project knowledge lives in `docs/`. Start with `docs/README.md`, then
  read `docs/prelude-goal.md`, `docs/prelude-final-state.md`, and
  `docs/manifest-materialization-architecture.md` as needed.
- `.trellis/` is deprecated historical reference only. Do not treat it as the
  active workflow, active spec, or current user documentation. Do not create or
  update `.trellis/` tasks, specs, user docs, or workspace journals unless the
  user explicitly asks for history mining or a one-off history extraction task.
- If `.trellis/` conflicts with `docs/`, `docs/` wins.
- Generated React/Vue full presets can emit Tailwind CSS / Lightning CSS unknown at-rule warnings during Vite production builds. Treat those warnings as expected and non-blocking when the build completes and generated lint checks pass.
- npm publishing for this repository is handled by `.github/workflows/release.yml` on `main` pushes or manual workflow dispatch. Do not treat local `npm whoami` / `ENEEDAUTH` as a release blocker unless the user explicitly asks for local publishing.

## Skill Workflow Usage

- When a user names a project-local skill or the task matches a skill description, open that skill's `SKILL.md` before acting and follow its routed workflow, required reading, validation, and output contract. Do not treat loading the skill as sufficient by itself.
- For generated scaffold quality work, route evidence-only audits to `generated-scaffold-audit`; route generated-output source fixes to `yume-template-source-map-fixer`; route regressions in skill behavior, workflow gaps, or missed validation to `yume-skill-improver`.
- If multiple skills apply, state the order, use the minimal set that covers the task, and preserve each skill's phase boundary: audit evidence first, source-map/fix second, skill/process improvement only when the failure is in guidance or workflow.
- If platform instructions restrict subagent use, satisfy the requested verification intent with local or serialized checks and say so in the handoff instead of silently skipping the risk.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `sayoriqwq/create-yume`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-label triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context docs layout rooted at `docs/README.md`. See `docs/agents/domain.md`.
