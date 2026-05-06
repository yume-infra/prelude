# Template System

> Template registry, owner contribution, Handlebars, and materialization rules.

---

## Scope

This layer covers `apps/cli/templates/`, `apps/cli/src/core/template-registry/`, `apps/cli/src/core/owners/`, package manifest mutation helpers, partials, and post-generate materialization.

## Single Workflow Contract

All generated output must go through one workflow:

1. Collect `ProjectConfig`.
2. Owners contribute generation units.
3. Build `Plan` and project it to `PlanSpec`.
4. Apply plan.
5. Execute post-generate commands.
6. Execute post-generate file actions.

`--spec` input uses the same workflow after decode/adaptation.

## Materialization Strategies

| Strategy | Use when | Do not use when |
| --- | --- | --- |
| Fragment render | The file is mostly fixed source/config text | Multiple owners need merge/conflict policy |
| JSON/text mutation | The file is a structured hotspot such as `package.json` | A simple fixed template is enough |
| Static asset copy | The file is fixed and config-independent | It needs `ProjectConfig` logic |
| Post-generate command | External tools must run after files exist | The file effect can be represented in `PlanSpec` |
| Post-generate file action | A file must be written after an external command | The behavior depends on the external command's hidden side effects |

## Handlebars Helper Contract

Current custom helpers are registered in `apps/cli/src/core/services/template-helpers.ts`:

- `eq`
- `or`
- `withHash`

Templates must not use helper names from the third-party `handlebars-helpers` package; that package is not installed.

## Hotspot Contract: `package.json`

`package.json` is a structured decision point, not a Handlebars template. Add dependency/script/engine/package-manager rules through package manifest contributions, with ownership traces and conflict diagnostics.

## CLI Toolkit Template Contract

- The minimal CLI track renders `fragments/cli/index.ts.hbs` and must not gain Effect runtime dependencies.
- The Effect CLI track renders a separate Effect entry template; do not add heavy toolkit branching to the minimal CLI template.
- Effect CLI package manifests put `effect`, `@effect/cli`, `@effect/platform`, `@effect/platform-node`, `@effect/printer`, and `@effect/printer-ansi` in dependencies.
- Keep generated Effect dependency ranges peer-compatible when bumping the catalog.
- Both CLI tracks preserve `type: "module"`, `bin`, `scripts.build`, `scripts.smoke:bin`, tsdown build output, shebang behavior, and `dist/index.js` as the executable entry.

## Tests Required

- Template render snapshots for fragment/partial behavior.
- Manifest contribution tests for JSON/text mutation behavior.
- Planner/PlanSpec tests when task shape, owner trace, or preview output changes.
- Generated smoke when generated install/build/lint/runtime behavior changes.
- CLI toolkit template tests for entrypoint selection, README rendering, package manifest contributions, and bin invocation.

## Forbidden Patterns

- Do not hide package policy in Handlebars helpers.
- Do not keep adding capability-specific branches to a central composer when an owner contribution can own the rule.
- Do not guess external command side effects in dry run.
- Do not put root-only lint/Git/workspace files into package-scoped template output.
