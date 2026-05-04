# Hook Guidelines

> React hooks and Vue Composition API patterns in generated scaffolds.

---

## Overview

The generated scaffold currently avoids custom hooks. It uses framework-native primitives only where they are needed to make the starter app interactive.

Do not add abstraction hooks unless the generated output has repeated logic that users would reasonably keep.

## React Patterns

- Use `useState` for the no-state-management branch.
- Use `useAtom` only when `stateManagement` is `jotai`.
- Use `useCounterStore` selectors only when `stateManagement` is `zustand`.
- Keep hook calls unconditional within each generated branch so the generated React code obeys the Rules of Hooks.

## Vue Patterns

- Use `ref` for local no-state-management examples.
- Use Pinia stores only when `stateManagement` is enabled.
- Use `storeToRefs` when reading reactive store state from Pinia.

## Examples

- `apps/cli/templates/fragments/react/Counter.tsx.hbs` has separate Handlebars branches for Jotai, Zustand, and local state so generated hook calls remain static.
- `apps/cli/templates/fragments/vue/Counter.vue.hbs` uses `storeToRefs` for Pinia and `ref` for local state.
- `apps/cli/templates/fragments/react/main.tsx.hbs` changes router setup by config rather than mixing router hook logic into components.

## Forbidden Patterns

- Do not generate hooks conditionally inside a single runtime component body.
- Do not add custom hooks to the starter scaffold just to hide two lines of state logic.
- Do not generate imports for disabled state-management libraries.
- Do not assume React and Vue have parallel hook APIs; keep framework-specific behavior in framework templates.

## Common Mistakes

- Forgetting that Handlebars branches produce different complete files, while React runtime conditionals still must obey hook rules.
- Adding a store import but forgetting the owner package contribution.
- Updating generated hook code without updating template render snapshots.
