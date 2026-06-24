@/Users/sayori/.codex/RTK.md

# AGENTS.md

## Source Of Truth

`docs/` is the only active project knowledge source for this repository.

Start with:

1. `docs/README.md`
2. `docs/prelude-goal.md`
3. `docs/prelude-final-state.md`
4. `docs/prelude-rebuild-plan.md`
5. `docs/manifest-materialization-architecture.md`
6. `docs/provider-lifecycle-architecture.md`

There is no active Trellis workflow in this repository and no project-local
skill baseline to maintain. Do not recreate `.trellis/` or `.agents/skills/`
unless the user explicitly asks for a new system with that exact shape.

## Architecture Stance

The rebuild target is the final architecture, not a migration state.

The core pipeline is:

```text
CreateSpec
  -> Resolver
  -> ResolvedGraph
  -> Capability Contributions
  -> Surface Materializers
  -> WritePlan
  -> Files + .prelude/manifest.json
```

Do not preserve old concepts as target architecture:

- no preset product model; reusable shapes are saved `CreateSpec` files
- no `ProjectConfig` creation truth
- no Plan / PlanSpec creation truth
- no global Handlebars or template-rendering layer
- no capability-owned direct file writes
- no general generated-project update surface

If old code blocks the final model, prefer deleting it over building a
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

- Issues and PRDs are tracked in GitHub Issues for `sayoriqwq/create-yume`.
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
