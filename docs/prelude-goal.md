# Prelude Goal

This document records the current product direction for `prelude`.
It lives under `docs/`, which is the active knowledge source for the rebuild.
The old `.trellis/` material is historical reference only.

## Core Goal

`prelude` is a Sayori-first project genesis system.

When starting a new project, it should generate an agent-ready project
workspace that already contains the preferred technology stack, engineering
baseline, AI/agent harness setup, verification surface, and version-update
loop.

The output is not just a code template. It is a workspace that an agent can
understand, modify, verify, and keep current.

The complete target architecture is recorded in
[`prelude-final-state.md`](./prelude-final-state.md). This goal document defines
why `prelude` exists; the final-state document defines what the finished system
looks like.

## First User

The first user is Sayori.

`prelude` should not pretend to be a neutral, generic create tool first. Public
use can be a side effect, but the default decisions should encode Sayori's
preferred stack and engineering taste.

## Product Shape

`prelude` has two creation modes:

- Preset mode: fast creation from a predefined combination.
- Normal CLI mode: interactive free composition.

Both modes must share the same composition and resolution path. A preset is a
pre-filled composition, not a separate generation implementation.

For now, `CreateSpec` is the main structured input for this composition model.
The larger architecture may change later, so the durable boundary is not
`CreateSpec` or `PlanSpec` themselves. The durable boundary is:

```text
prelude owns project composition.
capability providers own domain semantics.
```

## Composition Model

The first creation split should be topology/layout, not framework:

- Single package project.
- Workspace / monorepo.

React, Vue, Node, CLI, library, Effect, linting, Knip, AI harness, and similar
choices should be modeled as scoped capabilities rather than top-level project
types.

Capabilities must have scope:

- Root-level capabilities manage workspace/root surfaces.
- Package-level capabilities manage package-local surfaces.

This matters for monorepos. Root-level `AGENTS.md`, workspace scripts, Knip,
Taze, provider manifests, and verification should not be mixed with package
runtime choices such as React, Vue, Node, CLI, or library output.

## Harness Providers

Harnesses are composed at the provider level, not as arbitrary user-selected
internal modules.

Conceptually, an AI harness is an abstract contract. `effect-harness` is one
implementation of that contract for Effect projects.

`prelude` may select and orchestrate a harness provider, but it should not copy
or reimplement provider-specific domain rules. A provider owns its own:

- domain baseline
- runtime files
- managed target surfaces
- agent routes
- guardrails
- status command
- verify command
- update policy

`prelude` owns:

- topology
- package graph
- capability selection
- root/package scope
- conflict resolution
- generation orchestration
- overall acceptance
- provider artifact freshness

Provider internals can be modular, but the normal create flow should initially
select stable provider bundles. Do not expose harness-internal free composition
until there is enough evidence from multiple providers.

## Version Ownership

Version ownership follows content ownership.

If a provider owns a domain, it pins that domain's internal versions. For
example, `effect-harness` owns the Effect source pin, Effect package baseline,
Effect runtime, and Effect verifier contract.

`prelude` should not track or update provider internals. It should pin and
update the provider artifact or contract version it integrates with.

`prelude` owns the pins for content it emits directly, such as ordinary scaffold
dependencies, template defaults, and its own tooling baseline.

## Self-Iteration

The first self-iteration loop is version-based only.

The loop should:

1. Detect dependency or provider artifact drift.
2. Update the relevant pin.
3. Regenerate scaffold outputs or smoke examples.
4. Run verification and generated smoke checks.
5. Let an agent fix compatibility issues caused by the version update.
6. Update docs only when observable behavior or contracts change.

The first loop should not automatically add new frameworks, invent new presets,
change product defaults, or perform broad architecture refactors.

Major version drift is not part of the ordinary version-update loop.

- Provider artifact major drift is a provider integration redesign trigger.
- Generated scaffold dependency major drift is a scaffold compatibility task.
- `prelude` self-tooling major drift is a repository maintenance task.

Ordinary update may handle non-major version drift when the relevant contract
schema remains compatible. Major drift must block and become an explicit task.

## Managed Upgrade

`prelude` should be designed for upgrade from the first day, but upgrade is only
promised for `prelude`-managed projects.

A `prelude`-managed project must have one root manifest as the single source of
truth. The manifest should record:

- schema version
- original user intent
- resolved capability graph
- topology
- packages
- root-level capabilities
- package-level capabilities
- provider artifacts and contract versions
- pins owned by `prelude`
- managed surfaces and ownership

The original user intent explains what the user asked for. The resolved
capability graph records the concrete state that was generated after defaults,
pins, provider artifact versions, and conflict resolution were applied.

Update should not blindly regenerate from the original intent. It should:

1. Read the root manifest.
2. Re-resolve the original intent with the current `prelude` version and pins.
3. Produce the next expected resolved graph.
4. Compare it with the current resolved graph.
5. Apply only differences inside declared managed surfaces.
6. Write back the updated manifest.
7. Run verification.

Projects without a `prelude` manifest are not upgrade targets. They may later
get a separate adopt/import flow, but that is not part of ordinary update.

