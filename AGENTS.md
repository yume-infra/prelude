@/Users/sayori/.codex/RTK.md

# AGENTS.md

## Source Of Truth

`docs/` is the only active project knowledge source for this repository.

Start with:

1. `docs/README.md`
2. `docs/CONTEXT.md`
3. `docs/harness-convergence-goal.md`
4. `docs/multi-harness-convergence-architecture.md`
5. `docs/harness-module-contract.md`
6. `docs/harness-integration-lifecycle.md`
7. `docs/prelude-rebuild-plan.md`
8. `docs/adr/`
9. `docs/architecture-review.md`
10. `docs/architecture-handoff.md`

Everything under `docs/archive/` is historical and non-authoritative. Do not use
archived requirements to fill gaps in the active design.

There is no active Trellis workflow in this repository and no project-local
skill baseline to maintain. Do not recreate `.trellis/` or `.agents/skills/`
unless the user explicitly asks for a new system with that exact shape.

## Architecture Stance

The rebuild target is multi-harness convergence, not project generation.

```text
target package graph and lockfile
  -> exact Prelude and Harness Artifacts
  -> explicit Harness Integrations
  -> read-only target-aware module plans
  -> global Output, Requirement, Issue, and Check composition
  -> direct current-to-desired comparison
  -> one visible, versioned, hashed Plan Document
  -> exact approval
  -> rerunnable apply
  -> target-executed composed verification
```

The architecture has one stateless lifecycle for initial Integration and
Artifact upgrades. User-authorized Prelude skills own bootstrap, blocker
repair, executable-config preparation, upgrade coordination, and residue
cleanup outside core. Integration removal is deferred beyond V1.

Required invariants:

- multiple Harness Modules and multiple integrations of one module are normal;
- all active Harness surface mutation goes through Prelude;
- Harness Modules receive read-only target access and return declarative plans;
- the Control Root directly depends on Prelude and every Harness Artifact;
- root `package.json` and `pnpm-lock.yaml` select exact executable artifacts;
- Prelude composes every integration before any write;
- integration id, not package id, is the stable Output owner;
- approval binds an exact plan hash and observed target state;
- selected Artifacts plus `prelude.config.jsonc` are complete desired truth;
- V1 Outputs are ManagedTree, ManagedBlock, JsonValue, and JsonKeyedItem only;
- everything outside active Output locators is target-owned by default;
- `.prelude/` does not exist in V1;
- `projection` remains a Psychogram domain term, not a Prelude abstraction;
- Prelude core has no create, init, remove, provider, maintain, or TUI product surface;
- Harnesses declare verification, Prelude composes it, and targets execute it through `prelude check`; verification failure does not roll back apply.
- production runtime and shared codecs use Effect v4, Effect Schema, and `@effect/platform`;
- observable Partita behavior is authoritative over old code shape or helper interfaces.

Do not preserve the retired create/provider architecture through compatibility
layers. Delete superseded paths at the deletion gates in
`docs/prelude-rebuild-plan.md`.

## Initial Scope

- pnpm TypeScript/JavaScript targets
- single-package repositories and pnpm workspaces
- real Effect Harness and Psychogram Modules running together from the first V1 release proof
- Partita as the required installed-Artifact acceptance target
- first-party trusted modules, not an untrusted plugin sandbox

If a public harness package does not yet implement the new contract, report it
as a cross-repository release blocker. Do not weaken Prelude to support the old
package shape.

## Project Notes

- npm publishing for this repository is handled by
  `.github/workflows/release.yml` on `main` pushes or manual workflow dispatch.
  Do not treat local `npm whoami` / `ENEEDAUTH` as a release blocker unless the
  user explicitly asks for local publishing.
- Use the `rtk` prefix for shell commands.

## Agent Configuration

Repo-local agent configuration lives under `docs/agents/`.

- Issues and PRDs are tracked in GitHub Issues for `yume-infra/prelude`.
- Use the default triage labels: `needs-triage`, `needs-info`,
  `ready-for-agent`, `ready-for-human`, and `wontfix`.
- Domain reading starts at `docs/README.md`.
