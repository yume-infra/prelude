# Component Guidelines

> Component conventions for generated frontend examples.

---

## Overview

Frontend components seen in `apps/examples/.generated/` are generated artifacts. Their conventions must be documented and changed in `create-yume` template files, not by editing generated example output.

## Component Structure

- React examples should reflect default-exported function components from the React templates.
- Vue examples should reflect SFC output with script/template/style sections from Vue templates and partials.
- Router and state-management branches must match the selected preset.

## Styling Patterns

- Generated full presets may include lint and code-quality files.
- Tailwind appears only when generated config enables it.
- Starter component styles are intentionally simple and should keep generated apps buildable and lint-clean.

## Accessibility

- Preserve generated button labels and `type="button"` attributes.
- Preserve `aria-live` for dynamic counter output.
- Router links should be generated only when the preset enables routing.

## Examples

- `apps/cli/templates/fragments/react/Counter.tsx.hbs` defines generated React counter behavior for local, Jotai, and Zustand state.
- `apps/cli/templates/fragments/vue/Counter.vue.hbs` defines generated Vue counter behavior for local state or Pinia.
- `apps/cli/tests/template-render.spec.ts` snapshots component output branches before they reach examples smoke.
- `apps/cli/tests/linked-examples.smoke.ts` verifies generated full examples build and lint after linking the CLI.

## Common Mistakes

- Editing `apps/examples/.generated` to fix a generated component.
- Adding component conventions here that are not reflected in CLI templates.
- Forgetting that linked examples cover full presets only, while generated smoke covers minimal and full presets.