Adding a capability and migrating topology are explicit operations. They should
not be hidden inside version update.

## Manifest And Materialization

The manifest is not the input used to write files. It is the durable ledger that
records what `prelude` resolved, what it wrote, who owns each managed surface,
and what future update may safely touch.

The core architecture should be:

```text
original intent
  -> resolve capabilities, scopes, providers, and pins
  -> resolved graph
  -> collect capability/provider contributions
  -> merge logical surfaces
  -> materialize file operations
  -> write files
  -> verify and record surface snapshots
  -> write manifest last
```

The current function-based composition and template rendering can remain useful
as an execution layer, but they must not become the product architecture. They
are only ways to materialize resolved operations.

The root manifest should eventually live at `.prelude/manifest.json` in generated
projects and include:

- `schemaVersion`
- `preludeVersion`
- `originalIntent`
- `resolvedGraph`
- `pins`
- `providers`
- `managedSurfaces`
- `generatedUserSurfaces`

`originalIntent` records the user's initial choices. `resolvedGraph` records the
concrete answer after defaults, pins, provider versions, scopes, and conflict
resolution. Future update compares resolved graph to resolved graph; it does not
guess from the file tree.

## Logical Surfaces

Multiple capabilities must not patch the same physical file independently.
Capabilities contribute to logical surfaces, and each logical surface has one
materializer that writes the physical file.

Examples:

- `package-manifest` owns the physical `package.json` file.
- React, Vite, Knip, Jotai, and linting contribute structured entries such as
  dependencies, scripts, exports, package manager metadata, or tool config.
- The package manifest materializer performs the final merge, ordering,
  conflict detection, and write.

For structured files, ownership is tracked at the smallest stable structured
surface, such as a JSON pointer or known key path. Different keys may merge.
The same key with the same value dedupes. The same key with incompatible values
is a hard conflict that must be resolved by composition rules or rejected before
writing files.

For source files, `prelude` should avoid pretending arbitrary source edits are
safe to update forever. Most generated source files are generated-user surfaces:
created on day one, then handed to the project owner. Only source files with an
explicit managed shell contract should remain managed.

Example:

- Wrong: React, router, state management, Tailwind, and AI harness all patch
  `src/App.tsx`.
- Right: a React app shell logical surface owns `src/App.tsx`, and selected
  capabilities contribute to declared slots such as imports, providers, routes,
  demo blocks, or class name tokens. The shell materializer writes the file once.
- Safer default: generated demo components become generated-user surfaces after
  creation, and update never rewrites them.

## Operation Types

Materialization should be represented as explicit operations. Initial operation
types can be small:

- render a template into a managed file
- edit a structured JSON/YAML/TOML surface
- write a managed block with stable markers
- create a generated-user file
- call provider `init`, `status`, `verify`, or `update`
- run a declared command with known side effects

Later, semantic rewrite or recipe-style operations can be added, but they must
remain explicit operations with declared ownership and verification. They should
not become heuristic file patching.

The apply flow should be:

1. Resolve the next graph and operations.
2. Preflight conflicts before writing.
3. On update, check current managed surfaces against the previous manifest.
4. Block if a core managed surface drifted.
5. Apply operations.
6. Re-read written surfaces and record hashes or structured values.
7. Write the manifest last.

Dry-run should show the same operation plan and the same blockers without
writing files.

## Surface Ownership

Every capability or provider must declare the surfaces it owns. `prelude`
executes that ownership contract instead of guessing domain-specific rules.

Surfaces fall into three categories:

- Core managed surface: owned by `prelude` or a provider. If drift is detected,
  ordinary update must block.
- Extension surface: intentionally available for user or agent extension.
  Update must preserve it.
- Generated-user surface: initially generated, then handed over to the user.
  Update must not touch it.

Core managed drift is a hard stop. Update must not use a soft skill or agent
heuristic to guess a repair and continue. A deterministic update must be
diffable, contract-based, and verifiable.

When update detects core managed drift, it should emit a machine-readable report
that includes:

- drifted surface
- owning capability or provider
- expected versus actual summary
- safe next actions

Repair is a separate flow. Starting a repair agent requires user approval, and
applying file changes requires separate user approval. After repair, update is
run again.

Manifest and provider contract schema evolution are explicit flows. Ordinary
update must block when it detects an unsupported manifest schema version or
provider contract schema version.

Schema evolution must be deterministic, support dry-run review, show
before/after summaries, and only handle known schema versions. Manifest schema
evolution should not modify business files. Provider contract schema evolution
should update the provider
record and ownership metadata; provider-owned target runtime changes remain the
provider's responsibility through its own update and verify contract.

## Non-Goals

`prelude` is not:

- a remote template marketplace
- a plugin marketplace
- an existing-project adoption or append/update tool
- a generic AI platform
- the owner of provider-specific domain semantics
- a system where every harness internal module is freely user-composable

## Current Gap

The current CLI does not yet fully implement free composition. Existing create
mode is still closer to a project-type wizard, while preset mode is hardcoded
as named branches.

The next product direction is to turn normal create mode into a scoped
capability composition flow while keeping preset mode as pre-filled
composition.
