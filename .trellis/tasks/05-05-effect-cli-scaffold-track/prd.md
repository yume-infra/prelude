# B: Effect CLI Scaffold Track

## Goal

Add an explicit Effect-powered CLI scaffold track while keeping the existing minimal CLI scaffold lightweight.

## Background

This task is child B of the lead brainstorm task:

- `.trellis/tasks/05-05-05-05-expand-monorepo-node-cli-scaffolds`

The repo's own CLI already uses Effect, but generated CLI projects currently have `toolkit: none`. This task intentionally changes that product boundary by adding an explicit `effect` toolkit path.

## Requirements

- Add a selectable/spec-addressable CLI toolkit:
  - existing minimal CLI remains `toolkit: "none"`.
  - new Effect CLI uses `toolkit: "effect"`.
- Add a clear preset or structured input path for Effect CLI generation, such as `standalone-cli-effect` or equivalent naming consistent with existing presets.
- Keep `cli-minimal` dependency-light and behavior-compatible unless a separate decision is made.
- Generate an Effect-based CLI that demonstrates the intended architecture without becoming too large:
  - executable `src/index.ts`.
  - `NodeRuntime.runMain`.
  - `@effect/cli` command definition.
  - typed errors/config/services only when they remain teachable.
- Put Effect runtime dependencies in generated package `dependencies`, not dev-only dependencies, unless the implementation intentionally bundles them.
- Preserve CLI package basics:
  - `type: "module"`.
  - `bin` metadata.
  - shebang handling.
  - `tsdown` build.
  - `smoke:bin`.
- Update docs and constraints to state that `toolkit: effect` is supported.

## Acceptance Criteria

- [ ] CLI create spec accepts and round-trips `toolkit: "effect"`.
- [ ] Existing `toolkit: "none"` / minimal CLI generation remains unchanged unless intentionally updated.
- [ ] Effect CLI generated package builds successfully.
- [ ] Effect CLI `dist/index.js --help` or equivalent smoke path works.
- [ ] Generated package manifest includes correct Effect runtime dependencies.
- [ ] Render/planner snapshots cover the new Effect CLI files and manifest contributions.
- [ ] User docs and architecture constraints reflect the new supported CLI toolkit.

## Technical Approach

1. Expand schema and project config.
   - Update `CliToolkitSchema` from `none` to `none | effect`.
   - Carry toolkit through standalone and workspace package config paths.
   - Preserve backward compatibility for existing presets/specs.

2. Add preset/question surface.
   - Add an explicit preset for Effect CLI.
   - Keep aliases and help text consistent with existing naming patterns.

3. Add templates.
   - Prefer separate Effect-specific CLI templates over branching heavily inside `fragments/cli/index.ts.hbs`.
   - Keep generated code small and readable.

4. Add package manifest contributions.
   - Add `effect`, `@effect/cli`, `@effect/platform`, and `@effect/platform-node` as runtime dependencies.
   - Keep `tsdown`, `typescript`, and Node types as dev dependencies where appropriate.

5. Verify generated output.
   - Add schema, compose, planner, render, and smoke coverage.

## Likely Files

- `apps/cli/src/schema/generation-package-spec.ts`
- `apps/cli/src/schema/project-config.ts`
- `apps/cli/src/schema/preset.ts`
- `apps/cli/src/core/questions/compose.ts`
- `apps/cli/src/core/questions/common/preset.ts`
- `apps/cli/src/core/create-spec-input.ts`
- `apps/cli/src/core/owners/scaffold-family.ts`
- `apps/cli/src/core/template-registry/node-runtime.ts`
- `apps/cli/templates/fragments/cli/*`
- `apps/cli/tests/*`
- `.trellis/spec/create-yume/generation-model/index.md`
- `.trellis/user/create-yume.md`
- `.trellis/user/*` if preset/help docs mention CLI scaffolds

## Parallel Boundaries

- This task should not change generated Turborepo root policy.
- This task should not introduce shared config packages, pnpm catalogs, or package-level `turbo.json`.
- Coordinate with task A before touching shared `scaffold-family.ts` logic that affects Node/library package manifests.
- Avoid modifying neutral library tsconfig behavior; that belongs to task A.

## Verification

Minimum expected commands after implementation:

```bash
pnpm --filter create-yume test -- cli-args create-spec compose preview
pnpm --filter create-yume test -- planner template-render
pnpm --filter create-yume typecheck
```

Because this changes generated CLI bin behavior, also run:

```bash
pnpm --filter create-yume smoke:generated
pnpm --filter create-yume smoke:examples
```

## References

- Effect runtime docs: https://effect.website/docs/platform/runtime/
- Effect configuration docs: https://effect.website/docs/configuration/
- Effect CLI Command API: https://effect-ts.github.io/effect/cli/Command.ts.html
- npm `bin`: https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#bin
- Node package module type: https://nodejs.org/api/packages.html

## Out of Scope

- Making Effect the default CLI scaffold.
- Turborepo workspace foundation work.
- Turbopack / Next support.
- Single-binary distribution via Node SEA or `tsdown` executable support.
- A full CLI framework matrix such as Commander/Stricli/Effect choices.
