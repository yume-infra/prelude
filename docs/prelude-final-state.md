# Prelude Final State

This document describes the final architecture `prelude` should converge on.
The point is to state what the system looks like when the design is correct.

## One Sentence

`prelude` is a project genesis system that turns a canonical `CreateSpec` into
an agent-ready, provider-aware workspace through one composition pipeline, then
hands off ordinary scaffold output while keeping explicitly managed
contributions updatable.

## Final Product Shape

`prelude` has one internal creation input: `CreateSpec`.

There are two supported ways to produce a `CreateSpec`:

- Guided CLI: asks questions when direction is unclear, then emits a canonical
  `CreateSpec`.
- Direct spec: accepts a canonical, complete, diffable `CreateSpec` from the
  user, an agent, CI, or a script.

Reusable project shapes are ordinary `CreateSpec` files. There is no preset
product concept in the final architecture.

Every creation path enters the same resolver:

```text
CreateSpec
  -> resolved graph
  -> capability contributions
  -> logical surfaces
  -> materializers
  -> operation plan
  -> apply
  -> verify
  -> manifest
```

No prompt branch, reusable spec file, or input adapter may bypass this path.

Input source is provenance only. A generated manifest may record whether the
`CreateSpec` came from guided CLI, direct file input, an agent, or CI, but
lifecycle update semantics come from managed contributions and their recorded
claims.

## Core Runtime Model

### CreateSpec

`CreateSpec` records the confirmed project creation specification before pins,
provider versions, and materialization choices are applied.

It contains:

- topology choice
- package list
- root capability choices
- package capability choices
- provider choices
- explicit user overrides

`CreateSpec` is declarative input. It may omit defaults. The resolver applies
current capability defaults, pins, and provider contracts to produce a complete
`ResolvedGraph`.

Defaults may prefill `CreateSpec`, but the resolver must not invent unrecorded
capabilities. If guided CLI defaults to `ai-harness`, that selection must be
written into the emitted `CreateSpec`.

`CreateSpec` is closed. It does not support include, import, extends, or remote
references. Reuse happens by copying, editing, or agent-generating a complete
spec. Composition belongs to capabilities and the resolver, not to spec files.

`CreateSpec` is durable creation provenance. Lifecycle providers may use it as
context, but it is not a promise that `prelude` will reapply the full scaffold to
the project forever.

### Resolved Graph

Resolved graph is the concrete generation answer.

It contains:

- topology
- root package
- workspace packages
- capability graph
- package scopes
- provider selections
- prelude-owned pins
- provider artifact and contract versions
- logical surfaces
- selected materializers
- verification surface

The resolved graph is deterministic for a fixed `prelude` version, pin set, and
provider artifact set.

Default policy changes are not generated-project updates. If the same
`CreateSpec` resolves to a different `ResolvedGraph` because `prelude` changed a
default choice, that is a creation policy change or scaffold redesign task, not
something lifecycle update silently applies to an existing project.

### Capability

A capability is a scoped unit of project behavior.

Examples:

- React app capability
- Vue app capability
- Node runtime capability
- CLI capability
- library capability
- linting capability
- Knip capability
- dependency update capability
- AI harness capability

A capability declares:

- id
- root or package scope
- supported topology
- required inputs
- default inputs
- prelude-owned pins it consumes
- provider dependencies, if any
- logical surface contributions
- contribution lifecycle choices
- conflict rules
- verification requirements

A capability does not write shared files directly.

Capability granularity follows user-understandable project ability, not files,
dependencies, or source fragments. `react-app` is a capability. `add react to
dependencies` is not. Source imports, source slots, and package manifest entries
are contributions behind a capability.

The boundary between a capability and an option is ownership. If a choice has
its own dependencies, logical surface contributions, lifecycle surfaces,
verification requirements, conflict rules, or update policy, model it as a
capability. If it only tunes behavior inside one owner without separate
ownership, model it as that capability's option.

### Topology

Topology is resolved before framework selection.

Supported topology shapes:

- single package
- workspace

Root-level capabilities manage root surfaces. Package-level capabilities manage
package-local surfaces.

