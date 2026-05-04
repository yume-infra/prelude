# Type Safety

> Type-safety conventions for generated frontend examples.

---

## Overview

Type safety for `apps/examples` comes from the generated projects and the CLI contracts that create them. The examples package should not introduce its own TypeScript config or source tree.

## Rules

- Keep generated TypeScript/JavaScript behavior controlled by CLI config schema and template registry targets.
- Validate generated full examples through build and lint.
- When a type issue appears in `.generated/`, fix `apps/cli/src/schema`, `apps/cli/src/core/template-registry`, or `apps/cli/templates`.

## Examples

- `apps/cli/src/schema/project-config.ts` controls whether generated React/Vue projects are TypeScript or JavaScript.
- `apps/cli/src/core/template-registry/react.ts` chooses `.tsx` or `.jsx` output paths.
- `apps/cli/src/core/template-registry/vue.ts` chooses `.ts` or `.js` store/router paths around Vue SFC output.
- `apps/cli/tests/linked-examples.smoke.ts` proves linked full examples build after generation.

## Forbidden Patterns

- Do not add independent TypeScript source files to `apps/examples`.
- Do not patch generated type errors in `.generated`.
- Do not add generated TypeScript-only syntax to JavaScript branches.

## Common Mistakes

- Forgetting that generated path extensions are registry behavior, not template file names.
- Assuming linked examples cover every language branch.
- Updating generated TypeScript config without smoke-testing actual generated projects.
