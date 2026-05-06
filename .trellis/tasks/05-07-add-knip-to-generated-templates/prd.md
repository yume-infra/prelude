# brainstorm: add knip to generated templates

## Goal

Introduce Knip into generated project templates as a stable maintenance-quality check, matching the way this repository now treats Knip as part of `pnpm verify`.

## What I already know

- The user recently added Knip to this repository as a stable verification step.
- Root `package.json` already includes `pnpm knip` in `verify` / `verify:code`, and `.trellis/spec/create-yume/verification/index.md` now says broad verification must include Knip.
- Generated output currently models linting as `linting: 'antfu-eslint' | 'none'` and code-quality hooks as `codeQuality: ['lint-staged', 'commitlint']`.
- `package.json` generation is a structured hotspot: dependencies and scripts should be added via manifest contributions, not Handlebars templates.
- Root-only files such as ESLint, Git, commitlint, lint-staged, pnpm workspace, and turbo config are owned by `workspace-bootstrap`.

## Assumptions (temporary)

- Knip should be treated as a maintenance / verification tool, adjacent to lint/test/build gates, not as a runtime scaffold-family concern.

## Open Questions

- None currently.

## Requirements (evolving)

- Add Knip in a way that participates in generated project verification without relying on hidden external side effects.
- Enable Knip by default for generated projects where package metadata and source layout make dead-code/dependency analysis meaningful.
- Keep package manifest changes in contribution owners with provenance and conflict diagnostics.
- Keep Knip config root-scoped for standalone projects and workspace roots; avoid copying root-only config into generated workspace child packages.
- Prefer conventional Knip config discovery over custom `--config` paths unless a preset needs a deliberate alternate config.
- Use `knip.jsonc` as the default generated config format.

## Acceptance Criteria

- [x] Generated projects include a `knip` script and dev dependency by default.
- [x] Applicable generated presets include Knip by default rather than requiring full-preset opt-in.
- [x] Generated broad verification scripts include Knip through a root `verify` script.
- [x] Generated `knip.jsonc` configuration is root-scoped and matches standalone vs workspace shape.
- [x] Tests cover manifest contributions, template registry/config rendering, and generated smoke where generated verification behavior changes.

## Definition of Done (team quality bar)

- Tests added/updated (unit/integration where appropriate)
- Lint / typecheck / CI green
- Docs/notes updated if behavior changes
- Rollout/rollback considered if risky

## Research References

- [`research/knip-cli-and-config.md`](research/knip-cli-and-config.md) - Knip CLI is the execution surface, but stable generated policy should live in discovered config plus package scripts.

## Technical Notes

- Relevant repo files inspected:
  - `apps/cli/src/core/workspace-bootstrap.ts`
  - `apps/cli/src/core/template-registry/workspace-bootstrap.ts`
  - `apps/cli/src/core/owners/scaffold-family.ts`
  - `apps/cli/src/core/modifier/package-manifest-contributions.ts`
  - `apps/cli/src/schema/project-config.ts`
  - `.trellis/spec/create-yume/template-system/index.md`
  - `.trellis/spec/create-yume/verification/index.md`
- Knip docs referenced:
  - <https://knip.dev/reference/cli>
  - <https://knip.dev/reference/configuration>

## Feasible Approaches

### Approach A: Workspace/bootstrap maintenance tool (recommended)

- Treat Knip as root-scoped maintenance tooling owned by `WorkspaceBootstrapOwner`.
- Add `knip` dev dependency and script through package manifest contributions.
- Add a root `knip.jsonc` or `knip.ts` template only when needed.
- Extend generated `verify` scripts to include `pnpm knip` once verify exists in generated manifests.
- Enable it by default for generated standalone package roots and workspace roots.

Pros: matches current repo policy, respects root-only tooling boundaries, works for standalone and workspace roots.  
Cons: may require clarifying generated `verify` semantics first because not every preset currently has a broad verify script.

## Decision (ADR-lite)

**Context**: Knip has become part of this repository's broad maintenance verification, and generated projects should inherit that quality baseline instead of treating dead-code/dependency analysis as an advanced add-on.

**Decision**: Use Approach A. Knip is default root-scoped maintenance tooling owned by workspace/bootstrap policy. It should be contributed through manifest contribution rules and a conventional root `knip.jsonc` config template, not through scaffold-family-specific duplication, `package.json#knip`, or a create-yume wrapper.

**Consequences**: Generated projects will start with stronger dependency/export hygiene. Template tests and generated smoke expectations must account for Knip in default package manifests. The implementation must keep workspace child packages from receiving root-only Knip config files.

### Approach B: Code-quality option alongside lint-staged/commitlint

- Extend `CodeQualitySchema` with `knip`.
- Let users/presets opt into Knip the same way they opt into commitlint/lint-staged.
- Add contributions from `workspace-bootstrap` based on `config.codeQuality.includes('knip')`.

Pros: exposes choice cleanly in existing user-facing taxonomy.  
Cons: `codeQuality` currently means Git hook-ish tools, so Knip may stretch the name unless the taxonomy is broadened.

### Approach C: Family-specific Knip templates

- Add Knip script/config per scaffold family (frontend/node/cli/library).
- Use CLI flags heavily in package scripts instead of a shared config.

Pros: very targeted per generated shape.  
Cons: likely duplicates policy, fights root-only workspace rules, and makes future Knip tuning harder.

## Out of Scope (explicit)

- Building a custom Knip wrapper CLI inside create-yume.
- Running Knip automatically as a post-generate command.
- Supporting every Knip advanced option in create-yume config up front.
