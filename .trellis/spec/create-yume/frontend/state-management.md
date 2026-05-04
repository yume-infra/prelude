# State Management

> Local and generated state conventions for React and Vue scaffolds.

---

## Overview

State-management is a scaffold capability owned by `apps/cli/src/core/owners/state-management.ts`. The owner defines predicates, template entries, and dependency contributions.

React and Vue do not share the same state-management model.

## Supported Modes

- React: `jotai`, `zustand`, or `none`.
- Vue: `true` for Pinia or `false` for local state only.
- Full presets enable framework state-management; minimal presets disable it.

## Examples

- `apps/cli/src/schema/project-config.ts` models React state as a literal union and Vue state as a boolean.
- `apps/cli/src/core/owners/state-management.ts` owns `ReactCounterStoreTemplate`, `VueCounterStoreTemplate`, dependency contributions, and capability predicates.
- `apps/cli/templates/fragments/react/Counter.tsx.hbs` generates Jotai, Zustand, or local `useState` code based on config.
- `apps/cli/templates/fragments/vue/counter-store.ts.hbs` is only registered when Vue state-management is enabled.

## Rules

- Package dependencies must come from the state-management owner, not from unrelated registry files.
- Store templates must be registered conditionally so disabled modes do not generate unused files.
- Generated components must not import stores when state-management is disabled.
- Snapshot and smoke coverage should prove every supported preset still builds.

## Forbidden Patterns

- Do not add Redux, MobX, Vuex, or other state libraries without updating schema, questions, presets, owner contributions, templates, snapshots, and docs.
- Do not represent React state-management as a boolean; it has multiple supported options.
- Do not represent Vue state-management as the React union; Vue currently only toggles Pinia.

## Common Mistakes

- Adding a dependency contribution but forgetting the generated import.
- Updating a generated store path without updating the template registry target.
- Treating minimal presets as lint-enabled full apps.
