# Handle Knip Dependency and Verification

## Goal

Keep the newly added Knip dependency aligned with the repository dependency policy, then run `pnpm knip` to surface any unused files, exports, or dependencies.

## Requirements

* Root `pnpm knip` script remains available.
* External `knip` dependency version is centralized in the pnpm catalog.
* `pnpm knip` runs from the workspace root.

## Acceptance Criteria

* [x] `package.json` references `knip` through `catalog:`.
* [x] `pnpm-workspace.yaml` contains the `knip` catalog entry.
* [x] `pnpm-lock.yaml` is consistent with the manifest and workspace catalog.
* [x] `pnpm knip` result is reviewed and reported.

## Definition of Done

* Dependency policy followed.
* Knip output reviewed for actionable issues.
* No unrelated user changes reverted.

## Technical Approach

Use the existing root-script pattern and pnpm catalog dependency convention. Keep `knip.json` scoped to root analysis unless the command output shows that workspace coverage needs adjustment.

## Out of Scope

* Broad cleanup of all Knip findings unless required to make the new command usable.
* Changing existing verification scripts.

## Technical Notes

* Relevant specs: `.trellis/spec/create-yume/repository/index.md`, `.trellis/spec/create-yume/verification/index.md`, `.trellis/spec/guides/code-reuse-thinking-guide.md`.
* Repository rule: external dependency versions are centralized through the pnpm catalog.
* `pnpm knip` runs successfully after adding `apps/cli` workspace coverage, but exits 1 because it reports real issues:
  * unused files: `apps/cli/src/constants/config-meta.ts`, `apps/cli/src/constants/paths.ts`, `apps/cli/src/utils/none.ts`;
  * unused root devDependency: `@biomejs/biome`;
  * many unused exports/exported types and 6 duplicate fixture exports.
* `pnpm install` without `--ignore-scripts` currently fails because `apps/cli` `prepare` runs `effect-language-service patch` and cannot find `apps/cli/node_modules/typescript/package.json`. `pnpm install --ignore-scripts` succeeded for refreshing the dependency state enough to run Knip.
* `pnpm --filter create-yume build` passed.
