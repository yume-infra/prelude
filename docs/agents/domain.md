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

## Deprecated Trellis Reference

The previous `.trellis/` knowledge system is deprecated.

Skills may read `.trellis/` only as historical reference. Do not treat
`.trellis/` as the active workflow, active spec, or current human documentation.
Do not create or update `.trellis/` files unless the user explicitly asks for
history mining or a one-off history extraction task.

When `.trellis/` conflicts with `docs/`, `docs/` wins.

## Use Domain Vocabulary

When an output names a domain concept in an issue title, refactor proposal,
hypothesis, or test name, use the terms from the active docs.

If the needed concept is absent from active docs, either reconsider whether the
term belongs to this project or note it for a documentation pass.

## ADR Conflicts

If a recommendation contradicts an existing ADR, surface the conflict explicitly
instead of silently overriding it.
