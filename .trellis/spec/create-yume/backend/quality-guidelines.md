# Quality Guidelines

> Code standards and forbidden patterns for the CLI runtime.

---

## Overview

Quality in `create-yume` means preserving the stable scaffold execution core while keeping new behavior visible through schemas, owners, plan tasks, tests, and docs.

The codebase is Effect-native. Prefer local project patterns over generic Node scripts.

## Core Rules

- Preserve the stable core: `PlanService`, `PlanSpec`, `TemplateEngineService`, `FsService`, and rollback behavior.
- Keep responsibilities ownership-oriented: scaffold family owners, workspace/bootstrap owners, and capability owners.
- Use branded values for project names, target directories, template paths, command names, and package names.
- Use Effect services for reusable dependencies with clear implementation boundaries.
- Search before changing constants, config values, package versions, template helper names, or generated paths.

## Scenario: Target-Aware Package And Template Composition

### 1. Scope / Trigger

Use this contract when a change needs to plan root files and nested workspace package files without adding a new execution workflow.

Triggers:

- Package manifest contributions may target root `package.json` or nested package manifests such as `apps/web/package.json` and `libs/ui/package.json`.
- Template registry entries need to be filtered for workspace root, child package, or standalone contexts.
- PlanSpec tests need to prove nested target paths and ownership traces.

### 2. Signatures

```typescript
type GenerationTargetScope = 'root' | 'package' | 'both'
type PackageManifestTargetPath = 'package.json' | `${string}/package.json`

interface PackageManifestContribution {
  readonly ownership: ContributionTrace
  readonly targetPath?: PackageManifestTargetPath
  readonly targetScope?: GenerationTargetScope
  readonly fields?: Record<string, unknown>
  readonly sections?: Partial<Record<PackageManifestSection, Record<string, unknown>>>
}

interface TemplateRegistryEntry<T> {
  readonly template: TemplatePath
  readonly target: string | ((config: T) => string)
  readonly scope?: GenerationTargetScope
  readonly condition: (config: T) => boolean
  readonly ownership?: ContributionTrace
}
```

Builder contracts:

```typescript
collectPackageManifestContributions({
  targetPath,
  targetScope,
  base,
  contributions,
})

buildPackageManifestJson(dsl, {
  targetPath,
  targetScope,
  base: () => ({ /* fresh package manifest base */ }),
  contributions,
  ownership,
})

buildTemplates(dsl, templateRoot, config, {
  targetScope,
  targetDirectory,
})
```

### 3. Contracts

- `targetScope: 'root'` includes root and both-scoped contributions/templates, and excludes package-only entries.
- `targetScope: 'package'` includes package and both-scoped contributions/templates, and excludes root-only entries.
- `targetScope: 'both'` is for standalone contexts where root and package concerns intentionally coincide.
- Undefined contribution/template scope defaults to `both` for backward compatibility.
- Undefined package contribution `targetPath` means "the current collection target"; explicit `targetPath` pins a contribution to one manifest.
- Nested template targets are formed by prefixing `targetDirectory` before registering render tasks. `PlanService` still owns final path validation.

### 4. Validation & Error Matrix

| Case | Expected behavior | Error boundary |
| --- | --- | --- |
| Root manifest with package dependency contribution | Package contribution is filtered out | No error |
| Child package manifest with root lint/Husky contribution | Root contribution is filtered out | No error |
| Same target path, same key, same value | Values dedupe and provenance owners merge | No error |
| Same nested target path, same key, different value | Throws `PackageManifestContributionConflictError` with nested `targetPath` | Manifest collector |
| Duplicate nested plan task paths | Throws `PlanConflictError` before writing | Plan apply boundary |
| Non-serializable reducer/base/template data | Throws `PlanSpecProjectionError` | PlanSpec projection |

### 5. Good/Base/Bad Cases

Good:

```typescript
buildPackageManifestJson(dsl, {
  targetPath: packageManifestTargetPath('apps/web'),
  targetScope: 'package',
  base: () => ({ name: '@demo/web', scripts: {}, dependencies: {}, devDependencies: {} }),
  contributions: getPackageManifestContributions(config),
  ownership: contributionTrace(FrontendPackageOwner, ContributionUnitKind.JsonTextMutation),
})
```

Base:

```typescript
buildPackageJson(dsl, config)
```

Bad:

```typescript
// Do not reuse standalone root assembly for child packages.
buildPackageJson(dsl, childLikeConfig)
buildTemplates(dsl, templateRoot, childLikeConfig)
```

### 6. Tests Required

- Manifest collector tests for root/package filtering, nested target paths, deterministic target ordering, and nested conflict diagnostics.
- Planner/PlanSpec tests proving nested paths are projected and root-only template/package contributions are excluded from package scope.
- Plan apply tests covering duplicate root and nested package target paths.
- Existing React/Vue and workspace-root package manifest tests must remain aligned with `collectPackageManifestForConfig`.

### 7. Wrong vs Correct

Wrong:

```typescript
const target = `apps/${name}/${entry.target}`
dsl.render(src, target)
```

This bypasses registry scope and can copy root-owned lint/Git/code-quality files into a child package.

Correct:

```typescript
buildTemplates(dsl, templateRoot, config, {
  targetScope: 'package',
  targetDirectory: `apps/${name}`,
})
```

This filters root-only entries before render tasks enter the plan.

## Examples

- `apps/cli/src/core/owners/router.ts` centralizes router predicates, templates, and dependency contributions.
- `apps/cli/src/core/ownership/model.ts` represents contribution ownership instead of relying on comments.
- `apps/cli/src/core/services/template-engine.ts` owns helper and partial registration, so template runtime complexity does not leak into callers.
- `apps/cli/tests/core/services/plan/projection-boundary.test.ts` and `apps/cli/tests/core/services/preview-schema-integration.test.ts` protect the preview/serialization boundary.

## Testing Expectations

- Unit and contract tests use Vitest under `apps/cli/tests/`.
- Snapshot-style generated output coverage is in `planner.spec.ts` and `template-render.spec.ts`.
- Real generated project smoke tests are `generated-projects.smoke.ts`, `generated-lint-strategy.smoke.ts`, and `linked-examples.smoke.ts`.
- Follow `docs/agent/verification-matrix.md` for the minimum command. When unsure, run `pnpm verify`.

## Forbidden Patterns

- Do not add remote template loading, plugin systems, Node project scaffolds, or incremental update workflows.
- Do not bypass Effect services with direct filesystem or command calls in runtime logic.
- Do not duplicate dependency version maps across unrelated files; capability owners should own their contributions.
- Do not move tests back into `src`.
- Do not update user-visible generated behavior without checking docs and snapshots.

## Common Mistakes

- Treating template changes as isolated when they also require registry, package mutation, snapshot, and smoke coverage.
- Adding shared frontend config for behavior that is actually React-specific or Vue-specific.
- Forgetting that minimal presets are build-only while full presets are lint-enabled.
