# C: Turborepo Monorepo Taste Expansion

## Goal

Design the later-stage monorepo sophistication layer for create-yume generated Turborepo workspaces. This task is independent from A and B and should produce a scoped plan, not rush implementation into current product boundaries.

## Background

This task is child C of the lead brainstorm task:

- `.trellis/tasks/05-05-05-05-expand-monorepo-node-cli-scaffolds`

The user clarified that C is still about **Turborepo**, not Turbopack. Turbopack/Next is not desired.

## Requirements

- Explore later monorepo taste improvements for Turborepo + pnpm workspaces.
- Keep the current supported scaffold boundaries in mind:
  - React
  - Vue
  - workspace root
  - Node
  - CLI
  - structured workspace packages
- Focus on what should become shared/configured in generated monorepos once A's foundation is stable.
- Produce implementation-ready recommendations that can become future tasks.
- Avoid changing code unless the lead explicitly converts a C recommendation into an implementation task.

## Research Topics

- pnpm catalogs:
  - when generated workspaces should use `catalog:`.
  - how catalog entries interact with package-local dependency ownership.
  - whether create-yume should emit catalogs only for multi-package workspaces.
- Shared config packages:
  - `@repo/typescript-config`.
  - `@repo/eslint-config`.
  - `@repo/prettier-config` if formatter support enters product scope.
  - whether create-yume needs a new package kind for tooling/config packages.
- Package-level `turbo.json`:
  - when current/future package families need package-specific outputs or env.
  - how to use `extends: ["//"]` and `$TURBO_EXTENDS$`.
- Publish/release workflow:
  - whether library packages should stay internal-only by default.
  - when Changesets should be generated.
- Package naming and graph taste:
  - package id vs package name.
  - npm-safe scoped names.
  - examples such as `@repo/ui`, `@repo/shared`, `@repo/config`.
- Documentation and generated examples:
  - how to teach app vs library package roles.
  - when shared code should move to `libs/*`.

## Acceptance Criteria

- [ ] C produces a recommendation document or PRD update with clear future implementation slices.
- [ ] Recommendations distinguish MVP-next from later and out-of-scope.
- [ ] Recommendations do not rely on Turbopack or Next.
- [ ] Recommendations preserve current create-yume product boundaries unless explicitly proposing a boundary change.
- [ ] Any proposed implementation lists likely files, validation, and compatibility risks.

## Candidate Future Slices

- C1: pnpm catalog policy for generated workspaces.
- C2: first-class config package kind for shared TypeScript/ESLint configuration.
- C3: package-level Turbo config support for divergent package families.
- C4: publishable library/release workflow with Changesets.
- C5: stricter package name validation and better generated spec examples.

## Likely Files If Later Implemented

- `apps/cli/src/schema/generation-package-spec.ts`
- `apps/cli/src/schema/project-config.ts`
- `apps/cli/src/core/workspace-bootstrap.ts`
- `apps/cli/src/core/workspace-packages.ts`
- `apps/cli/src/core/template-registry/*`
- `apps/cli/src/core/owners/*`
- `apps/cli/templates/fragments/common/workspace/*`
- future config package templates under `apps/cli/templates/fragments/*`
- `.trellis/user/create-yume.md`
- `.trellis/spec/create-yume/generation-model/index.md`
- `.trellis/spec/create-yume/verification/index.md`

## Parallel Boundaries

- This task should not edit A's Turborepo foundation files while A is active.
- This task should not edit B's CLI Effect schema/templates while B is active.
- This task can safely produce planning documents and future task breakdowns in `.trellis/tasks/` if the lead agrees. Durable knowledge belongs in `.trellis/spec/` or `.trellis/user/`.

## Verification

If this remains research-only, verification is human review of the produced plan.

If implementation is later approved, use `.trellis/spec/create-yume/verification/index.md` based on the selected slice. Likely minimums:

```bash
pnpm --filter create-yume test
pnpm --filter create-yume typecheck
```

Generated-output changes may require:

```bash
pnpm --filter create-yume smoke:generated
pnpm --filter create-yume smoke:examples
```

## References

- Turborepo structuring guide: https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository
- Turborepo package configurations: https://turborepo.dev/docs/reference/package-configurations
- Turborepo dependency management: https://turborepo.dev/docs/crafting-your-repository/managing-dependencies
- Turborepo TypeScript guide: https://turborepo.dev/docs/guides/tools/typescript
- pnpm catalogs: https://pnpm.io/catalogs
- pnpm workspaces: https://pnpm.io/workspaces

## Out of Scope

- Turbopack / Next support.
- Immediate implementation without lead approval.
- Remote templates.
- Plugin/template-source systems.
- Incremental append/update of existing workspaces.
- Worker app generation.
