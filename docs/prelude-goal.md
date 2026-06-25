# Prelude Goal

This document records the current product direction for `prelude`.
It lives under `docs/`, which is the active knowledge source for the rebuild.

## Core Goal

`prelude` is a Sayori-first project genesis system.

When starting a new project, it should generate an agent-ready project
workspace that already contains the preferred technology stack, engineering
baseline, AI/agent harness setup, and verification surface.

The output is not just a file skeleton. It is a workspace that an agent can
understand, modify, and verify from day one.

The name `prelude` is literal: this system prepares the opening state before the
real project work begins. Most generated output is handed to the project owner
after creation. `prelude` should not become a long-term manager for the whole
project.

The exception is lifecycle infrastructure whose value continues during project
use. Today that means the AI harness/provider layer. A dead harness is not
useful, so `prelude` must provide a narrow managed-surface reconciliation
framework without turning ordinary scaffold output into long-term project
state.

The lifecycle boundary is contribution-level, not provider-level. Harness
provider runtime assets and integration surfaces normally produce managed
contributions. Provider demos, examples, and ordinary scaffold output may still
produce handoff contributions.

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

`prelude` has one canonical creation input: `CreateSpec`.

There are two supported ways to produce a `CreateSpec`:

- Guided CLI: for unclear direction. The CLI asks questions and helps the user
  decide topology, capabilities, providers, and package scopes, then emits a
  canonical `CreateSpec`.
- Direct spec: for clear direction. The user, an agent, CI, or a script provides
  a canonical, complete, diffable `CreateSpec` directly.

There is no preset product concept in the final architecture. Reusable project
shapes are ordinary `CreateSpec` files that Sayori may design, keep, copy, edit,
or ask an agent to generate.

`CreateSpec` is declarative. It may omit defaults. The resolver produces the
complete `ResolvedGraph` by applying current capability defaults, pins, and
provider contracts.

Defaults may prefill `CreateSpec`, but the resolver must not invent unrecorded
capabilities. For example, guided CLI may default to `ai-harness`, but that
selection must be present in the resulting `CreateSpec`.

`CreateSpec` is closed. It does not support include, import, extends, or remote
references. Reusable project shapes are complete specs, not spec fragments.
Composition belongs to capabilities and the resolver, not to spec files.

All creation flows must share the same composition and resolution path:

```text
CreateSpec -> resolve -> ResolvedGraph
```

No CLI branch, reusable spec file, or input adapter may bypass the resolver or
own a separate generation implementation.

The durable boundary is:

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

Capabilities represent user-understandable project abilities. They are not raw
dependencies, files, source fragments, or individual JSON pointers.

The boundary between a capability and an option is ownership. Choices such as
state management, routing, or CSS framework become capabilities when they own
dependencies, logical surface contributions, lifecycle surfaces, verification, or
conflict rules. Otherwise they remain options of the owning capability.

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

Providers are not capabilities. Capabilities are selectable project abilities;
providers are selected implementations for provider-owned domains.

`ai-harness` is a root orchestration capability with target package scopes. It
may target specific packages, but root-level provider records, agent
instructions, and verification aggregation belong to the root capability.

`prelude` may select and orchestrate a harness provider, but it should not copy
or reimplement provider-specific domain rules. A provider owns its own:

- domain baseline
- runtime files
- lifecycle target surfaces
- agent routes
- guardrails
- status command
- verify command
- update policy

A selected provider is required. If it is missing, unavailable, or
contract-incompatible, create and lifecycle update must block instead of silently
generating a project without the selected provider-owned behavior.

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
dependencies, scaffold defaults, and its own tooling baseline. That ownership is
primarily for reproducible creation and for maintaining the `prelude`
repository's generated examples. It is not a promise that generated projects
will keep receiving framework, linter, or scaffold updates after day one.

## Self-Iteration

The first self-iteration loop is version-based only.

The loop should:

1. Detect dependency or provider artifact drift.
2. Update the relevant pin.
3. Regenerate scaffold outputs or smoke examples.
4. Run verification and generated smoke checks.
5. Let an agent fix breakages caused by the version update.
6. Update docs only when observable behavior or contracts change.

Generated smoke output should be inspectable. Smoke writes under the repo-local
gitignored `apps/examples/.generated/` directory, prints the generated target
paths, and keeps the targets after assertions complete. Smoke should include at
least one provider/harness target and one renderable app target, and it should
install and build those generated targets. Once a stable commit has passed
smoke, do not rerun smoke again unless the working tree, generated contract, or
harness/package baseline changes.

The first loop should not automatically add new frameworks, invent new reusable
specs, change product defaults, or perform broad architecture refactors.

Incompatible contract drift is not part of the ordinary version-update loop.

- Provider artifact drift that cannot prove identity, ownership topology, and
  semantic continuity is a provider integration redesign trigger.
- Generated scaffold dependency major drift is a scaffold redesign task.
- `prelude` self-tooling major drift is a repository maintenance task.

Lifecycle provider update may handle provider artifact drift only when the
transition has an explicit continuity proof or migration plan. Semver is a hint,
not the rule. A minor release that changes locators, stable keys, ownership
scope, or semantics incompatibly must block.

