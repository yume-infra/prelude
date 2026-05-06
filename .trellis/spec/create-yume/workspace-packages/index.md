# Workspace Packages

> pnpm workspace root and structured child package generation contracts.

---

## Scope

This layer covers `workspace-root` generation, `WorkspaceRootConfig.packages`, target-aware template registry filtering, child package manifests, and explicit internal dependency links.

## Signatures

```typescript
interface WorkspaceRootConfig {
  readonly type: 'workspace-root'
  readonly packageManager: 'pnpm'
  readonly packages: readonly GenerationPackageSpec[]
}

type GenerationTargetScope = 'root' | 'package' | 'both'
type PackageManifestTargetPath = 'package.json' | `${string}/package.json`
```

Core functions:

```typescript
workspacePackageTargetDirectory(spec)
workspacePackageProjectConfig(rootConfig, spec)
buildWorkspacePackages(dsl, templateRoot, rootConfig)
buildTemplates(dsl, templateRoot, config, { targetScope, targetDirectory, renderConfig })
buildPackageManifestJson(dsl, { targetPath, targetScope, base, contributions, ownership })
```

## Contracts

- Empty `WorkspaceRootConfig.packages` materializes only the workspace root.
- Non-empty `packages` materializes root files plus child packages.
- `frontend-app`, `backend-app`, and `cli-tool` target `apps/<id>`.
- `library-package` targets `libs/<id>`.
- Child package `package.json` name comes from package spec `name`, not filesystem `id`.
- Child templates must render with package-local config via `renderConfig`.
- Internal dependencies are emitted only when declared and always use `workspace:*`.
- Missing internal dependency targets fail before plan application.
- Root post-generate commands remain root-level.
- Workspace root scripts are derived from package scripts that generated child packages actually emit.
- Empty package lists must not advertise child orchestration scripts such as `test`, `lint`, or `clean`.
- Root scripts such as `test`, `lint`, and `clean` must only appear when at least one emitted child package has the corresponding package-local script.

## Future Monorepo Taste Guardrails

Use these contracts when adding richer monorepo features:

- pnpm catalogs affect external dependency version values only.
- Internal package links remain explicit `workspace:*` dependencies, never catalog entries.
- Generated catalog entries must be derived from emitted package dependencies.
- Prefer the default `catalog` table first; named catalogs need their own contract.
- Standalone projects keep direct dependency ranges.
- Shared config packages are generated as package-scoped workspace packages, not copied root templates inside every child package.
- Package-local `turbo.json` is opt-in only and must extend the root with `extends: ["//"]`.
- Workspace packages stay internal/private by default until a publishable-package contract exists.
- Changesets belongs to an explicit release-workflow feature, not the default workspace baseline.

## Validation & Error Matrix

| Case | Expected behavior | Boundary |
| --- | --- | --- |
| Root manifest sees package-only contribution | Contribution is filtered out | Manifest collector |
| Child manifest sees root-only lint/Husky contribution | Contribution is filtered out | Manifest collector |
| Same nested target same key different value | `PackageManifestContributionConflictError` includes nested target path | Manifest collector |
| Duplicate nested plan paths | `PlanConflictError` before writes | Plan apply |
| Dependency target missing | Fail before plan application | Workspace package builder |
| `worker-app` child package requested | Do not silently materialize unrelated templates | Schema/planner review |

## Good/Base/Bad Cases

Good:

```typescript
buildTemplates(dsl, templateRoot, packageConfig, {
  targetScope: 'package',
  targetDirectory: 'apps/web',
  renderConfig: packageConfig,
})
```

Base:

```typescript
buildPackageJson(dsl, workspaceRootConfig)
buildTemplates(dsl, templateRoot, workspaceRootConfig)
buildWorkspacePackages(dsl, templateRoot, workspaceRootConfig)
```

Bad:

```typescript
for (const localPackage of workspace.packages) {
  dependencies[localPackage.name] = 'workspace:*'
}
```

## Tests Required

- Schema tests for package specs and runtime defaults.
- Planner tests for mixed root, `apps/*`, and `libs/*` output.
- Package manifest tests for explicit `workspace:*` links only.
- Render tests proving package templates use child config.
- Workspace root manifest tests proving root scripts only orchestrate emitted child scripts.
- Standalone React/Vue/Node/CLI tests must remain green.
- Future pnpm catalog tests must cover root catalog materialization, child dependency references, and standalone non-catalog output.
