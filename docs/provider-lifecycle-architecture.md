# Provider Lifecycle Architecture

This document records the lifecycle-provider decisions for `prelude`.

## First Principle

`prelude` is a project genesis system. Create is the broad-write phase. After
create, `prelude` must not become a general project manager.

Post-create lifecycle work exists only for explicitly managed contributions
whose value remains during project use. Today those managed contributions are
primarily produced by the AI harness/provider layer.

The core rule is:

```text
provider owns semantics
prelude owns write boundary
```

Provider lifecycle update must never become whole-project update. Provider
lifecycle belongs to each provider contribution, not to the entire provider.

## Post-Create Commands

Post-create commands operate on active managed provider records and managed
claims recorded in `.prelude/manifest.json`.

```text
prelude status
  -> inspect all active managed providers

prelude status --provider effect-harness
  -> inspect one active managed provider

prelude verify
  -> verify all active managed providers

prelude verify --provider effect-harness
  -> verify one active managed provider

prelude update
  -> update all active managed providers

prelude update --provider effect-harness
  -> update managed claims owned by one provider
```

`status` is read-only. It reads manifest base and provider records, reports
provider state, and does not run verification or write files.

`verify` executes provider lifecycle checks. It does not re-accept the whole
scaffold and does not check ordinary scaffold drift.

`update` executes managed provider contribution changes. It does not re-run
create, diff the resolved graph, update framework dependencies, migrate
topology, or patch handed-off source.

Create acceptance verification is separate. It is part of the create flow and
may be wider because it answers whether the newly generated project is usable.

## Manifest Role

Every `prelude`-generated project has:

```text
.prelude/manifest.json
```

The manifest is creation ledger plus reconciliation base. It is not desired
truth, not a general managed-project contract, and does not grant post-create
update authority over ordinary scaffold output.

Update state is:

```text
desired = prelude config + prelude lock + current capability/provider implementation
base    = manifest
current = filesystem
```

The provider must not derive current desired claims from old manifest claims.

`CreateSpec` records the confirmed creation input.

`ResolvedGraph` records the concrete creation result. It is creation truth and
debug context. Projected pieces may help providers plan, but the graph is not an
update diff baseline.

Lifecycle update reads provider records and managed claims:

```text
manifest.lifecycleProviders[]
manifest.managedClaims[]
```

Provider records contain only the context that provider lifecycle work is
authorized to use. If a provider needs more context, the context must be
explicitly projected into its lifecycle record or provider options. Providers
must not receive the full manifest or full resolved graph as update input.

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
not run side-effect commands directly. They declare managed contributions,
lifecycle work, or migration plans; `prelude` validates and applies them.

Each provider contribution declares:

```text
lifecycle: handoff | managed
```

Provider runtime assets and integration surfaces normally declare `managed`.
Provider demos, examples, and ordinary generated source normally declare
`handoff`.

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

Provider-owned namespace files may be copied from complete templates. They do
not need typed surfaces simply because they are managed; namespace ownership is
the reconcile contract.

## External Project Surfaces

Create may write the project scaffold broadly.

After create, external project areas are read-only by default. Lifecycle update
may write only external managed surfaces that were declared during create and
recorded in the manifest.

Allowed v1 external surface kinds:

- `managedBlock`
- `structuredPointer`
- `ownedFile`, only when explicitly declared at create

The normal provider update operation is managed surface replacement:

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
- adding or expanding external managed surfaces without user approval

If a provider needs to touch an undeclared external surface, lifecycle update
must block. That becomes an explicit migration or redesign task requiring user
approval.

Strict reconcile for managed logical values is:

```text
current == desired
  -> already applied, success
current == base
  -> safe to write desired
otherwise
  -> drift, block
```

`desired == base` with `current != base` still blocks. User edits inside a
managed locator are not adopted silently.

Managed locators are logical values: a JSON pointer value, managed block body,
file hash/body, or provider namespace digest. Reconcile must not compare an
entire surrounding file unless the claim scope is the whole file.

Multiple providers may share a field only through claims. Removing one provider
removes its claim and recomputes the merged desired value from remaining owners;
it must not directly delete the final field.

## Update Flow

```text
read manifest as base
  -> select managed provider records and claims
  -> recompute desired from config, lock, and current provider implementation
  -> validate manifest schemas, provider contracts, and migration paths
  -> provider.status(record)
  -> provider.planUpdate(record, options)
  -> validate every operation against provider namespace or declared managed surfaces
  -> reconcile base/current/desired logical values
  -> dry-run or apply through prelude operation layer
  -> run prelude-executed declared commands, if any
  -> provider.verify(record')
  -> write updated manifest base
```

Default `prelude update` updates all active managed providers. With
`--provider <id>`, it updates only managed claims owned by the selected
provider.

## Blockers

Lifecycle update blocks when:

- no manifest exists
- the selected provider record does not exist
- manifest schema is unsupported
- provider contract schema is unsupported
- provider contract transition cannot prove identity, ownership topology, and
  semantic continuity
- an external managed surface drifted
- the provider plan targets an undeclared surface
- the provider plan wants to write outside `.prelude/**` without a declared
  external managed surface
- the provider needs to add or expand external surfaces
- no explicit migration path exists for a changed surface identity, locator,
  stable key, ownership scope, or semantic meaning

Ordinary scaffold drift is ignored. Handed-off source drift is ignored.

## Provider Contract Migration

Provider migration is explicit and core-executed.

A migration plan must declare:

- `fromContract`
- `toContract`
- old and new surface identity mapping
- ownership transfer
- retire, delete, or detach behavior
- preconditions

Providers return declarative migration plans. They do not read an old manifest
and mutate files directly. `prelude` validates preconditions, reads current
logical values, detects drift, generates the write plan, shows the diff, applies
writes, re-reads outputs, and only then records the new manifest base.
