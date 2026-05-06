# Prepare 0.1.0 Release

## Goal

Prepare Create Yume for its first 0.1.0 release by removing current release blockers, aligning package metadata with the intended `pnpm create yume` usage, tightening publish-facing documentation, pruning unused production dependencies, and recording known generated Tailwind CSS build warnings as non-blocking release noise.

## Requirements

- Fix the current lint blocker caused by the Trellis workspace markdown file missing a trailing newline.
- Bump the publishable `create-yume` package to version `0.1.0`.
- Ensure package metadata supports publishing as `create-yume`, so users can run it via `pnpm create yume` after publish.
- Add human-facing package README content with current project status and quick start usage.
- Remove production dependencies that are not used by runtime source.
- Treat broader product ambitions such as append/update, worker app generation, remote templates, and pluginized template sources as future-version scope.
- Record in `AGENTS.md` that Tailwind CSS / Lightning CSS unknown at-rule warnings from generated full presets are expected and not release blockers when builds and lint pass.

## Acceptance Criteria

- [x] `pnpm verify` passes.
- [x] `pnpm --filter create-yume typecheck` passes.
- [x] `pnpm --filter create-yume smoke:dry-run` passes.
- [x] `pnpm --filter create-yume smoke:generated` passes.
- [x] `pnpm --filter create-yume smoke:examples` passes or any inability to run it is clearly reported.
- [x] `npm pack --dry-run` for `apps/cli` shows publish-facing README and expected package metadata.
- [x] Runtime dependency list only keeps packages used directly by runtime source or required by imported runtime entrypoints.
- [x] `AGENTS.md` includes the Tailwind warning note outside the managed Trellis block.

## Definition of Done

- Release-prep metadata, docs, dependency, and guidance changes are implemented.
- Generated project smoke coverage remains green.
- The working tree has only intentional changes.

## Technical Approach

- Use existing Changesets setup and direct package metadata edits for the release version.
- Keep root package private, but rename it away from the starter placeholder if needed so repository metadata is not confusing.
- Add package-level README in `apps/cli` because npm publishes files relative to the package directory.
- Verify dependency usage by searching runtime imports under `apps/cli/src`.
- Preserve broader roadmap as documentation/future scope rather than implementing new product capability in this task.

## Out of Scope

- Implementing append/update behavior.
- Adding worker app generation.
- Adding remote template or pluginized template support.
- Changing generated Tailwind output solely to remove known non-blocking Lightning CSS warnings.

## Technical Notes

- Current package name under `apps/cli/package.json` is already `create-yume`.
- Current root package name is `with-changesets`, which is private but publish-confusing.
- Current `.changeset/tidy-dreams-create.md` declares a minor release for `create-yume`.
- Runtime source does not import several packages currently listed in `apps/cli/package.json` dependencies.
- Verification completed on 2026-05-06: `pnpm verify`, `pnpm --filter create-yume typecheck`, `pnpm --filter create-yume smoke:dry-run`, `pnpm --filter create-yume smoke:generated`, `pnpm --filter create-yume smoke:examples`, and `npm pack --dry-run` from `apps/cli`.
- `.trellis/user/` did not need a scope update; the package-facing README now carries the human quick start for npm users, and broader product ambitions remain future-version scope.
