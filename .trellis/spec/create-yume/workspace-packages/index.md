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
- Standalone React/Vue/Node/CLI tests must remain green.
