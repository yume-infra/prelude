# Domain Docs

This repo uses a single-context docs layout rooted in `docs/`.

Engineering skills should consume project knowledge in this order:

1. Read `docs/README.md`.
2. Read `docs/prelude-goal.md` for product intent.
3. Read `docs/prelude-final-state.md` for the target architecture.
4. Read `docs/manifest-materialization-architecture.md` for generation,
   materialization, manifest, and update semantics.
5. Read ADRs under `docs/adr/` if they are introduced later and touch the area
   being changed.

If these files do not exist, proceed silently. Do not create them upfront unless
the task is explicitly about documentation.

## Removed Local Skill Baseline

This repository does not maintain a project-local skill baseline. External
engineering skills may use these docs as context, but should not expect
`.agents/skills/` or workflow-state files to exist.

## Use Domain Vocabulary

When an output names a domain concept in an issue title, refactor proposal,
hypothesis, or test name, use the terms from the active docs.

If the needed concept is absent from active docs, either reconsider whether the
term belongs to this project or note it for a documentation pass.

## ADR Conflicts

If a recommendation contradicts an existing ADR, surface the conflict explicitly
instead of silently overriding it.