Default-policy drift is not a generated-project update. If a new `prelude`
default would change project shape for the same `CreateSpec`, that is a create
policy change or scaffold redesign task, not something `prelude update`
silently applies to existing projects.

## Lifecycle Update

`prelude` should be designed for upgrade from the first day, but the upgrade
surface is intentionally narrow.

`prelude update` is not a general project updater. It exists for active managed
contributions selected during creation. Today those managed contributions are
primarily produced by AI harness providers.

Every `prelude`-generated project has one root manifest. The manifest is not
desired truth. It is reconciliation base: the record of the claims, ownership,
and observed base after the previous successful apply.

The update model is:

```text
desired = prelude config + prelude lock + current capability/provider implementation
base    = manifest
current = filesystem
```

The system must not derive new desired state from the manifest, and it must not
treat old manifest claims as proof that a current provider still wants the same
claims.

The manifest should record:

- schema version
- create spec
- resolved capability graph
- topology
- packages
- root-level capabilities
- package-level capabilities
- provider artifacts and contract versions
- pins owned by `prelude`
- lifecycle providers
- managed claims, owners, locators, and observed base
- handed-off scaffold provenance

The `CreateSpec` records the confirmed project creation specification. The
resolved capability graph records the concrete state that was generated after
defaults, pins, provider artifact versions, and conflict resolution were
applied.

Lifecycle update should not blindly regenerate from files on disk. It should:

1. Read the root manifest as base.
2. Recompute desired managed contributions from config, lock, and current
   capability/provider implementations.
3. Validate manifest schemas, provider contracts, and migration paths.
4. Read current filesystem values for managed locators.
5. Reconcile logical values.
6. Validate operations against provider namespace or declared managed surfaces.
7. Write back provider records, managed claims, observed base, and verification.

Projects without a `prelude` manifest are not lifecycle update targets. Projects
with a manifest but no active managed contribution should report "nothing to
update" rather than pretending `prelude` still owns the whole scaffold.

Adding a capability and migrating topology are explicit operations. They should
not be hidden inside lifecycle update.

Post-create commands are managed-surface commands. In v1 their active managed
surfaces are normally attached to lifecycle providers:

- `prelude status` inspects active managed providers without writing.
- `prelude verify` runs active managed provider checks.
- `prelude update` updates all active managed providers by default.
- `prelude update --provider <id>` updates only one provider.

Create acceptance verification is part of create and may be wider. Post-create
verification is lifecycle-provider verification only.

## Manifest And Materialization

The manifest is not the input used to write files and not desired truth. It is
the durable reconciliation base that records what `prelude` resolved, what it
wrote, which outputs were handed off, and which managed claims were observed
after verification.

The core architecture should be:

```text
CreateSpec
  -> resolve capabilities, scopes, providers, and pins
  -> resolved graph
  -> collect capability/provider contributions
  -> merge logical surfaces
  -> materialize file operations
  -> write files
  -> verify and record lifecycle snapshots/provenance
  -> write manifest last
```

There is no template-rendering layer in the final architecture. Composition
happens in typed capability contributions and logical surfaces. Physical files
are emitted by owner materializers through structured writers or dedicated source
emitters.

`prelude` pursues semantic single authority, not text-level DRY. Text output may
be duplicated when that keeps templates local, complete, and readable. Semantic
truths must not be duplicated: capability contracts, surface schemas, merge
rules, pins, managed claims, and reconciliation state each have one authority.

The root manifest should eventually live at `.prelude/manifest.json` in every
generated project and include:

- `schemaVersion`
- `preludeVersion`
- `createSpec`
- `resolvedGraph`
- `pins`
- `lifecycleProviders`
- `lifecycleSurfaces`
- `generatedUserSurfaces`

`createSpec` records the confirmed project creation specification.
`resolvedGraph` records the concrete answer after defaults, pins, provider
versions, scopes, and conflict resolution. It is creation provenance and provider
context, not a mandate to reapply the full scaffold forever.

If defaults changed after creation, that is default-policy drift. It belongs to
new creation behavior or explicit scaffold redesign, not lifecycle update.

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
safe to update after creation. Most generated source files are generated-user surfaces:
created on day one, then handed to the project owner. Only source files with an
explicit lifecycle shell contract should remain update-managed.

Example:

- Wrong: React, router, state management, Tailwind, and AI harness all patch
  `src/App.tsx`.
- Right: a React app shell logical surface owns `src/App.tsx`, and selected
  capabilities contribute to declared slots such as imports, providers, routes,
  demo blocks, or class name tokens. The shell materializer writes the file once.
- Safer default: generated demo components become generated-user surfaces after
  creation, and update never rewrites them.

Structured composition and lifecycle management are separate choices. A React app
shell may use a typed surface during create so React, router, state management,
and styling can compose safely, then still be handed off after create. A provider
runtime file may be copied from a complete template and remain managed because
the provider owns the file or namespace.

The promotion rule is:

- a single capability owns the artifact, no independent add/remove/update is
  needed, and no other capability expresses an opinion: use a complete template
  or opaque artifact.
