# Manifest Materialization Architecture

This document explains how `prelude` should turn a user request into files while
remaining composable, while leaving only explicit managed contributions
updatable after creation.

The core rule is:

```text
Capabilities do not write shared files directly.
Capabilities contribute to logical surfaces.
One materializer owns each physical write.
The manifest records handed-off provenance and managed-surface reconciliation
base after verification.
```

## Why This Exists

`prelude` should support free composition:

- topology: single package or workspace
- package families: React, Vue, Node, CLI, library, Effect
- engineering capabilities: linting, Knip, dependency update tooling
- AI harness providers such as `effect-harness`
- guided CLI as a `CreateSpec` builder
- direct spec input for agent, CI, scripts, and repeatable generation

That cannot be implemented safely as "every capability emits or patches the
files it cares about." Many capabilities naturally want the same file:

- `package.json`
- root workspace config
- `AGENTS.md`
- app shell source files
- verification scripts
- provider manifests

The architecture must prevent write-order bugs, accidental overwrite, and future
update guessing.

## Core Objects

### CreateSpec

The confirmed project creation specification before pins, provider versions, and
materialization choices are applied.

Examples:

- "single package React app with Jotai, Knip, linting, and AI harness"
- "workspace with one React app and one Effect package"
- a reusable `CreateSpec` file maintained by Sayori

`CreateSpec` is kept in the manifest as creation provenance and provider
context. It is not a promise that `prelude` will reapply the full scaffold under
newer pins after day one.

`CreateSpec` may omit defaults. Defaults are applied by the resolver and recorded
in the resolved graph, not backfilled into the spec.

`CreateSpec` is closed. It does not support include, import, extends, or remote
references. Composition is performed by capabilities and the resolver after the
complete spec has been parsed.

### Resolved Graph

The concrete answer after `prelude` applies defaults, pins, provider versions,
scope rules, and conflict resolution.

The resolved graph is what generation actually follows. It must include:

- topology
- packages
- root capabilities
- package capabilities
- selected providers
- version pins
- materialization plan inputs

The resolved graph is creation truth. Managed providers may use projected parts
as context, but lifecycle update does not compare and reapply the whole project
graph.

### Capability Contribution

A capability contribution is a typed request to add something to a logical
surface, or an opaque artifact emitted through one materializer.

Examples:

- add `react` to package dependencies
- add `knip` script to root `package.json`
- add a Vite dev script to an app package
- add a React provider slot to the app shell
- add a provider-owned managed claim for `effect-harness`

Contributions are not file writes.

Capability granularity is higher than a contribution. A capability is a
user-understandable project ability; a contribution is how that capability
affects logical surfaces.

Every contribution declares lifecycle:

```text
handoff | managed
```

`handoff` means create-only. `managed` means the contribution participates in
post-create reconciliation when its surface has a stable reconcile contract.
Lifecycle belongs to the contribution, not to a whole provider.

### Logical Surface

A logical surface is a merge point with an owner and rules.

Examples:

- `package-manifest:root`
- `package-manifest:packages/web`
- `react-app-shell:packages/web`
- `agents-root-instructions`
- `provider:effect-harness`

Logical surfaces solve the "multiple pointers to the same content" problem. A
capability points to a logical surface and a typed slot, not to arbitrary text in
a file.

Typed surfaces are introduced only at semantic boundaries. A source file can be
generated from a complete template when one capability owns it. A source file can
also be generated from a typed surface during create and then handed off.

### Materializer

A materializer turns one logical surface into physical operations.

Examples:

- package manifest materializer writes `package.json`
- React app shell materializer writes `src/App.tsx`
- managed block materializer updates a marked block in `AGENTS.md`
- provider lifecycle materializer validates provider-declared operations and
  writes provider artifacts under `.prelude/providers/<id>/**`

One materializer owns the final write for a physical file or managed block.

### Operation

An operation is the explicit side effect that the apply step may execute.

Initial operation types:

- `writeSourceFile`
- `writeStructuredField`
- `writeManagedBlock`
- `writeManagedFile`
- `writeGeneratedUserFile`
- `callProviderStatus`
- `callProviderVerify`
- `callProviderPlanUpdate`
- `runCommand`

Operations must declare:

- target path or provider target
- owning capability or provider
- contribution lifecycle claim, when relevant
- create behavior
- lifecycle update behavior, when any
- verification or snapshot rule

There is no `renderTemplate` operation. Handlebars-style `template + params bag`
rendering is not part of the final architecture. Materializers emit complete
files or structured changes from typed surface data.

### Template Boundary

`prelude` does not enforce text-level single source of truth. It enforces
semantic single authority.