Workspace root surfaces and package runtime surfaces are separate scopes. Root
Knip, root `AGENTS.md`, provider manifests, workspace scripts, and workspace
verification are not mixed with React, Vue, Node, CLI, or library package
surfaces.

## Logical Surfaces

A logical surface is a named merge point with an owner and write rules.

Examples:

- `package-manifest:root`
- `package-manifest:packages/web`
- `workspace-manifest:root`
- `agents-root-instructions`
- `react-app-shell:packages/web`
- `provider:effect-harness`

Capabilities contribute typed slots to logical surfaces when a semantic boundary
exists. They do not patch physical files.

Examples:

```text
react capability
  -> package-manifest:packages/web dependencies.react
  -> package-manifest:packages/web scripts.dev

jotai capability
  -> package-manifest:packages/web dependencies.jotai
  -> react-app-shell:packages/web providerWrappers.state

knip capability
  -> package-manifest:root devDependencies.knip
  -> package-manifest:root scripts.knip
  -> managed-file:root knip.json
```

One logical surface has one merge policy and one materializer. One physical file
or managed block has one writer.

Typed surfaces and long-term management are orthogonal. A typed surface may be
used only during create and then handed off. A complete provider template may be
copied as an opaque artifact and still be managed when it is under an owned
provider namespace.

Promote an output to a typed logical surface only when at least one of these is
true:

- multiple capabilities express opinions about the same semantic resource
- the resource needs independent add, remove, or update behavior
- the resource needs stable identity for reconciliation
- conflicts must be detected and explained before writing

Otherwise prefer a complete, local, readable template or opaque artifact.

## Materializers

A materializer owns the physical write for one logical surface.

Examples:

- package manifest materializer writes `package.json`
- workspace manifest materializer writes `pnpm-workspace.yaml`
- managed block materializer writes a marked block in `AGENTS.md`
- generated-user materializer creates user-owned source files
- provider materializer invokes a provider adapter

Materializers produce operations. They also define how surfaces are snapshotted
when contributions on those surfaces declare managed lifecycle.

## Operations

Operations are the only side-effect layer.

Operation kinds:

- `writeStructuredField`
- `writeManagedFile`
- `writeManagedBlock`
- `writeGeneratedUserFile`
- `writeSourceFile`
- `callProviderStatus`
- `callProviderVerify`
- `callProviderPlanUpdate`
- `runCommand`

Every operation declares:

- operation id
- owner
- logical surface
- target path or provider target
- contribution lifecycle claim, when relevant
- create behavior
- lifecycle update behavior, when any
- snapshot rule
- verification rule

Structured serialization, source emission, copying files, and running commands
are implementation details behind operations. There is no Handlebars operation
and no global template-rendering layer.

## Template Boundary

`prelude` does not pursue text-level DRY. It pursues semantic single authority.

Semantic authority belongs to:

- user intent in `prelude.config.*` or the accepted `CreateSpec`
- pins and bundle versions in `prelude.lock`
- capability and provider contracts
- logical surface schemas and merge rules
- managed claims and observed base in the manifest
- current observed bytes and structured values on disk

Text output may be duplicated when that makes templates easier for humans and
agents to read. Template reuse is local to one materializer.

Allowed template mechanisms:

- complete file copy
- small explicit variable substitution
- local helper functions inside one materializer

Forbidden template mechanisms:

- cross-capability template inheritance
- cross-capability textual includes
- global capability-list conditionals inside templates
- last-writer-wins file output

If two contributions target the same physical path, generation blocks unless
they enter the same logical surface and materializer.

## Contribution Lifecycle

Every contribution declares lifecycle:

```text
handoff | managed
```

Lifecycle belongs to a contribution, not to an entire provider.

`handoff` means the contribution is applied during create and then handed to the
project owner. Manifest records are provenance only.

`managed` means the contribution participates in post-create reconciliation, but
only if its logical surface has a stable reconcile contract.

Managed claims declare:

- owner or owners
- lifecycle
- scope: `field`, `entry`, `block`, `file`, or `namespace`
- locator
- conflict policy, defaulting to `block`
- contract version and implementation version

