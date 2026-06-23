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

Generated package manifests must not advertise a Node engine floor older than the emitted tooling dependencies support. When bumping generated dependency ranges, review `taze` node compatibility output and update standalone, workspace-root, and workspace-child `engines.node` together.

Dist-backed TypeScript package manifests (`node`, `cli`, and `library`) must advertise the built ESM entry consistently:

- `exports["."].types` points at `./dist/index.d.ts`.
- `exports["."].import` points at `./dist/index.js`.
- `main` remains `dist/index.js` for older consumers.
- `types` remains `dist/index.d.ts`.
- `files` includes `dist`.
- `scripts.prepack` is `pnpm build` so `pnpm pack` cannot produce a package without built artifacts.

## CLI Toolkit Template Contract

- The minimal CLI track renders `fragments/cli/index.ts.hbs` and must not gain Effect runtime dependencies.
- The Effect CLI track renders a separate Effect entry template; do not add heavy toolkit branching to the minimal CLI template.
- Effect CLI package manifests put `effect`, `@effect/cli`, `@effect/platform`, `@effect/platform-node`, `@effect/printer`, and `@effect/printer-ansi` in dependencies.
- Keep generated Effect dependency ranges peer-compatible when bumping the catalog.
- Both CLI tracks preserve `type: "module"`, `bin`, `scripts.build`, `scripts.smoke:bin`, tsdown build output, shebang behavior, and `dist/index.js` as the executable entry.

## Scenario: Husky Hook Bootstrap

### 1. Scope / Trigger

- Trigger: Code-quality scaffold generation needs Git hooks installed for fresh clones without letting package publishing emit `.git can't be found` noise.

### 2. Signatures

- Post-generate command with install enabled: `pnpm install`, `git init`, `pnpm exec husky`.
- Post-generate command with install skipped: `git init`, `pnpm add -D husky`, `pnpm exec husky`.
- Generated package scripts with code-quality tools: `husky:install = husky`, plus a `.git`-aware `prepare` wrapper that runs Husky only when `.git` exists.
- Hook files are explicit post-generate file actions under `.husky/`.

### 3. Contracts

- Generated manifests may include `husky` as a dev dependency when code-quality tools are selected.
- Generated manifests must not gain bare `scripts.prepare = "husky"` from the scaffold workflow.
- Generated manifests with Husky hooks must keep `husky` visible to Knip and must keep fresh-clone installs capable of setting `core.hooksPath`.
- Generated pack commands in no-`.git` environments must not print Husky `.git can't be found` noise.
- `lint-staged` owns `.husky/pre-commit`; `commitlint` owns `.husky/commit-msg`.

### 4. Validation & Error Matrix

- `codeQuality.length === 0` -> no Husky commands or hook file actions.
- `installDeps === false && codeQuality.length > 0` -> add `husky` before executing it.
- `git === false` -> no `git init`; do not rely on Husky command side effects for hook file content.
- `.git` absent during `pnpm pack --dry-run` -> `prepare` exits quietly without invoking Husky.
- `.git` present during `pnpm install` -> `prepare` invokes Husky through the generated wrapper.

### 5. Good/Base/Bad Cases

- Good: `pnpm exec husky` installs hook plumbing after `git init`, then explicit file actions write hook content.
- Good: generated `prepare` checks `.git` before invoking Husky, while `husky:install` keeps the `husky` binary visible to Knip.
- Base: `pnpm exec husky` is run only when code-quality tools are selected.
- Bad: `pnpm exec husky init`, because it mutates `package.json` with a `prepare` script and writes a default hook outside the owner model.
- Bad: removing `prepare` entirely while keeping `.husky/*`, because `pnpm verify` then reports `husky` as unused and fresh clones do not install hooks.

### 6. Tests Required

- Workspace bootstrap command tests assert the exact command list.
- Dry-run preview tests assert the post-generate command and hook file-action surfaces.
- Manifest tests assert the generated `prepare` wrapper is not the bare `husky` command.
- Real generated full-preset checks must run `pnpm verify`, not only `pnpm lint`, so Knip dependency usage regressions are caught.
- Real install+git checks should confirm `prepare` remains quiet in pack/no-`.git` environments and hooks are installable in Git worktrees.

### 7. Wrong vs Correct

Wrong:

```text
"prepare": "husky"
```

Correct:

```text
"prepare": "node -e \"if (require('node:fs').existsSync('.git')) require('node:child_process').execFileSync('husky', { stdio: 'inherit', shell: true })\""
```

## Tests Required

- Template render snapshots for fragment/partial behavior.
- Manifest contribution tests for JSON/text mutation behavior.
- Planner/PlanSpec tests when task shape, owner trace, or preview output changes.
- Generated smoke when generated install/build/lint/runtime behavior changes.
- CLI toolkit template tests for entrypoint selection, README rendering, package manifest contributions, and bin invocation.
- Dist-backed manifest tests assert `exports`, `main`, `types`, `files`, and `scripts.prepack`; generated pack verification should delete `dist` first when checking `prepack`.

## Forbidden Patterns

- Do not hide package policy in Handlebars helpers.
- Do not keep adding capability-specific branches to a central composer when an owner contribution can own the rule.
- Do not guess external command side effects in dry run.
- Do not put root-only lint/Git/workspace files into package-scoped template output.
