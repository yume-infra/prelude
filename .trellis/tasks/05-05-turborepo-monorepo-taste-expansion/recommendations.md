# Turborepo Monorepo Taste Recommendations

## Scope

This document is the planning artifact for task C. It recommends future implementation slices for generated Turborepo + pnpm workspaces without changing product code in this task.

Current create-yume boundaries still apply:

- supported scaffold families: React, Vue, workspace root, Node, CLI tool, and structured workspace packages.
- workspace packages: runnable app/tool packages under `apps/*`, shared library packages under `libs/*`.
- complex workspace package graphs enter through `--spec <file-or-json> --name <target>`.
- no Turbopack or Next-specific behavior.
- no remote templates, plugin template sources, incremental append/update, or worker app generation.

## Research Summary

### Official Turborepo And pnpm Guidance

- Turborepo repository structure starts from package-manager workspace conventions. The official guide recommends `apps/*` for applications/services and `packages/*` for other libraries/tooling, but create-yume has already chosen `libs/*` for the shared side of this product.
- Turborepo warns against nested packages such as `apps/**` or `packages/**` because package-manager behavior is ambiguous. Grouping is possible only when the glob explicitly includes the grouped level and no package exists at the grouping directory itself.
- Turborepo dependency guidance says dependencies should be installed in the package where they are used. Root dependencies should stay limited to repository management tools such as `turbo`, Husky, or lint-staged.
- Turborepo package configurations support package-local `turbo.json` files with `extends: ["//"]`. Array fields replace inherited arrays unless `$TURBO_EXTENDS$` is the first array item.
- Turborepo TypeScript guidance uses a shared `@repo/typescript-config` package for reusable tsconfig files, and package manifests depend on that package with `workspace:*`.
- pnpm catalogs define reusable version ranges in `pnpm-workspace.yaml`; package manifests still own dependency keys and use `catalog:` as the version reference.
- pnpm `workspace:` dependencies force local workspace resolution and are transformed to regular semver ranges on publish.
- pnpm does not provide a built-in release/versioning workflow; pnpm documents Changesets and Rush as established options, with Changesets setup beginning at the workspace root.

Primary references:

- https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository
- https://turborepo.dev/docs/crafting-your-repository/managing-dependencies
- https://turborepo.dev/docs/reference/package-configurations
- https://turborepo.dev/docs/guides/tools/typescript
- https://pnpm.io/catalogs
- https://pnpm.io/workspaces
- https://pnpm.io/using-changesets

### Current create-yume Constraints

- Generated workspaces currently emit only this `pnpm-workspace.yaml` shape:

```yaml
packages:
  - apps/*
  - libs/*
```

- Generated root `turbo.json` is root-only and already covers common `build`, `test`, `lint`, `typecheck`, `dev`, and `clean` tasks.
- Generated root `package.json` owns workspace orchestration scripts and root tooling dependencies.
- Child workspace manifests are built by `buildWorkspacePackages(...)`; package-local dependencies are emitted only from declared `internalDependencies`, always as `workspace:*`.
- `PackageNameSchema` currently brands any string without npm-name validation.
- The source repository already uses pnpm catalogs for its own dependencies, but generated workspaces still hardcode dependency versions from owner contribution maps.
- Existing code-specs require target-aware manifest/template composition and forbid a second generation workflow.

## Recommended Direction

### C1: pnpm Catalog Policy

Recommendation: make pnpm catalogs the next MVP slice for generated multi-package workspaces, but keep package-local ownership of dependency keys.

Policy:

- Generate a default `catalog:` only for structured workspaces with at least one child package, or for a future root config flag that explicitly asks for catalog output.
- Keep external dependency declarations in the package that uses them. Only the version value changes from a range such as `^5.9.3` to `catalog:`.
- Keep internal dependencies as `workspace:*`; do not mix catalog references with local workspace package links.
- Start with the singular default `catalog` field in `pnpm-workspace.yaml`. Defer named catalogs until create-yume supports intentionally divergent dependency families.
- Include only dependency versions that create-yume itself contributes to generated `package.json` files. Do not invent catalog entries for dependencies that no generated package declares.
- Prefer `catalogMode: manual` if generated settings are added; do not generate strict mode until the CLI can validate all user-added dependency requests.

Likely files:

- `apps/cli/src/core/workspace-bootstrap.ts`
- `apps/cli/src/core/workspace-packages.ts`
- `apps/cli/src/core/modifier/package-manifest-contributions.ts`
- `apps/cli/templates/fragments/common/workspace/pnpm-workspace.yaml.hbs`
- workspace root/package manifest tests and planner snapshots
- `docs/user/pnpm-monorepo.md`
- `docs/agent/verification-matrix.md`

Validation:

