# Repository Rules

> Monorepo, documentation, dependency, and collaboration rules.

---

## Repository Shape

```text
apps/cli/       @sayoriqwq/prelude CLI package and templates
apps/examples/  generated-output smoke workspace
.trellis/spec/  agent-facing executable project specs
.trellis/user/  human-facing project context
```

`docs/` is not a source of truth in this repository. Stable project knowledge belongs in `.trellis/spec/` or `.trellis/user/`.

## Documentation Rules

- `.trellis/spec/` contains executable coding contracts, boundaries, matrices, and tests.
- `.trellis/user/` contains Simplified Chinese project context, package maps, reading order, and human-facing pitfalls.
- Do not mirror every spec mechanically into user docs.
- If a change affects supported scope, architecture, package roles, or reading order, update `.trellis/user/`.
- If a change affects implementation contracts, update `.trellis/spec/`.

## Dependency Rules

- External dependency versions are centralized through the pnpm catalog.
- Add new external dependencies to the catalog first, then to the package that uses them.
- Internal workspace dependencies must be explicit.
- Generated workspace package internal links use `workspace:*` only when declared.
- Dependency freshness tooling uses `taze` as an installed dev dependency, not `pnpm dlx`, so checks and updates are lockfile-reproducible.
- Keep taze freshness checks out of `verify` / `verify:code`; use explicit `deps:*` scripts for human-triggered dependency maintenance.

## Monorepo Taste Expansion Rules

Future generated monorepo sophistication should be explicit and package-owned:

- pnpm catalogs are for external versions; internal links stay `workspace:*`.
- Shared TypeScript, ESLint, or tooling config packages should be real workspace packages with package-owned manifests.
- Package-local Turbo config should be opt-in and extend the root pipeline instead of replacing it.
- Publishable packages and Changesets require an explicit release workflow before they appear in default output.

## Release Automation Rules

- npm publishing for `@sayoriqwq/prelude` is owned by `.github/workflows/release.yml`.
- The release workflow runs on pushes to `main` and on `workflow_dispatch`.
- `changesets/action@v1` runs `pnpm version-packages` when changesets need a version PR and `pnpm release` when publishing is ready.
- `pnpm release` runs `pnpm verify`, `pnpm smoke:dry-run`, `pnpm smoke:examples`, then `changeset publish`.
- GitHub Actions publishes with `secrets.NPM_TOKEN`; local `npm whoami` / `ENEEDAUTH` is not a repository release blocker unless the user explicitly asks for local publishing.

## Git And Commit Rules

- Use conventional commits: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.
- Keep commit scope aligned with the actual change.
- Before commit, run the verification command that matches the changed surface.
- For knowledge-only work, perform manual cold read and run affected documentation contract tests.

## Forbidden Patterns

- Do not reintroduce `docs/` as a project knowledge entrypoint.
- Do not store active execution TODOs or phase logs as stable documentation.
- Do not move generated smoke output into committed source.
- Do not scatter dependency versions across package manifests.
