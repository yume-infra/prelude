# Quality Guidelines

> Quality standards for generated frontend scaffolds and templates.

---

## Overview

Generated frontend quality is measured from the user-visible output first. Inspect actual generated projects or render snapshots before blaming a template source.

The generated scaffold should be small, buildable, lint-clean for full presets, and consistent across React/Vue where the product intentionally shares behavior.

## Rules

- Update template registry, templates, package contributions, snapshots, and docs together when generated behavior changes.
- Keep Handlebars logic readable. Use only `eq`, `or`, and `withHash` unless a new helper is implemented, tested, and documented.
- Keep shared frontend templates limited to truly shared behavior.
- Preserve full preset lint quality and minimal preset build-only policy.
- Prefer generated-project smoke tests when a change affects install/build/lint behavior.

## Examples

- `apps/cli/tests/template-render.spec.ts` snapshots React and Vue template branches.
- `apps/cli/tests/generated-smoke-gate.spec.ts` locks full presets to `pnpm lint --max-warnings=0` and minimal presets to build-only.
- `apps/cli/tests/generated-projects.smoke.ts` builds all React/Vue minimal/full presets from the built CLI.
- `apps/cli/tests/linked-examples.smoke.ts` verifies the linked `create-yume` bin against `apps/examples/.generated`.

## Verification

- Template fragment or partial changes: `pnpm --filter create-yume test`.
- Real generated project behavior: `pnpm --filter create-yume smoke:generated` and, for linked examples, `pnpm --filter create-yume smoke:examples`.
- Unknown impact: `pnpm verify`.

## Forbidden Patterns

- Do not assume a template branch is valid because TypeScript source compiles; generated output must be tested.
- Do not add user-visible files that dry-run/`PlanSpec` cannot see.
- Do not let generated lint errors accumulate in full presets.
- Do not use helper names from the third-party `handlebars-helpers` package; that package is not installed.

## Common Mistakes

- Checking only React when a shared frontend template also affects Vue.
- Updating package dependencies without updating generated package contract tests.
- Forgetting to inspect snapshot diffs for intentionality.
