# brainstorm: expand turborepo monorepo node cli scaffolds

## Goal

Plan the next create-yume iteration after the node + CLI scaffold refactor, now correctly centered on Turborepo rather than Turbopack. The work should first improve the Turborepo/pnpm workspace and generated monorepo foundation, then add an explicit Effect-powered CLI scaffold track.

## Clarification

The user clarified that the intended research topic was **Turborepo**, not **Turbopack**. Turbopack/Next-specific material is no longer a driver for this task and should not shape MVP scope.

## Requirements

- Implement in the order **A -> B**:
  - A: Infrastructure Foundation First.
  - B: Explicit CLI Effect Track.
- Reframe C as later monorepo sophistication, not as a Turbopack/Next expansion.
- Treat Turborepo as task orchestration and caching for pnpm workspaces.
- Keep generated workspace structure aligned with current create-yume taxonomy:
  - runnable packages in `apps/*`
  - library packages in `libs/*`
- Keep internal dependencies explicit with `workspace:*`; do not auto-link undeclared local packages.
- Keep package manifests owner-scoped and target-aware.
- Keep Node/library/CLI build tooling conservative: TypeScript ESM + `tsdown`.
- Treat Effect-powered CLI scaffolds as an explicit toolkit/preset expansion, not as the default minimal CLI.

## Acceptance Criteria

- [x] Turborepo research replaces earlier Turbopack framing.
- [x] PRD records A -> B as the desired implementation sequence.
- [x] C is reorganized as later monorepo taste/workflow expansion.
- [x] Research notes map official Turborepo practices to create-yume constraints.
- [ ] User confirms the final A/B implementation plan before coding starts.

## Research Notes

### Turborepo Workspace Shape

Official Turborepo guidance:

- A valid workspace needs package-manager workspace definitions, a lockfile, root `package.json`, root `turbo.json`, and a `package.json` in each package.
- Turborepo recommends splitting workspaces into `apps/*` for applications/services and `packages/*` for libraries/tooling.
- Nested globs such as `apps/**` or `packages/**` should be avoided because nested packages are ambiguous across JavaScript package managers.
- Application packages are expected to be graph leaves; shared code belongs in library/internal packages.

Create-yume mapping:

- Keep `apps/*` + `libs/*`. Turborepo examples use `packages/*`, but create-yume already has a clear product taxonomy where `libs/*` means library packages.
- Avoid nested workspace package globs.
- Continue routing `frontend-app`, `backend-app`, and `cli-tool` to `apps/<id>`, and `library-package` to `libs/<id>`.
- Keep package `id` filesystem-safe and package `name` import-safe.

Sources:

- Turborepo structuring guide: https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository
- Turborepo package types: https://turborepo.dev/docs/core-concepts/package-types

### Turborepo Tasks and Cache

Official Turborepo guidance:

- Root `package.json` scripts usually delegate to `turbo run <task>`.
- `turbo.json` task keys match package scripts.
- `build` should generally depend on dependency builds via `dependsOn: ["^build"]`.
- `outputs` should describe real package-local artifacts such as `dist/**`.
- `dev` should be `cache: false` and `persistent: true`.
- Custom `inputs` opt out of default hashing unless `$TURBO_DEFAULT$` is included.
- Root tasks use `//#task` registration when root files need linting/formatting or other root-only scripts.
- Long-running task relationships should use `with`, not `dependsOn`, because persistent tasks never exit.

Create-yume mapping:

- Generated `turbo.json` should keep `build`, `test`, `lint`, `typecheck`, `dev`, and `clean`, but root scripts must match scripts actually emitted into child packages.
- Add or verify `inputs: ["$TURBO_DEFAULT$", ".env*"]` where it improves cache safety without hiding default inputs.
- Consider root task registration only if generated workspace roots actually contain root lintable files and root lint scripts.
- Keep `dev` uncached and persistent.
- Avoid broad framework-specific outputs in the root until create-yume has package families that need them.

Sources:

- Turborepo task configuration: https://turborepo.dev/docs/crafting-your-repository/configuring-tasks
- Turborepo configuration reference: https://turborepo.dev/docs/reference/configuration
- Turborepo environment variables: https://turborepo.dev/docs/crafting-your-repository/using-environment-variables

### Package Configurations

Official Turborepo guidance:

- Package-level `turbo.json` files can extend the root config with `extends: ["//"]`.
- Scalar fields inherit; array fields such as `outputs`, `inputs`, `env`, and `dependsOn` replace by default.
- `$TURBO_EXTENDS$` can append to inherited arrays.
- Package Configurations are useful when package task behavior differs by framework or package owner.

Create-yume mapping:

- Do not generate package-level `turbo.json` in A unless a current package family truly needs specialized outputs.
- For the current React/Vue/Node/CLI/library scope, root-level `dist/**` output is likely enough.
- Keep package-level Turbo config as later C scope once create-yume supports more divergent package families.