The managed reconcile rule compares logical values, not whole files unless the
claim scope is `file`:

```text
current == desired
  -> already applied, success
current == base
  -> safe to apply desired
otherwise
  -> drift, block
```

`desired == base` with `current != base` blocks. User edits inside a managed
locator are not accepted silently as the new base.

Stable locator forms for v1:

- managed block marker
- structured pointer for JSON, YAML, and TOML
- whole file
- provider namespace

V1 does not support line ranges, regex ranges, AST nodes, semantic source
regions, or arbitrary codemods as managed locators.

Provider runtime files under `.prelude/providers/<id>/**` are normally managed
namespace or file claims. Provider demos and examples are ordinary handoff
contributions unless they explicitly declare managed lifecycle.

## Manifest

Every `prelude`-generated project has one root manifest:

```text
.prelude/manifest.json
```

The manifest is the ledger for creation provenance and lifecycle provider state.
It is reconciliation base, not desired truth. It is not a generator input, and
it is not a claim that `prelude` owns the whole project after day one. It is
written after successful apply and verification for every generated project.

Update state is derived as:

```text
desired = prelude config + prelude lock + current capability/provider implementation
base    = manifest
current = filesystem
```

The manifest must not be used to derive new desired state.

Manifest contents:

- schema version
- `prelude` version
- create spec
- resolved graph
- prelude-owned pins
- provider records
- managed claims and surfaces
- handed-off scaffold surfaces
- generated-user surfaces
- verification records

Managed surface records include:

- surface id
- owner or owners
- lifecycle
- scope
- locator
- base value or hash
- contract version
- implementation version
- snapshot value or hash
- operation id that last wrote it
- provider report id, when provider-owned

Handoff surface records include provenance such as path, creator, template
bundle version, and initial hash. They do not grant lifecycle update authority.

The manifest is written last. A failed apply or failed verification must not
record a successful generated state.

## Lifecycle Update

Lifecycle update is deterministic and managed-surface scoped. In v1, most active
managed surfaces are produced by lifecycle providers.

```text
read manifest as base
  -> validate manifest schema
  -> recompute desired managed contributions from config, lock, and current implementations
  -> validate provider contract schemas and migration paths
  -> read current logical values from the filesystem
  -> reconcile base/current/desired for managed claims
  -> validate operations against provider namespace or declared managed surfaces
  -> dry-run or apply
  -> provider or surface verification
  -> write manifest
```

Lifecycle update blocks when:

- no manifest exists
- no active managed contribution exists
- manifest schema is unsupported
- provider contract schema is unsupported
- a managed surface drifted
- handed-off scaffold surface would need to change
- update plan has no deterministic resolution
- update plan targets an undeclared external surface
- contract transition cannot prove identity, ownership topology, and semantic
  continuity

Lifecycle drift blocks. Lifecycle update does not repair, reconcile, or
reinterpret drift.

Default `prelude update` updates all active managed providers. With
`--provider <id>`, it selects managed contributions from that provider only.

`prelude status` is read-only provider lifecycle inspection. `prelude verify`
executes provider lifecycle checks. Create acceptance verification stays inside
the create flow and is separate from post-create lifecycle verification.

## Providers

Providers own domain semantics that should not live in `prelude`.

Providers are not capabilities. Capabilities are selectable project abilities.
Providers are selected implementations for provider-owned domains.

`ai-harness` is a root orchestration capability with target package scopes. It
owns root-level orchestration surfaces such as agent instructions, provider
records, and verification aggregation, while the selected provider owns
provider-specific target package surfaces.

`prelude` owns:

- provider selection
- provider artifact pin
- provider contract version
- provider invocation
- provider status integration
- provider record in the manifest
- provider write boundary

Provider owns:

- domain package baselines
- domain runtime files
- domain agent routes
- domain guardrails
- provider-owned managed surfaces
- provider update policy
- provider verification
- provider lifecycle records

Provider adapter shape:

```text
status(lifecycleProviderRecord)
verify(lifecycleProviderRecord)
planUpdate(lifecycleProviderRecord, options)
```

