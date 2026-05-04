# State Management

> State-management conventions for generated examples.

---

## Overview

`apps/examples` does not define state-management itself. It validates whatever state-management the CLI generates for React and Vue full presets.

The source of truth is `apps/cli/src/core/owners/state-management.ts` plus the generated templates.

## Supported Generated Examples

- Linked examples currently generate full React and Vue presets.
- React full uses Jotai by preset default.
- Vue full uses Pinia by preset default.
- Minimal preset no-state behavior is covered by generated smoke and template snapshots, not linked examples.

## Examples

- `apps/cli/src/core/questions/compose.ts` sets full preset defaults for React and Vue state-management.
- `apps/cli/src/core/owners/state-management.ts` contributes Jotai, Zustand, or Pinia dependencies and store templates.
- `apps/cli/tests/linked-examples.smoke.ts` validates full generated examples with build and lint.
- `apps/cli/tests/generated-projects.smoke.ts` validates minimal and full presets outside `apps/examples`.

## Rules

- Do not manually install state packages in `apps/examples/.generated`.
- Change generated state behavior in the CLI owner/templates.
- Validate full example state behavior through linked smoke.

## Forbidden Patterns

- Do not add example-only state management code.
- Do not assume linked examples prove Zustand or minimal local-state branches.
- Do not make examples depend on packages absent from generated `package.json`.

## Common Mistakes

- Fixing a generated Pinia/Jotai issue by editing output instead of owner/template code.
- Forgetting that React state-management is a union while Vue state-management is a boolean.
- Running only linked smoke after changing minimal preset state behavior.