Source:

- Turborepo package configurations: https://turborepo.dev/docs/reference/package-configurations

### Dependencies and Internal Packages

Official Turborepo guidance:

- Dependencies should be installed where they are used, not hoisted conceptually to the root.
- Root dependencies should stay limited to repository-management tools such as Turbo, Husky, and lint-staged.
- Internal packages are normal package dependencies and should be referenced with workspace syntax.
- Package `exports` define package entrypoints and help avoid cross-package relative imports.

Create-yume mapping:

- Keep child package external deps in child manifests.
- Keep root deps limited to workspace tooling.
- Continue writing declared internal deps as `workspace:*`.
- Strengthen package name validation later if `--spec` can currently accept malformed npm names.

Sources:

- Turborepo dependency management: https://turborepo.dev/docs/crafting-your-repository/managing-dependencies
- Turborepo internal packages: https://turborepo.dev/docs/core-concepts/internal-packages

### TypeScript in Turborepo

Official Turborepo guidance:

- Turborepo examples share TypeScript config through an internal package such as `@repo/typescript-config`.
- Turborepo explicitly says root `tsconfig.json` and TypeScript Project References are usually unnecessary for Turborepo workspaces.
- For compiled packages, declaration files and declaration maps improve cross-package go-to-definition.
- Turborepo recommends `tsc` for many internal packages, but create-yume already uses `tsdown` for its current library package shape.

Create-yume mapping:

- Do **not** make root solution `tsconfig.json` / project references part of A.
- A should instead verify package-local tsconfigs and fix obvious incorrect inheritance, especially neutral libraries accidentally requiring Node types.
- Shared TypeScript config packages are C-later scope because create-yume does not yet have a tooling/config package kind.
- Keep `tsdown` for now because it is already the repo's chosen generated Node/lib/CLI build baseline.

Source:

- Turborepo TypeScript guide: https://turborepo.dev/docs/guides/tools/typescript

## Decision (ADR-lite)

Context:

- The original brainstorm mixed up Turbopack and Turborepo because of wording ambiguity.
- After clarification, the real goal is improving monorepo workflow quality and generated workspace taste through Turborepo practices.

Decision:

- Proceed in order **A -> B**.
- A is the next implementation slice and should focus on Turborepo/pnpm workspace correctness, generated package quality, and minimal CLI/library baseline fixes.
- B follows with explicit `cli-effect` / `toolkit: "effect"` support.
- C is deferred and reframed as later monorepo sophistication: shared config packages, pnpm catalogs, package-level Turbo configs, release workflow, and broader package kinds.

Consequences:

- Turbopack and Next are out of scope for this task.
- A stays mostly within current product boundaries.
- B intentionally changes the CLI toolkit boundary and will require schema, templates, package contributions, docs, and smoke tests together.
- A, B, and C are split into independent child tasks so they can be worked in separate sessions while this parent task acts as lead/coordination.

## Child Tasks

### A: Turborepo Workspace Foundation

Path:

- `.trellis/tasks/05-05-turborepo-workspace-foundation`

Purpose:

- Harden generated Turborepo/pnpm workspace foundation.
- Keep current create-yume package taxonomy.
- Fix package correctness issues such as neutral library Node types.

Ownership:

- Workspace root policy.
- Turborepo task defaults.
- Workspace package root/package manifest consistency.
- Library/node-runtime package correctness.

Avoid:

- `cli-effect` toolkit/schema/template work.
- Shared config packages and pnpm catalogs.
- Turbopack/Next.

### B: Effect CLI Scaffold Track

Path:

- `.trellis/tasks/05-05-effect-cli-scaffold-track`

Purpose:

- Add an explicit `toolkit: "effect"` CLI scaffold track.
- Keep minimal CLI as the lightweight default.

Ownership:

- CLI toolkit schema.
- CLI preset/spec surface.
- Effect CLI templates.
- Effect CLI package contributions.
- Effect CLI generated smoke coverage.

Avoid:

- Turborepo workspace root policy.
- Library neutral runtime fixes.
- Monorepo taste features such as catalogs/config packages.

### C: Turborepo Monorepo Taste Expansion

Path:

- `.trellis/tasks/05-05-turborepo-monorepo-taste-expansion`

Purpose:

- Plan later monorepo sophistication for Turborepo + pnpm workspaces.
- Produce future-ready recommendations without forcing A/B scope creep.

Ownership:

- pnpm catalog policy.
- shared config package design.
- package-level `turbo.json` policy.
- release workflow / publishable library policy.
- package naming and graph taste.

Avoid:

- Turbopack/Next.
- Direct implementation unless explicitly promoted by lead.
- Editing A/B active write areas while those sessions are running.

## Lead Coordination Plan

This parent task is the lead task.

Lead responsibilities:

