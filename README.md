# @sayoriqwq/prelude

`prelude` is a Sayori-first project genesis system.

Its job is to create a new project in the shape Sayori actually wants: preferred
technology stack, engineering baseline, agent/harness infrastructure, and
verification surface from day one.

The name is literal. `prelude` prepares the opening state. After creation,
ordinary scaffold output is handed to the project owner. The only post-create
update surface is the narrow lifecycle provider layer, currently the AI harness
provider path.

## Target Architecture

The rebuild target is one composition pipeline:

```text
CreateSpec
  -> Resolver
  -> ResolvedGraph
  -> Capability Contributions
  -> Surface Materializers
  -> WritePlan
  -> Files + .prelude/manifest.json
```

Key rules:

- `CreateSpec` is the only canonical creation input.
- Guided CLI is a `CreateSpec` builder.
- Reusable project shapes are saved `CreateSpec` files, not a separate preset
  model.
- Capabilities contribute typed data to logical surfaces; they do not write
  files directly.
- Each physical file or managed block has one owner materializer.
- There is no global Handlebars/template-rendering layer in the target
  architecture.
- `.prelude/manifest.json` records creation provenance and lifecycle provider
  state; it is not a whole-project management contract.
- `prelude update` updates active lifecycle providers only.

## What This Rebuild Deletes

The repository is being moved to the final model directly. Old baselines are not
maintained as compatibility architecture.

Deletion targets include:

- project-local Trellis baseline
- project-local old workflow skills
- preset as a first-class product model
- `ProjectConfig` as creation truth
- Plan / PlanSpec as creation truth
- Handlebars-style `template + params bag -> file` rendering
- capability-owned direct writes to shared files
- ordinary scaffold update semantics

If existing code cannot be made to express the target model cleanly, it should
be removed rather than wrapped.

## Docs

The active project knowledge is under `docs/`:

- [docs index](./docs/README.md)
- [goal](./docs/prelude-goal.md)
- [final state](./docs/prelude-final-state.md)
- [rebuild plan](./docs/prelude-rebuild-plan.md)
- [manifest and materialization](./docs/manifest-materialization-architecture.md)
- [provider lifecycle](./docs/provider-lifecycle-architecture.md)
- [agent configuration](./docs/agents/)

## Development Commands

```bash
pnpm install
pnpm build
pnpm verify
pnpm smoke:dry-run
pnpm smoke:examples
```

Generated smoke output is written under `apps/examples/.generated/`.

Use `PRELUDE_SMOKE_CASES` for focused smoke runs:

```bash
PRELUDE_SMOKE_CASES=react pnpm smoke:examples
PRELUDE_SMOKE_CASES=cli,library pnpm smoke:examples
PRELUDE_SMOKE_CASES=workspace pnpm smoke:examples
```

## Repository Map

```text
apps/cli/      CLI implementation and current generator code
apps/examples/ generated smoke output
docs/          active product and architecture knowledge
```

## Collaboration

Use conventional commits.

```bash
git commit -m "docs: align prelude architecture"
```

Issues and PRDs use GitHub Issues for `sayoriqwq/create-yume`; see
[`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md).
