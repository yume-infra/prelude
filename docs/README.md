# Prelude Docs

This directory is the active knowledge source for the `prelude` rebuild.

The previous `.trellis/` knowledge system is deprecated. It may be consulted as
historical reference, but it is not the current source of truth and should not be
updated as part of ordinary project work.

## Read Order

1. [`prelude-goal.md`](./prelude-goal.md)
   - Product goal, user, non-goals, ownership model, and upgrade expectations.
2. [`prelude-final-state.md`](./prelude-final-state.md)
   - The target architecture after the rebuild is complete.
3. [`manifest-materialization-architecture.md`](./manifest-materialization-architecture.md)
   - The file-writing, logical surface, materializer, manifest, and update
     model.
4. [`agents/`](./agents/)
   - Repo-local configuration for engineering skills: issue tracker, triage
     labels, and domain-doc reading rules.

## Current Source Of Truth

Use these docs as the current contract:

- Product direction: [`prelude-goal.md`](./prelude-goal.md)
- Target architecture: [`prelude-final-state.md`](./prelude-final-state.md)
- Materialization model: [`manifest-materialization-architecture.md`](./manifest-materialization-architecture.md)
- Agent workflow configuration: [`agents/`](./agents/)

## Deprecated Reference

`.trellis/` is historical reference only.

Agents may read `.trellis/` to recover prior context or implementation history,
but must not treat it as the active workflow, active spec, or current human
documentation. Do not create or update `.trellis/` tasks, specs, user docs, or
workspace journals unless the user explicitly asks for a one-off history mining
or history extraction task.

When `.trellis/` conflicts with `docs/`, `docs/` wins.

## Documentation Policy

Keep docs organized by purpose:

- Goal documents explain why the product exists.
- Final-state architecture documents explain what the finished system must look
  like.
- Materialization documents explain how resolved intent becomes files and a
  manifest.
- Agent docs explain how repo-local engineering skills should operate.

Avoid recording temporary implementation stages as durable product architecture.
