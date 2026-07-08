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
  -> Files
  -> optional maintain initialization
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
- `.prelude/manifest.json` is a maintain provider index. Ordinary scaffold
  creation does not write a durable manifest ledger.
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
- [create/maintain architecture](./docs/create-maintain-architecture.md)
- [final state](./docs/prelude-final-state.md)
- [rebuild plan](./docs/prelude-rebuild-plan.md)
- [create materialization](./docs/create-materialization-architecture.md)
- [maintain architecture](./docs/maintain-architecture.md)
- [provider artifact placement](./docs/provider-artifact-placement-architecture.md)
- [agent configuration](./docs/agents/)

## Development Commands

```bash
pnpm install
pnpm build
pnpm verify
pnpm smoke:examples
```

The generated smoke command builds the CLI, runs the canonical `--spec` route
under `apps/examples/.generated/`, verifies ordinary generated files, the
maintain provider namespace when selected, and renderable frontend targets, then
installs and builds the generated targets. It prints the generated target paths.
The generated targets are gitignored and intentionally kept for inspection.
After a stable commit has passed smoke, do not rerun smoke again unless the
working tree or baseline changes.

`knip.json` keeps a narrow self-target allowance for the Effect harness package
baseline and the exported CreateSpec/lifecycle type surface. Those entries are
part of the active provider contract, not legacy generator residue.

## Repository Map

```text
apps/cli/      CLI implementation and current generator code
docs/          active product and architecture knowledge
```

## Collaboration

Use conventional commits.

```bash
git commit -m "docs: align prelude architecture"
```

Issues and PRDs use GitHub Issues for `yume-infra/prelude`; see
[`docs/agents/issue-tracker.md`](./docs/agents/issue-tracker.md).
