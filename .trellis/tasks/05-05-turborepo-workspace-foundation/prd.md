# A: Turborepo Workspace Foundation

## Goal

Harden create-yume's generated Turborepo + pnpm workspace foundation so generated workspaces are correct, cache-aware, and tasteful within the current product boundary.

## Background

This task is child A of the lead brainstorm task:

- `.trellis/tasks/05-05-05-05-expand-monorepo-node-cli-scaffolds`

The user clarified that the relevant tool is **Turborepo**, not Turbopack. Turbopack/Next is out of scope.

## Requirements

- Keep generated workspaces on pnpm + Turborepo.
- Keep runnable packages in `apps/*` and library packages in `libs/*`.
- Avoid nested workspace globs.
- Keep dependencies declared where they are used; root dependencies should stay limited to workspace tooling.
- Keep declared internal dependencies as `workspace:*`.
- Harden generated root `turbo.json` task defaults:
  - `build` depends on `^build`.
  - cache outputs match real package-local artifacts such as `dist/**`.
  - `dev` is uncached and persistent.
  - inputs preserve `$TURBO_DEFAULT$` when customized.
- Ensure generated root package scripts match scripts actually emitted by child packages.
- Fix obvious generated package correctness issues discovered during research, especially neutral library tsconfig behavior.
- Do not add root solution `tsconfig.json` / TypeScript project references in this task.
- Do not add shared config packages, pnpm catalogs, package-level `turbo.json`, or release workflow in this task.

## Acceptance Criteria

- [ ] Generated workspace root `package.json`, `pnpm-workspace.yaml`, and `turbo.json` align with current Turborepo guidance.
- [ ] Root scripts do not advertise missing child tasks.
- [ ] Generated package dependencies remain package-local except root workspace tooling.
- [ ] Declared workspace internal dependencies still produce `workspace:*`.
- [ ] Neutral library generated output does not require Node types unless runtime is `node`.
- [ ] Existing standalone React/Vue/Node/CLI generation does not regress.
- [ ] Tests/snapshots cover any changed plan or generated output.

## Technical Approach

1. Audit current generated workspace root output.
   - Inspect templates under `apps/cli/templates/fragments/common/workspace/`.
   - Inspect workspace root policy in `apps/cli/src/core/workspace-bootstrap.ts`.
   - Inspect workspace package generation in `apps/cli/src/core/workspace-packages.ts`.

2. Update root Turborepo policy only where needed.
   - Prefer minimal root `turbo.json` that fits all current package families.
   - Avoid package-level `turbo.json` unless a current package family truly needs it.
   - Keep framework-specific outputs out of root unless currently generated packages emit them.

3. Fix package correctness issues.
   - Neutral `library-package` should not inherit `types: ["node"]` unless its runtime is `node`.
   - Keep explicit `exports`, `main`, `types`, and `files` manifest fields for library packages.

4. Validate generated output.
   - Update snapshots/tests for expected root/package output changes.
   - Run the verification target below.

## Likely Files

- `apps/cli/src/core/workspace-bootstrap.ts`
- `apps/cli/src/core/workspace-packages.ts`
- `apps/cli/src/core/owners/scaffold-family.ts`
- `apps/cli/src/core/template-registry/workspace-bootstrap.ts`
- `apps/cli/src/core/template-registry/node-runtime.ts`
- `apps/cli/templates/fragments/common/workspace/pnpm-workspace.yaml.hbs`
- `apps/cli/templates/fragments/common/workspace/turbo.json.hbs`
- `apps/cli/templates/fragments/common/node-runtime/tsconfig.json.hbs`
- `apps/cli/templates/fragments/common/node-runtime/tsdown.config.ts.hbs`
- `apps/cli/templates/fragments/library/*`
- `apps/cli/tests/*`
- `.trellis/user/create-yume.md` if user-facing generated behavior changes
- `.trellis/spec/create-yume/generation-model/index.md` if product boundary wording changes

## Parallel Boundaries

- This task should not implement `cli-effect`.
- This task should not add new CLI toolkit schema values.
- This task should avoid changing `apps/cli/templates/fragments/cli/index.ts.hbs` unless the lead explicitly moves minimal CLI hardening into A.
- Coordinate with task B before changing shared CLI package contribution code in `scaffold-family.ts`.

## Verification

Minimum expected commands after implementation:

```bash
pnpm --filter create-yume test -- workspace-root
pnpm --filter create-yume test -- planner
pnpm --filter create-yume typecheck
```

If generated package build/bin behavior changes, also run:

```bash
pnpm --filter create-yume smoke:generated
pnpm --filter create-yume smoke:examples
```

## References

- Turborepo structuring guide: https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository
- Turborepo task configuration: https://turborepo.dev/docs/crafting-your-repository/configuring-tasks
- Turborepo configuration reference: https://turborepo.dev/docs/reference/configuration
- Turborepo dependency management: https://turborepo.dev/docs/crafting-your-repository/managing-dependencies
- Turborepo TypeScript guide: https://turborepo.dev/docs/guides/tools/typescript

## Out of Scope

- Turbopack / Next support.
- CLI Effect toolkit support.
- Shared config packages.
- pnpm catalogs.
- package-level Turbo configs for future framework families.
- Changesets or publish workflow.
- Incremental append/update of existing workspaces.
