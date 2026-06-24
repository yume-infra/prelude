# Provider Lifecycle Architecture

This document records the lifecycle-provider decisions for `prelude`.

## First Principle

`prelude` is a project genesis system. Create is the broad-write phase. After
create, `prelude` must not become a general project manager.

Post-create lifecycle work exists only for infrastructure that remains valuable
during project use. Today that means the AI harness/provider layer.

The core rule is:

```text
provider owns semantics
prelude owns write boundary
```

Provider lifecycle update must never become whole-project update.

## Post-Create Commands

Post-create commands operate on active lifecycle providers recorded in
`.prelude/manifest.json`.

```text
prelude status
  -> inspect all active lifecycle providers

prelude status --provider effect-harness
  -> inspect one active lifecycle provider

prelude verify
  -> verify all active lifecycle providers

prelude verify --provider effect-harness
  -> verify one active lifecycle provider

prelude update
  -> update all active lifecycle providers

prelude update --provider effect-harness
  -> update one active lifecycle provider
```

`status` is read-only. It reads manifest and provider records, reports provider
state, and does not run verification or write files.

`verify` executes provider lifecycle checks. It does not re-accept the whole
scaffold and does not check ordinary scaffold drift.

`update` executes provider lifecycle changes. It does not re-run create, diff
the resolved graph, update framework dependencies, migrate topology, or patch
handed-off source.

Create acceptance verification is separate. It is part of the create flow and
may be wider because it answers whether the newly generated project is usable.

## Manifest Role

Every `prelude`-generated project has:

```text
.prelude/manifest.json
```

The manifest is creation ledger plus lifecycle state. It is not a general
managed-project contract and does not grant post-create update authority over
ordinary scaffold output.

`CreateSpec` records the confirmed creation input.

`ResolvedGraph` records the concrete creation result. It is creation truth,
debug context, and a source for lifecycle projection. It is not an update diff
baseline.

Lifecycle update reads provider records:

```text
manifest.lifecycleProviders[]
```

Provider records contain only the context that provider lifecycle work is
authorized to use. If a provider needs more context, the context must be
explicitly projected into its lifecycle record. Providers must not receive the
full manifest or full resolved graph as update input.

## Provider Contract

The v1 provider contract is:

```ts
interface LifecycleProvider {
  id: string
  contractVersion: string

  status(record: LifecycleProviderRecord): Effect<ProviderStatus, ProviderError>
  verify(record: LifecycleProviderRecord): Effect<ProviderVerifyResult, ProviderError>
  planUpdate(
    record: LifecycleProviderRecord,
    options: ProviderUpdateOptions,
  ): Effect<ProviderUpdatePlan, ProviderError>
}
```

There is no v1 `surfaceReport` method. Status, verify, and update plans may
include surface summaries when needed.

`planUpdate` is intentionally named. Providers do not write project files and do
not run side-effect commands directly. They declare lifecycle work; `prelude`
validates and applies it.

## Write Model

After create, `prelude` writes by default only under:

```text
.prelude/**
```

Provider lifecycle artifacts are centralized:

```text
.prelude/providers/<provider-id>/**
```

There is no dual path. For `effect-harness`, the required provider layout is:

```text
.prelude/providers/effect-harness/**
```

not:

```text
.effect-harness/**
```

Namespace ownership:

```text
.prelude/providers/<id>/**
  namespace owner: prelude
  semantic owner: provider
  physical writer: prelude
```

The provider may declare operations under its namespace. `prelude` validates the
namespace and writes the files. `prelude` does not interpret provider domain
semantics inside that namespace.

## External Project Surfaces

Create may write the project scaffold broadly.

After create, external project areas are read-only by default. Lifecycle update
may write only external lifecycle surfaces that were declared during create and
recorded in the manifest.

Allowed v1 external surface kinds:

- `managedBlock`
- `structuredPointer`
- `ownedFile`, only when explicitly declared at create

The normal provider update operation is surface replacement:

```text
replace declared surface
with expected current snapshot/value
and next content/value
```

There is no arbitrary patch contract in v1.

Not allowed:

- git diff patches
- arbitrary text patches
- AST patches
- source rewrites
- provider direct file writes
- provider direct side-effect commands
- adding or expanding external lifecycle surfaces without user approval

If a provider needs to touch an undeclared external surface, lifecycle update
must block. That becomes an explicit migration or redesign task requiring user
approval.

## Update Flow

```text
read manifest
  -> select lifecycle provider records
  -> validate manifest and provider contract schemas
  -> provider.status(record)
  -> provider.planUpdate(record, options)
  -> validate every operation against provider namespace or declared external surfaces
  -> check expected snapshots/values
  -> dry-run or apply through prelude operation layer
  -> run prelude-executed declared commands, if any
  -> provider.verify(record')
  -> write updated manifest
```

Default `prelude update` updates all active lifecycle providers. With
`--provider <id>`, it updates only the selected provider.

## Blockers

Lifecycle update blocks when:

- no manifest exists
- the selected provider record does not exist
- manifest schema is unsupported
- provider contract schema is unsupported
- provider contract version is incompatible
- an external lifecycle surface drifted
- the provider plan targets an undeclared surface
- the provider plan wants to write outside `.prelude/**` without a declared
  external lifecycle surface
- the provider needs to add or expand external surfaces
- provider major version drift requires redesign

Ordinary scaffold drift is ignored. Handed-off source drift is ignored.
