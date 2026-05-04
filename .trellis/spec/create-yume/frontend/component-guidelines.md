# Component Guidelines

> How generated React and Vue components are authored.

---

## Overview

Generated components are intentionally small, readable starter components. They should demonstrate working router/state/build/lint behavior without becoming a design system or product UI.

Template conditionals should reflect explicit project config fields from Effect Schema.

## Component Structure

- React templates use default-exported function components.
- Vue templates use SFC structure with the shared `vue/script` and `vue/style` partials.
- Keep router shells in app-level templates and page content in page/view templates.
- Keep reusable counter UI shared through partials when it prevents duplicated JSX/SFC markup.

## Props Conventions

Current generated components do not expose props. If props are introduced:

- Type them in generated TypeScript output.
- Keep JavaScript output valid when `config.language` is `javascript`.
- Add template render snapshots for every branch that changes output.

## Styling Patterns

- Shared base styling lives in `fragments/common/css/style.css.hbs`.
- Component-local starter styles may live inside Vue SFC `<style>` blocks or simple generated class names.
- Tailwind is optional and controlled by `cssFramework: 'tailwind'`; do not assume Tailwind classes exist in minimal/non-tailwind output.

## Accessibility

- Buttons must include `type="button"` in generated UI.
- Icon-like or symbol-only buttons need `aria-label`.
- Dynamic count output should preserve the existing `aria-live="polite"` pattern.
- Links should come from the selected router library only when the router option is enabled.

## Examples

- `apps/cli/templates/fragments/react/Counter.tsx.hbs` switches between Jotai, Zustand, and local `useState` while keeping the rendered counter body stable.
- `apps/cli/templates/partials/react/counter-body.hbs` avoids repeating the JSX counter markup across React state-management branches.
- `apps/cli/templates/fragments/vue/Counter.vue.hbs` switches between Pinia and local `ref` while preserving the same template markup.
- `apps/cli/templates/fragments/vue/App.vue.hbs` renders either router navigation with `RouterView` or a direct `Home` component.

## Common Mistakes

- Adding a conditional branch without a snapshot case in `apps/cli/tests/template-render.spec.ts`.
- Using `RouterLink`, `NavLink`, `Outlet`, or stores when the corresponding router/state option is disabled.
- Adding Tailwind-only UI to output that can be generated with `cssFramework: 'none'`.