- `pnpm --filter create-yume test -- workspace-root planner package-json`
- `pnpm --filter create-yume typecheck`
- add a generated workspace assertion proving root and child package manifests use `catalog:` for external dependencies and `workspace:*` for internal links.

Compatibility risks:

- hardcoded contribution versions currently live in multiple owner modules; catalog support needs a single version-source contract to avoid drift.
- changing generated package version strings affects snapshots and user docs.
- catalog cleanup settings require pnpm 10 behavior; generated `packageManager` should remain compatible with the emitted catalog syntax.

### C2: Shared Config Packages

Recommendation: add shared TypeScript config first, then evaluate ESLint config packages later. Do not add Prettier config until formatter support is in product scope.

Policy:

- Introduce a future package kind for tooling/config packages instead of pretending config packages are runtime libraries. A working name is `config-package`.
- Keep generated config packages private by default.
- Place first-party config packages under the existing shared side of the workspace, for example `libs/typescript-config`, unless a future layout decision expands workspace globs for a separate tooling folder.
- Generate `@repo/typescript-config` only when the workspace has multiple TypeScript child packages or an explicit config package is declared in the create spec.
- Child packages that use the shared tsconfig must declare `@repo/typescript-config: workspace:*` in `devDependencies`.
- `@repo/eslint-config` should wait until package-local lint configs are required. The current root ESLint config can remain root-owned for current generated workspaces.
- `@repo/prettier-config` is out of scope until create-yume supports formatter generation.

Likely files:

- `apps/cli/src/schema/generation-package-spec.ts`
- `apps/cli/src/schema/create-spec.ts`
- `apps/cli/src/core/workspace-packages.ts`
- `apps/cli/src/core/template-registry/*`
- new templates under `apps/cli/templates/fragments/config-package/`
- tsconfig templates under `apps/cli/templates/fragments/common/node-runtime/` and frontend TS templates if they start extending shared config
- docs and generated spec examples

Validation:

- schema decode tests for `config-package`.
- planner/template-render tests proving the config package lands under the chosen shared path.
- package manifest tests proving child packages depend on config packages only when declared or policy-generated.
- generated workspace smoke with at least two TypeScript packages consuming `@repo/typescript-config`.

Compatibility risks:

- adding shared tsconfig changes many generated `tsconfig.json` files at once.
- config packages blur the current `libs/*` runtime-library meaning; docs must clearly describe "shared tooling package" versus "shared runtime library".
- root-only ESLint config must not be duplicated into child packages by accident.

### C3: Package-Level Turbo Config

Recommendation: defer package-local `turbo.json` generation until a package family needs divergent outputs, env, inputs, or task inheritance. Do not generate package-level Turbo config by default.

Policy:

- Current root `turbo.json` is sufficient for Node, CLI, library, React, and Vue packages that use `dist/**` outputs and ordinary task names.
- Generate package-local `turbo.json` only from an explicit package config need, such as package-specific env, non-`dist/**` outputs, or task exclusion.
- Package-local configs must use `extends: ["//"]`.
- When adding to inherited array fields, `$TURBO_EXTENDS$` must be the first array item. If it is omitted, the package intentionally replaces the inherited array.
- If multiple packages share the same non-root Turbo config, prefer a dedicated shared config package only after a concrete repeated need exists.

Likely files:

- `apps/cli/src/schema/generation-package-spec.ts`
- `apps/cli/src/core/template-registry/workspace-bootstrap.ts`
- `apps/cli/src/core/workspace-packages.ts`
- new package-scoped Turbo template under `apps/cli/templates/fragments/common/workspace/`
- planner and template-render snapshots

Validation:

- schema tests for package-local Turbo config shape.
- planner tests proving package-level `turbo.json` is package-scoped and never emitted at root unless root config changes.
- template-render tests for `$TURBO_EXTENDS$` behavior.

Compatibility risks:

- arrays in Turborepo package configs replace root arrays by default; accidental omission of `$TURBO_EXTENDS$` can silently drop root outputs/env/inputs.
- package configs that extend other packages depend on package `name`, not filesystem `id`; name validation must be stronger before this is broadly exposed.

### C4: Publish/Release Workflow

Recommendation: keep generated workspace packages internal-only by default. Add Changesets only behind an explicit publishable-package/release-workflow slice.

Policy:

- Workspace root and child packages should be private by default unless the create spec marks a package publishable.
- Internal libraries should remain `workspace:*` consumers and not imply npm publication.
- Changesets generation should require an explicit release workflow option.
- When enabled, root package should own `@changesets/cli`, `changeset`, `version-packages`, and release scripts; package publishability should be package-local.
- Generated docs must explain that `workspace:` and `catalog:` are transformed for publish by pnpm, but create-yume does not publish by default.

Likely files:

