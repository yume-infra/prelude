@/Users/sayori/.codex/RTK.md

# AGENTS.md

## Source Of Truth

`docs/` is the only active project knowledge source for this repository.

Start with:

1. `docs/README.md`
2. `docs/prelude-goal.md`
3. `docs/create-maintain-architecture.md`
4. `docs/prelude-final-state.md`
5. `docs/prelude-rebuild-plan.md`
6. `docs/create-materialization-architecture.md`
7. `docs/maintain-architecture.md`

There is no active Trellis workflow in this repository and no project-local
skill baseline to maintain. Do not recreate `.trellis/` or `.agents/skills/`
unless the user explicitly asks for a new system with that exact shape.

## Architecture Stance

The rebuild target is the final architecture, not a transitional state.

The core architecture has two mainlines:

```text
create:
CreateSpec
  -> create resolver
  -> resolved create graph
  -> capability modules
  -> create surfaces
  -> create WritePlan
  -> files
  -> create verification
  -> handoff

maintain:
maintain config
  -> maintain resolver
  -> managed claims
  -> maintain manifest
  -> status | verify | update
  -> desired/base/current reconcile
  -> maintain WritePlan
  -> managed surface updates
  -> refreshed manifest base
```

Do not preserve rejected concepts as target architecture:

- no preset product model; reusable shapes are saved `CreateSpec` files
- no `ProjectConfig` creation truth
- no Plan / PlanSpec creation truth
- no global Handlebars or template-rendering layer
- no capability-owned direct file writes
- no general generated-project update surface

If rejected implementation code blocks the final model, prefer deleting it over building a
compatibility layer.

## Project Notes

- Generated React/Vue full scaffolds may emit Tailwind CSS / Lightning CSS
  unknown at-rule warnings during Vite production builds. Treat those warnings
  as non-blocking when the build completes and generated lint checks pass.
- npm publishing for this repository is handled by
  `.github/workflows/release.yml` on `main` pushes or manual workflow dispatch.
  Do not treat local `npm whoami` / `ENEEDAUTH` as a release blocker unless the
  user explicitly asks for local publishing.

## Agent Configuration

Repo-local agent configuration lives under `docs/agents/`.

- Issues and PRDs are tracked in GitHub Issues for `yume-infra/prelude`.
- Use the default triage labels: `needs-triage`, `needs-info`,
  `ready-for-agent`, `ready-for-human`, and `wontfix`.
- Domain reading starts at `docs/README.md`.

<!-- eslint-disable markdown/no-multiple-h1 -->
<!-- effect-harness:start -->
# Effect Harness

This repo uses `/Users/sayori/Desktop/yume-infra/effect-harness` as its Effect harness root.

Before writing non-trivial Effect code, read:

- `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect/LLMS.md`
- `/Users/sayori/Desktop/yume-infra/effect-harness/harness/index.md`
- `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect.subtree.json`
- `.effect-harness.json`

Runtime skills and agents installed by the harness:

- Use `.codex/skills/effect-code/SKILL.md` for Effect implementation and review.
- Use `.codex/skills/effect-feedback/SKILL.md` for reusable target feedback.
- Use `.codex/agents/effect-worker.md` when delegating focused Effect subagent work.

Use:

```bash
pnpm effect:status
pnpm effect:verify
pnpm verify
```

Do not import from `/Users/sayori/Desktop/yume-infra/effect-harness/repos/effect`.
Do not copy effect-harness `.codex/skills`; this target only uses the runtime installed under
`.codex/`.
<!-- effect-harness:end -->
<!-- eslint-enable markdown/no-multiple-h1 -->
