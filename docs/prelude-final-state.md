# Prelude Final State

This document describes the final architecture `prelude` should converge on.
The point is to state what the system looks like when the design is correct.

## One Sentence

`prelude` is a project genesis system that turns a canonical `CreateSpec` into
an agent-ready, provider-aware workspace through one composition pipeline, then
hands off ordinary scaffold output while keeping selected lifecycle providers
updatable.

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
lifecycle update semantics come from selected providers and their recorded
contracts.

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
default choice, that is a creation policy change or scaffold compatibility task,
not something lifecycle update silently applies to an existing project.

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
- compatible topology
- required inputs
- default inputs
- prelude-owned pins it consumes
- provider dependencies, if any
- logical surface contributions
- conflict rules
- verification requirements

A capability does not write shared files directly.

Capability granularity follows user-understandable project ability, not files,
dependencies, or template fragments. `react-app` is a capability. `add react to
dependencies` is not. Source imports, template partials, and package manifest
entries are contributions behind a capability.

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

Capabilities contribute typed slots to logical surfaces. They do not patch
physical files.

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

One logical surface has one materializer. One physical file or managed block has
one writer.

## Materializers

A materializer owns the physical write for one logical surface.

Examples:

- package manifest materializer writes `package.json`
- workspace manifest materializer writes `pnpm-workspace.yaml`
- managed block materializer writes a marked block in `AGENTS.md`
- generated-user materializer creates user-owned source files
- provider materializer invokes a provider adapter

Materializers produce operations. They also define how surfaces are snapshotted
when those surfaces remain part of an active lifecycle provider.

## Operations

Operations are the only side-effect layer.

Operation kinds:

- `writeStructuredField`
- `writeManagedFile`
- `writeManagedBlock`
- `writeGeneratedUserFile`
- `renderManagedTemplate`
- `callProvider`
- `runCommand`

Every operation declares:

- operation id
- owner
- logical surface
- target path or provider target
- surface authority
- create behavior
- lifecycle update behavior, when any
- snapshot rule
- verification rule

Template rendering, JSON editing, copying files, and running commands are
implementation details behind operations.

## Surface Authority

Every emitted surface declares an authority level. Authority is the primitive
used by lifecycle update for surfaces that remain active after create.

### `owner`

`prelude` or a provider owns the selected surface.

Lifecycle update may change it only when:

- the manifest says the surface has `owner` authority
- the current surface still matches the previous snapshot
- the provider lifecycle plan requires the change

Manual drift blocks lifecycle update.

### `bounded`

`prelude` or a provider owns only a declared boundary inside a larger user-owned
file or structure.

Lifecycle update may change only the declared boundary. It must preserve content
outside the boundary. Drift inside the boundary blocks lifecycle update. Drift
outside the boundary is ignored.

Bounded authority v1 only supports stable selectors:

- managed block marker
- structured pointer for structured files such as JSON, YAML, or TOML

It does not support line ranges, regex ranges, AST nodes, or semantic source
regions.

### `none`

Generated once, then handed to the project owner.

Lifecycle update does not modify it. User source files default to `none`
authority unless an explicit lifecycle provider contract owns a stable boundary.

`none` authority surfaces are handed-off surfaces. Their manifest records are
provenance, not lifecycle snapshots. They may record path, creator, and initial
hash for audit, but lifecycle update must not use that hash as a drift gate.

## Manifest

Every `prelude`-generated project may have one root manifest:

```text
.prelude/manifest.json
```

The manifest is the ledger for creation provenance and lifecycle provider state.
It is not a template input, and it is not a claim that `prelude` owns the whole
project after day one. It is written after successful apply and verification.

Manifest contents:

- schema version
- `prelude` version
- create spec
- resolved graph
- prelude-owned pins
- provider records
- lifecycle surfaces
- handed-off scaffold surfaces
- generated-user surfaces
- verification records

Lifecycle surface records include:

- surface id
- owner
- authority
- path
- structured pointer or block id, when relevant
- snapshot value or hash
- operation id that last wrote it
- provider report id, when provider-owned

`none` authority surface records include provenance such as path, creator, and
initial hash. They do not grant lifecycle update authority.

The manifest is written last. A failed apply or failed verification must not
record a successful generated state.

## Lifecycle Update

Lifecycle update is deterministic, manifest-driven, and provider-scoped.

```text
read manifest
  -> validate manifest schema
  -> select active lifecycle providers
  -> validate provider contract schemas
  -> ask providers for status/update plans
  -> verify provider-owned lifecycle surfaces against snapshots or provider reports
  -> build provider lifecycle operations only
  -> dry-run or apply
  -> provider verify
  -> write manifest
```

Lifecycle update blocks when:

- no manifest exists
- no active lifecycle provider exists
- manifest schema is unsupported
- provider contract schema is unsupported
- provider-owned or provider-bounded lifecycle surface drifted
- handed-off scaffold surface would need to change
- provider update plan has no deterministic resolution
- provider major version drift requires redesign

Lifecycle drift blocks. Lifecycle update does not repair, reconcile, or
reinterpret drift.

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

Provider owns:

- domain package baselines
- domain runtime files
- domain agent routes
- domain guardrails
- provider-owned lifecycle surfaces
- provider update policy
- provider verification
- provider surface reports

Provider adapter shape:

```text
init(target, resolvedGraph)
status(target)
verify(target)
update(target, fromProviderVersion, toProviderVersion)
surfaceReport(target)
```

`effect-harness` is one provider adapter. A shared harness core only exists when
multiple real providers prove the same interface.

A selected capability or provider is required. If a selected provider is missing,
unavailable, or contract-incompatible, create and lifecycle update must block.
`prelude` must not silently degrade by generating the project without the
selected provider-owned behavior.

## Version Ownership

Version ownership follows content ownership.

`prelude` owns pins for content it emits:

- React scaffold dependencies
- Vue scaffold dependencies
- Node scaffold dependencies
- linting dependencies
- Knip/Taze tooling
- package manager baseline
- template-owned defaults

Those pins are creation inputs and repository maintenance inputs. They do not
make existing generated projects part of a general `prelude` update surface.

Providers own pins for content they emit:

- Effect package baseline inside `effect-harness`
- provider runtime files
- provider verifier dependencies
- provider internal source pins

Major version drift blocks lifecycle update when it affects an active provider.

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
  -> record provider surface report

generated-user source surfaces
  -> packages/web/src/*
  -> packages/worker/src/*
```

Update behavior:

- ordinary scaffold files and package manifest entries are handed off after
  create unless an active lifecycle provider owns a declared boundary.
- provider-owned surfaces update only through provider contract.
- user source files are not rewritten.
- manual edits to provider-owned lifecycle surfaces block.

## Invariants

- One canonical creation input: `CreateSpec`.
- One resolver for guided CLI output and direct spec input.
- One manifest per generated project that needs lifecycle state.
- One owner for each lifecycle surface.
- One materializer for each physical write.
- No capability directly patches shared files.
- No lifecycle update without manifest and active lifecycle provider.
- No lifecycle update across unsupported schema versions.
- No lifecycle update across provider major drift.
- No provider internals inside `prelude`.
- No generated-user source rewrite during lifecycle update.