- `apps/cli/src/schema/generation-package-spec.ts`
- `apps/cli/src/schema/project-config.ts`
- `apps/cli/src/core/workspace-bootstrap.ts`
- `apps/cli/src/core/workspace-packages.ts`
- templates for `.changeset/config.json`
- docs/user and docs/agent verification entries

Validation:

- package manifest tests for private-by-default and publishable opt-in.
- planner tests for Changesets files/scripts only when release workflow is enabled.
- generated workspace smoke should remain internal-only in default cases.

Compatibility risks:

- current child package base manifests do not set `private`; changing this is user-visible and should be documented.
- release workflow generation touches root scripts, root devDependencies, package metadata, and docs together.

### C5: Package Naming And Graph Taste

Recommendation: tighten package name validation before exposing package-level Turbo inheritance, config packages, or release workflow.

Policy:

- Keep `id` as the filesystem-stable identifier and `name` as the package-manager identity.
- Default package names should be scoped, using `@repo/<id>` unless user config supplies another scope.
- Validate package names with npm-safe scoped/unscoped rules rather than accepting any string.
- Internal dependency targets may remain by id or by name, but generated dependency keys should resolve to the target package name unless an alias is explicitly supplied.
- Reserve examples such as `@repo/ui`, `@repo/shared`, `@repo/config`, and `@repo/typescript-config` for docs and generated sample specs.

Likely files:

- `apps/cli/src/brand/package-name.ts`
- `apps/cli/src/schema/generation-package-spec.ts`
- `apps/cli/src/schema/create-spec.ts`
- CLI/spec error formatting tests
- user docs and generated create spec examples

Validation:

- schema tests for valid scoped names, invalid names, duplicate names, and id/name distinction.
- workspace internal dependency tests proving id/name targets still resolve predictably.
- docs examples should use validated names.

Compatibility risks:

- existing specs that used arbitrary names will fail after validation; migration guidance or better errors will be needed.
- package-level Turbo `extends` uses package names, so weak name validation can become a runtime Turbo failure.

## Slice Ordering

Recommended order:

1. C5 package name validation and private/internal package defaults.
2. C1 pnpm catalog policy for generated multi-package workspaces.
3. C2 TypeScript config package kind and templates.
4. C3 package-level Turbo config only when a concrete package family needs divergence.
5. C4 publish/release workflow with Changesets.

Rationale:

- C5 reduces risk for every later slice because config packages, Turbo inheritance, and release workflows all depend on package names.
- C1 aligns generated workspaces with the source repo's dependency-version taste without changing folder structure or product scope.
- C2 adds a visible monorepo quality improvement once package names and catalogs are stable.
- C3 and C4 are useful but should not be default complexity in current generated workspaces.

## MVP-Next Versus Later

MVP-next:

- npm-safe package name validation.
- private-by-default internal workspace packages.
- default pnpm catalog support for external dependencies in generated structured workspaces.
- generated docs/spec examples showing `@repo/*` naming, `catalog:`, and `workspace:*` together.

Later:

- `config-package` kind.
- `@repo/typescript-config` package templates and package-local tsconfig extension.
- package-local `turbo.json` from explicit task divergence.
- publishable package opt-in and Changesets workflow.
- shared ESLint config package after package-local linting has a concrete need.

Out of scope:

- Turbopack or Next support.
- nested package globs beyond current `apps/*` and `libs/*` unless a separate layout task changes the workspace contract.
- remote templates, plugin systems, incremental append/update, and worker app generation.
- formatter/Prettier config package until formatter support is product scope.

## Future Task Breakdown

### C1a: Package Name And Internal Visibility Contract

- Add npm-safe `PackageNameSchema`.
- Default generated workspace package names to `@repo/<id>` where a name is not explicitly supplied.
- Make child packages private by default unless a future publishable flag is set.
- Update create spec examples and validation error tests.

### C1b: Catalog-Aware Dependency Version Contract

- Add a package manifest version-source model that can emit direct ranges for standalone projects and `catalog:` for structured workspaces.
- Add catalog entry collection for external dependency contributions.
- Render `pnpm-workspace.yaml` with a default catalog only when entries exist.
- Prove internal `workspace:*` links are unchanged.

### C2a: TypeScript Config Package Kind

- Add `config-package` schema and owner.
- Generate `libs/typescript-config` with `base.json`, `node.json`, and frontend variants only if selected.
- Add package-local `devDependencies` and `tsconfig.json` extension for consuming packages.

### C3a: Explicit Package Turbo Overrides

- Add optional package-local Turbo task config.
- Generate `apps/<id>/turbo.json` or `libs/<id>/turbo.json` only when the spec declares divergent task config.
- Validate `$TURBO_EXTENDS$` placement for array inheritance.

### C4a: Publishable Workspace Package Workflow

- Add publishability metadata to package specs.
- Keep default workspace packages private.
- Generate Changesets root config and scripts only when release workflow is selected.
- Verify default generated workspaces do not imply npm publication.