Default to complete, local, readable templates or opaque artifacts when:

- one capability owns the output
- there is no independent add, remove, or update behavior
- no other capability expresses an opinion about the resource
- no stable identity is needed

Promote to a typed logical surface when:

- multiple capabilities express opinions
- independent lifecycle is needed
- long-term reconcile is needed
- stable identity is needed
- conflicts must be explainable

Template reuse may use complete file copy, small explicit variables, and local
helpers inside one materializer. It must not use cross-capability template
inheritance, cross-capability textual includes, or global capability-list
conditionals.

### Managed Claim Snapshot

A snapshot is the manifest base used for drift detection when a contribution is
managed.

Snapshot forms:

- whole-file hash for managed files
- block hash for managed blocks
- structured value or hash for JSON/YAML/TOML pointers
- provider-reported digest for provider-owned surfaces

Handoff surfaces are different. Their records are provenance, not reconciliation
base. An initial hash may be recorded for audit, but lifecycle update must not
use it as a drift gate.

### Manifest

The manifest is the root ledger written after successful generation or lifecycle
update.

Expected generated path:

```text
.prelude/manifest.json
```

It should include:

- `schemaVersion`
- `preludeVersion`
- `createSpec`
- `resolvedGraph`
- `pins`
- `lifecycleProviders`
- `managedClaims`
- `managedSurfaces`
- `generatedUserSurfaces`

The manifest is not desired truth and not the source used to write initial
files. It is reconciliation base: the durable record of the claims, ownership,
locators, and observed base after successful apply.

Update uses:

```text
desired = prelude config + prelude lock + current capability/provider implementation
base    = manifest
current = filesystem
```

New desired state must not be reverse-engineered from old manifest claims.

## Create Flow

```text
input
  -> parse CreateSpec
  -> resolve topology and capability graph
  -> resolve pins and providers
  -> collect contributions
  -> merge logical surfaces
  -> preflight conflicts
  -> build operations
  -> apply operations
  -> run verification
  -> snapshot managed claims and handed-off provenance
  -> write .prelude/manifest.json
```

The manifest is written last. A failed create should not claim a generated
project state that was not actually produced and verified.

## Lifecycle Update Flow

```text
read .prelude/manifest.json as base
  -> validate manifest schema
  -> recompute desired managed contributions from config, lock, and current implementations
  -> validate provider contract schemas and migration paths
  -> read current logical values from the filesystem
  -> reconcile base/current/desired for managed claims
  -> block on managed drift
  -> validate operations against provider namespace or declared managed surfaces
  -> dry-run or apply operations
  -> run provider verification
  -> snapshot updated managed claims
  -> write updated manifest
```

Lifecycle update must block when:

- the manifest schema version is unsupported
- a provider contract schema version is unsupported
- no active managed contribution exists
- a managed logical value was manually changed
- an update plan requires changing a handoff surface
- a managed-surface conflict has no deterministic rule
- the provider update plan targets an undeclared external surface
- a contract transition cannot prove identity, ownership topology, and semantic
  continuity

Lifecycle drift blocks. Lifecycle update does not repair, reconcile, or
reinterpret drift.

## Conflict Rules

Conflict detection happens before writes.

For structured surfaces:

- different keys merge
- same key with identical value dedupes
- same key with compatible value may merge only if the surface owner declares a
  rule
- same key with incompatible value blocks

For managed files:

- only one materializer may own a whole file
- other capabilities must contribute through declared slots

For managed blocks:

- each block id has exactly one owner
- adjacent user content is extension surface and must be preserved

For bounded selectors:

- v1 supports managed block markers
- v1 supports structured pointers for structured files such as JSON, YAML, and
  TOML
- v1 does not support line ranges, regex ranges, AST nodes, or semantic source
  regions

For provider surfaces:

- provider owns lifecycle semantics
- `prelude` records provider artifact, contract version, declared surfaces, and
  provider status
- `prelude` owns the write boundary
- providers do not write project files directly
- provider internal artifacts live under `.prelude/providers/<id>/**`
- external project writes are allowed only for managed surfaces declared at
  create

For physical path conflicts:

- two contributions outputting the same path block by default
- shared files must enter one logical surface and one materializer
- exclusive files must have one owner
- identical text does not automatically create shared ownership
- last-writer-wins is forbidden

## Example: package.json

Input composition:

```text
single package
React app
Jotai state management
Knip
linting
AI harness disabled
```

Contributions:

```text
react capability
  -> package-manifest:root dependencies.react
  -> package-manifest:root dependencies.react-dom
  -> package-manifest:root devDependencies.vite
  -> package-manifest:root scripts.dev
  -> package-manifest:root scripts.build

jotai capability
  -> package-manifest:root dependencies.jotai
  -> react-app-shell:root providerSlots.state

knip capability
  -> package-manifest:root devDependencies.knip
  -> package-manifest:root scripts.knip
  -> managed-file:knip.json

linting capability
  -> package-manifest:root devDependencies.eslint
  -> package-manifest:root scripts.lint
```

Only the package manifest materializer writes `package.json`.

If two capabilities request `/scripts/lint` with different values, generation
blocks unless the package manifest surface declares a deterministic composition
rule.

Create ledger record:

```json
{
  "path": "package.json",
  "kind": "structured-field",
  "owner": "package-manifest",
  "lifecycle": "handoff",
  "createContributions": {
    "/dependencies/react": {
      "owner": "capability:react",
      "value": "19.2.7"
    },
    "/dependencies/jotai": {
      "owner": "capability:jotai",
      "value": "2.15.0"
    },
    "/scripts/lint": {
      "owner": "capability:linting",
      "value": "eslint ."
    }
  }
}
```

After create, these ordinary scaffold entries are handed off. If the user edits
`/dependencies/react`, lifecycle update must not care. The same physical
`package.json` may still contain provider-owned managed entries, but only those
managed claims participate in lifecycle update.

Example provider-owned managed entry:

```json
{
  "path": "package.json",
  "kind": "structured-field",
  "owner": "provider:effect-harness",
  "lifecycle": "managed",
  "scope": "entry",
  "conflictPolicy": "block",
  "pointers": {
    "/devDependencies/@effect/platform": {
      "desired": "0.97.0",
      "base": "0.97.0"
    }
  }
}
```

On lifecycle update, drift in the provider-owned pointer blocks update.
Drift in ordinary React, Jotai, Knip, or linting entries is outside the update
surface.

## Example: React App Shell

Wrong model:

```text
React feature writer patches src/App.tsx
Router patches src/App.tsx
State management patches src/App.tsx
CSS framework patches src/App.tsx
AI harness patches src/App.tsx
```

This causes order dependence and unknown ownership.

Better model:

```text
react-app-shell logical surface
  owner: capability:react
  physical file: src/App.tsx

slots:
  imports
  providerWrappers
  routes
  demoBlocks
  classNameTokens
```

Contributions:

```text
router capability
  -> react-app-shell routes
  -> react-app-shell imports

jotai capability
  -> react-app-shell providerWrappers
  -> react-app-shell imports

tailwind capability
  -> react-app-shell classNameTokens
```

The React app shell materializer emits `src/App.tsx` once.

The shell surface may still be handoff. Typed composition is useful during create
for free composition and conflict diagnostics even when the generated file is
not managed afterward.

The safer default is to treat demo source files as generated-user surfaces after
create. Lifecycle update should only keep managing app shell files when there is
an explicit managed claim and stable locator. Without that contract, source
files should not be touched after initial generation.

## Provider Harnesses

`prelude` selects and orchestrates harness providers. Providers own harness
semantics.

For `effect-harness`, the first useful adapter can be narrow:

```text
status(lifecycleProviderRecord)
verify(lifecycleProviderRecord)
planUpdate(lifecycleProviderRecord, options)
```

`prelude` owns:

- selecting the provider
- recording provider artifact and contract version
- checking provider freshness
- invoking provider lifecycle planning, migration, and verification
- validating provider-declared managed contributions and operations
- applying provider-declared writes through `prelude` materializers
- integrating provider status into overall verification

The provider owns:

- Effect source pin
- Effect package baseline
- runtime files
- agent routes
- guardrails
- provider-owned update policy
- provider-owned lifecycle semantics
- provider-owned surface summaries or digests

Do not extract a shared `harness-core` module until at least two provider
adapters prove the common interface. One adapter is not enough evidence for a
shared abstraction.

Provider lifecycle artifacts are centralized under:

```text
.prelude/providers/<provider-id>/**
```

There is no dual path. For `effect-harness`, use:

```text
.prelude/providers/effect-harness/**
```

not `.effect-harness/**`.

Provider update plans may only replace declared managed surfaces:

- owned provider files under `.prelude/providers/<provider-id>/**`
- managed blocks declared at create
- structured pointers declared at create
- explicitly declared owned files

Provider update plans must not use arbitrary patches, git diffs, source rewrites,
direct writes, or direct side-effect commands. If a provider needs a new external
surface, lifecycle update must block for explicit migration or redesign.

Provider migration plans must be declarative. They must name `fromContract`,
`toContract`, identity mapping, ownership transfer, retire/delete/detach
behavior, and preconditions. Core validates and executes the plan; providers do
not mutate old manifests or files directly.