- multiple capabilities express opinions, independent lifecycle is needed,
  stable identity is required, or conflicts must be explained: promote to a
  typed logical surface.

Templates must not form inheritance trees. Allowed template mechanisms are
complete file copy, small explicit variable substitution, and local helpers
inside one materializer. Cross-capability textual includes, template inheritance,
and global capability-list conditionals are not part of the final model.

## Operation Types

Materialization should be represented as explicit operations. Initial operation
types can be small:

- write an owner-produced source or managed file
- edit a structured JSON/YAML/TOML surface
- write a managed block with stable markers
- create a generated-user file
- call provider `status`, `verify`, or `planUpdate`
- run a declared command with known side effects

Later, semantic rewrite or recipe-style operations can be added, but they must
remain explicit operations with declared ownership and verification. They should
not become heuristic file patching.

The create apply flow should be:

1. Resolve the next graph and operations.
2. Preflight conflicts before writing.
3. Apply operations.
4. Re-read written managed surfaces and handed-off provenance.
5. Write the manifest last.

The lifecycle update flow should be managed-surface scoped:

1. Read the manifest as base.
2. Recompute desired managed contributions from config, lock, and current
   capability/provider implementations.
3. Validate provider contracts, migration paths, and current managed locators.
4. Block if a managed logical value drifted.
5. Ask providers for lifecycle update plans when provider-owned claims are
   involved.
6. Validate operations against provider namespace or declared managed surfaces.
7. Apply operations through `prelude`.
8. Record updated provider state, managed claims, and observed base.

Dry-run should show the same operation plan and the same blockers without
writing files.

## Contribution Lifecycle And Managed Surfaces

Every capability or provider contribution declares its lifecycle. Lifecycle does
not belong to an entire provider.

```text
contribution.lifecycle = handoff | managed
```

Handoff contributions are created once and then become user-owned project
content. Their manifest records are provenance, not update authority.

Managed contributions enter reconciliation only when two conditions hold:

```text
the logical surface has a stable reconcile contract
AND
the contribution explicitly declares lifecycle: managed
```

Managed claims also declare:

- scope: `field`, `entry`, `block`, `file`, or `namespace`
- locator: JSON pointer, managed block id, file path, namespace path, or other
  stable surface-specific key
- owner or owners
- conflict policy, which defaults to `block`
- contract version and implementation version

The strict managed reconcile rule is:

```text
current == desired
  -> already applied, success
current == base
  -> user did not edit the managed value, apply desired
otherwise
  -> drift, block
```

`desired == base` with `current != base` still blocks. User changes inside a
managed locator are not silently accepted as the new base.

Managed drift is a hard stop. Lifecycle update must not repair, reinterpret, or
continue past drift. A deterministic update must be diffable, contract-based,
and verifiable.

When lifecycle update detects lifecycle drift, it should emit a machine-readable
report that
includes:

- drifted surface
- owning capability or provider
- expected versus actual summary
- safe next actions

Safe next actions are limited to restoring the managed value manually or
explicitly changing the lifecycle claim through an approved flow. Neither action
is part of lifecycle update.

Manifest and provider contract schema evolution are explicit flows. Lifecycle
update must block when it detects an unsupported manifest schema version,
provider contract schema version, or contract transition whose identity,
ownership topology, and semantics cannot be explicitly proven continuous.

Schema and contract evolution must be deterministic, support dry-run review,
show before/after summaries, and only handle known versions. Provider migration
must be a declarative plan that names `fromContract`, `toContract`, old/new
surface identity mapping, ownership transfer, retire/delete/detach behavior, and
preconditions. Providers do not run migrations directly; `prelude` validates the
plan, reads current state, checks drift, generates the write plan, applies it,
re-reads outputs, and writes the new manifest.

Provider lifecycle state must be centralized under:

```text
.prelude/providers/<provider-id>/**
```

There is no dual provider path in v1. `effect-harness` should be adapted to the
`prelude` provider layout instead of writing `.effect-harness/**`.

After create, `prelude` writes by default only under `.prelude/**`. External
project areas may be updated only when a managed surface was declared during
create and recorded in the manifest. Adding or expanding external managed
surfaces is not part of v1 lifecycle update and must block for explicit user
approval.

Providers declare managed contributions, lifecycle operations, or migration
plans; `prelude` owns physical writes. Provider contracts must not use arbitrary
patches, git diffs, source rewrites, or direct project file writes.

## Non-Goals

`prelude` is not:

- a remote scaffold marketplace
- a plugin marketplace
- an existing-project adoption or append/update tool
- a general generated-project updater
- a framework, linter, or dependency maintenance service for generated projects
- a generic AI platform
- the owner of provider-specific domain semantics
- a system where every harness internal module is freely user-composable

## Rebuild Boundary

The final model is the only target. Old generator structures that encode
separate preset branches, `ProjectConfig` creation truth, Plan/PlanSpec creation
truth, or Handlebars rendering are deletion targets, not compatibility targets.

Normal create mode becomes a guided `CreateSpec` builder. Direct spec input is
the automation path. Both enter the same resolver and materializer pipeline.