`effect-harness` is one provider adapter. A shared harness core only exists when
multiple real providers prove the same interface.

Providers do not receive the full manifest or the full resolved graph as
post-create input. They receive only their lifecycle provider record and
explicitly projected context. Providers do not write project files directly and
do not run side-effect commands directly. They declare managed contributions,
lifecycle operations, or migration plans; `prelude` validates and applies them.

A selected capability or provider is required. If a selected provider is missing,
unavailable, or contract-unsupported, create and lifecycle update must block.
`prelude` must not silently degrade by generating the project without the
selected provider-owned behavior.

Provider lifecycle state is centralized under:

```text
.prelude/providers/<provider-id>/**
```

For `effect-harness`, the required provider namespace is:

```text
.prelude/providers/effect-harness/**
```

There is no dual path such as `.effect-harness/**` in v1.

## Version Ownership

Version ownership follows content ownership.

`prelude` owns pins for content it emits:

- React scaffold dependencies
- Vue scaffold dependencies
- Node scaffold dependencies
- linting dependencies
- Knip/Taze tooling
- package manager baseline
- scaffold defaults

Those pins are creation inputs and repository maintenance inputs. They do not
make existing generated projects part of a general `prelude` update surface.

Providers own pins for content they emit:

- Effect package baseline inside `effect-harness`
- provider runtime files
- provider verifier dependencies
- provider internal source pins

Contract drift blocks lifecycle update whenever identity, ownership topology, or
semantic continuity cannot be explicitly proven. Semver major drift is only one
possible signal.

## Final CLI Shape

The CLI presents topology first:

```text
What are you creating?
  single package
  workspace
```

Then it asks for scoped capabilities:

```text
Root capabilities:
  linting
  knip
  dependency update tooling
  AI harness provider

Package capabilities:
  React app
  Vue app
  Node runtime
  CLI
  library
  Effect package
```

The guided CLI emits the same canonical `CreateSpec` accepted by direct spec
input. Direct spec input must round-trip behavior that the resolver can
generate.

## Example Final Project

CreateSpec:

```text
workspace
root: linting, knip, dependency update tooling, ai harness
packages:
  web: React app, Jotai
  worker: Effect package with effect-harness provider
```

Resolved graph:

```text
topology: workspace
root capabilities:
  linting
  knip
  dependency-update
  ai-harness(effect-harness)
packages:
  packages/web:
    react-app
    state:jotai
  packages/worker:
    effect-package
providers:
  effect-harness
```

Materialization:

```text
package-manifest:root
  -> root package.json

package-manifest:packages/web
  -> packages/web/package.json

package-manifest:packages/worker
  -> packages/worker/package.json

agents-root-instructions
  -> AGENTS.md managed block

provider:effect-harness
  -> call effect-harness adapter
  -> record provider lifecycle state
  -> write provider artifacts under .prelude/providers/effect-harness/**

generated-user source surfaces
  -> packages/web/src/*
  -> packages/worker/src/*
```

Update behavior:

- ordinary scaffold files and package manifest entries are handed off after
  create unless a contribution declares managed lifecycle on a stable surface.
- provider-owned managed surfaces update only through provider-declared plans
  applied by `prelude`.
- provider internal artifacts stay under `.prelude/providers/<id>/**`.
- user source files are not rewritten.
- manual edits to managed surfaces block.

## Invariants

- One canonical creation input: `CreateSpec`.
- One resolver for guided CLI output and direct spec input.
- One manifest per generated project.
- Manifest is reconciliation base, not desired truth.
- One lifecycle declaration per contribution.
- One merge policy for each logical surface.
- One materializer for each physical write.
- No capability directly patches shared files.
- No lifecycle update without manifest and active managed contributions.
- No lifecycle update across unsupported schema versions.
- No lifecycle update across contract drift that cannot prove continuity.
- No provider internals inside `prelude`.
- No provider direct project writes.
- No post-create external writes except declared managed surfaces.
- No arbitrary patch or git diff lifecycle contract.
- No template inheritance or cross-capability textual includes.
- No last-writer-wins file output.
- No generated-user source rewrite during lifecycle update.
