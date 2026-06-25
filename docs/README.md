# Prelude Docs

This directory is the active knowledge source for the `prelude` rebuild.

The docs describe the final architecture directly. Do not record migration
states, compatibility adapters, or old baselines as durable architecture.

## Read Order

1. [`prelude-goal.md`](./prelude-goal.md)
   - Product goal, first user, non-goals, ownership model, and lifecycle update
     boundary.
2. [`prelude-final-state.md`](./prelude-final-state.md)
   - The target architecture after the rebuild is complete.
3. [`prelude-rebuild-plan.md`](./prelude-rebuild-plan.md)
   - What to delete, what to build, and how to know the rebuild is aligned.
4. [`manifest-materialization-architecture.md`](./manifest-materialization-architecture.md)
   - The composition, logical surface, materializer, write plan, manifest, and
     managed-surface reconciliation model.
5. [`provider-lifecycle-architecture.md`](./provider-lifecycle-architecture.md)
   - The lifecycle provider contract, status/verify/update semantics,
     contribution-level lifecycle, centralized provider state, and post-create
     write rules.
6. [`agents/`](./agents/)
   - Repo-local configuration for issue tracking, triage labels, and domain-doc
     reading rules.

## Current Contract

- Product direction: [`prelude-goal.md`](./prelude-goal.md)
- Target architecture: [`prelude-final-state.md`](./prelude-final-state.md)
- Rebuild execution: [`prelude-rebuild-plan.md`](./prelude-rebuild-plan.md)
- Materialization model: [`manifest-materialization-architecture.md`](./manifest-materialization-architecture.md)
- Provider lifecycle model: [`provider-lifecycle-architecture.md`](./provider-lifecycle-architecture.md)
- Agent workflow configuration: [`agents/`](./agents/)

## Documentation Policy

Keep docs organized by purpose:

- Goal documents explain why the product exists.
- Final-state architecture documents explain what the finished system must look
  like.
- Rebuild plans name deletion targets, construction targets, and acceptance
  criteria.
- Materialization documents explain how resolved intent becomes files and a
  manifest base for reconciliation.
- Provider lifecycle documents explain what may still evolve after create.
- Agent docs explain how external engineering skills should operate in this
  repo.

Temporary implementation stages do not belong in durable architecture docs.