- Keep A, B, and C aligned on product boundaries.
- Prevent file-level collisions between A and B.
- Review C recommendations and decide which become future tasks.
- Merge outputs in an order that minimizes conflicts:
  - A first when it changes shared package/root foundation.
  - B after or alongside A only if shared files such as `scaffold-family.ts` do not conflict.
  - C as design input, not a blocker for A/B.
- Run or request final cross-task verification before declaring the broader effort done.

Parallel cautions:

- A and B may both need `apps/cli/src/core/owners/scaffold-family.ts`; coordinate before merging.
- A may touch node-runtime templates; B should prefer CLI-specific Effect templates.
- B changes product boundary docs; A should avoid editing the same docs unless needed for workspace behavior.
- C should mostly write planning artifacts while A/B are active.

## Technical Approach

### A: Infrastructure Foundation First

Candidate implementation slices:

- A1: Audit and harden generated workspace root policy:
  - `turbo.json` schema URL and task defaults.
  - build/test/typecheck/lint/dev/clean task definitions.
  - root scripts matching emitted child package scripts.
  - root dependency policy limited to workspace tooling.
- A2: Harden generated package correctness:
  - neutral library tsconfig should not require Node types.
  - package manifests should keep explicit `exports`, `main`, `types`, and `files`.
  - internal deps remain `workspace:*` only when declared.
- A3: Harden minimal CLI without adding toolkit scope:
  - replace hand parsing with `node:util.parseArgs` or equivalent structured parsing.
  - reject unknown options and missing option values.
  - keep stdout for primary output/help and stderr for errors.
  - preserve bin metadata, shebang repair, and `smoke:bin`.

Validation target:

- Template/package manifest changes: `pnpm --filter create-yume test`.
- Workspace root changes: `pnpm --filter create-yume test -- workspace-root`.
- CLI bin/generated baseline changes: `pnpm --filter create-yume smoke:generated && pnpm --filter create-yume smoke:examples`.

### B: Explicit CLI Effect Track

Candidate implementation slices:

- B1: Expand schema and preset surface:
  - `CliToolkitSchema: "none" | "effect"`.
  - standalone/project config support for CLI toolkit.
  - explicit preset/spec path such as `cli-effect`.
- B2: Add Effect CLI templates:
  - `src/index.ts` entry with `NodeRuntime.runMain`.
  - command definition using Effect CLI APIs.
  - typed error/config/service examples only where they remain teachable.
- B3: Add package contributions and verification:
  - runtime deps: `effect`, `@effect/cli`, `@effect/platform`, `@effect/platform-node`.
  - keep `cli-minimal` lightweight.
  - add render/planner/generated smoke coverage.
- B4: Update docs and architecture constraints to state `toolkit: effect` is supported.

Validation target:

- CLI args/spec/preset changes: `pnpm --filter create-yume test -- cli-args create-spec compose preview && pnpm --filter create-yume typecheck`.
- Generated CLI baseline: `pnpm --filter create-yume smoke:generated && pnpm --filter create-yume smoke:examples`.

## C: Deferred Monorepo Taste Expansion

C is not part of the next A -> B implementation sequence.

Later candidates:

- pnpm catalogs for dependency version centralization.
- generated config packages such as `@repo/typescript-config`, `@repo/eslint-config`, and `@repo/prettier-config`.
- package-level `turbo.json` only for package families that need specialized outputs or task behavior.
- Changesets/release workflow for publishable libraries.
- stronger package name validation for structured `--spec` input.

Still out of scope:

- Remote templates.
- Plugin/template-source systems.
- Incremental append/update of existing workspaces.
- Worker app generation.
- Arbitrary interactive workspace graph configuration.
- Turbopack/Next support.

## Likely Files

- `turbo.json`
- `package.json`
- `apps/cli/src/core/workspace-bootstrap.ts`
- `apps/cli/src/core/workspace-packages.ts`
- `apps/cli/src/core/owners/scaffold-family.ts`
- `apps/cli/src/core/template-registry/workspace-bootstrap.ts`
- `apps/cli/src/core/template-registry/node-runtime.ts`
- `apps/cli/src/schema/project-config.ts`
- `apps/cli/src/schema/generation-package-spec.ts`
- `apps/cli/templates/fragments/common/workspace/*`
- `apps/cli/templates/fragments/common/node-runtime/*`
- `apps/cli/templates/fragments/cli/*`
- `apps/cli/templates/fragments/library/*`
- `.trellis/spec/create-yume/generation-model/index.md`
- `.trellis/user/create-yume.md`

## Open Question

- Confirm whether A should proceed with the A1 -> A2 -> A3 slice order above before implementation.

## Technical Notes

- Task created for brainstorm tracking.
- Research agents previously covered Turbo/Turbopack, monorepo structure, Node library tooling, and CLI + Effect.
- After user clarification, Turbopack findings are archived as non-goals and the active research basis is Turborepo.
