# Hook Guidelines

> Hook and Composition API conventions in generated examples.

---

## Overview

Generated examples inherit hook behavior from the CLI templates. Do not introduce custom hook code in `apps/examples`.

When a generated hook issue appears in `.generated/`, fix the source template and add or update CLI tests.

## Rules

- React generated examples should use `useState`, `useAtom`, or Zustand selectors according to the preset state-management option.
- Vue generated examples should use `ref` for local state and `storeToRefs` for Pinia.
- Generated hook imports must match enabled package contributions.
- Hook branches must be static in generated output.

## Examples

- `apps/cli/templates/fragments/react/Counter.tsx.hbs` keeps React hook calls separated by Handlebars branches.
- `apps/cli/templates/fragments/vue/Counter.vue.hbs` chooses Pinia or local `ref` code by config.
- `apps/cli/src/core/owners/state-management.ts` owns the generated store template registration and package dependencies.

## Forbidden Patterns

- Do not add hand-written custom hooks under `apps/examples`.
- Do not fix hook imports in generated output directly.
- Do not add generated hook usage without a template snapshot and smoke coverage.

## Common Mistakes

- Forgetting to update dependency contributions when a generated hook imports a package.
- Assuming linked examples exercise minimal no-state branches.
- Debugging a hook problem from `.generated` without tracing back to `apps/cli/templates`.
