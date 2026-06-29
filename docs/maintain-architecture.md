---
audience: [agent, human]
authors:
  - codex
reviewed_by:
  - sayori
purpose: 定义 maintain 主线、manifest、managed claims、drift 检查和 maintain domain 的位置。
status: active
sources:
  - docs/create-maintain-architecture.md
updated: 2026-06-29
---

# Maintain Architecture

## Boundary

This module defines maintain as a core product ability.

Maintain domains supply domain semantics to maintain core.

## Principle

`prelude` create is one-time genesis.

`prelude` maintain is explicit managed lifecycle.

Maintain MUST NOT become whole-project update.

Maintain MUST NOT update ordinary scaffold.

Maintain owns the manifest.

Maintain domain modules supply domain semantics to maintain.

Maintain domain modules MUST NOT be modeled as create capabilities.

## Manifest

The maintain manifest is the durable base for managed lifecycle.

Expected path:

```text
.prelude/manifest.json
```

The maintain manifest SHOULD record:

- schema version
- enabled maintain domains
- managed claims
- managed surface locators
- base snapshots
- domain contract identity
- maintain verification records

The maintain manifest SHOULD NOT record ordinary scaffold provenance.

The maintain manifest SHOULD NOT record the full create resolved graph as update authority.

The maintain manifest MAY include narrow create context only when a maintain domain needs it.

## Maintain Config

Maintain desired state comes from maintain config, lock data, and current maintain domain implementations.

Maintain desired state MUST NOT be derived from manifest base claims.

The update model is:

```text
desired = maintain config + lock + current maintain domain implementation
base    = maintain manifest
current = filesystem
```

## Managed Claim

A managed claim declares one maintain-owned logical value.

A managed claim SHOULD include:

- owner
- domain
- locator
- base snapshot
- conflict policy
- contract identity
- verification expectation when needed

Managed claims are explicit.

Ordinary scaffold is not managed by default.

## Commands

Maintain exposes managed lifecycle commands.

```text
prelude status
prelude verify
prelude update
```

`status` MUST be read-only.

`verify` MUST check maintain domains and managed claims.

`update` MUST only plan and apply managed surface changes.

Create verification is separate.

Maintain verification MUST NOT re-accept ordinary scaffold.

## Reconcile

Maintain reconcile compares logical values.

```text
current == desired
  -> already applied
current == base
  -> safe to apply desired
otherwise
  -> drift, block
```

`desired == base` with `current != base` MUST block.

Manual edits inside managed locators MUST NOT be silently adopted as the new base.

Maintain update MUST NOT repair or reinterpret drift.

## Write Model

Maintain writes through maintain WritePlan.

Maintain WritePlan MUST only target declared managed surfaces.

Maintain WritePlan MUST block undeclared external project surfaces.

Maintain WritePlan MUST NOT use arbitrary git patches, text patches, AST patches, or source rewrites.

Maintain WritePlan MAY replace:

- maintain domain namespace files
- managed blocks
- structured pointers
- explicitly owned files

Maintain core owns drift checks and write validation.

Maintain domain modules do not write project files directly.

## Maintain Domains

`effect-harness` is currently the first maintain domain.

Maintain domains MAY provide:

- domain baseline
- managed surface definitions
- desired managed values
- status behavior
- verify behavior
- update planning behavior
- contract transition behavior

Maintain domains MUST NOT own the maintain mainline.

Maintain core owns:

- manifest schema
- managed claim selection
- drift check
- operation validation
- write application
- manifest base refresh

## Maintain Initialization

Create may initialize maintain when a `CreateSpec` selects maintain behavior.

Maintain initialization MAY:

- write initial managed surfaces
- create maintain config
- create the initial maintain manifest
- record initial base snapshots

Maintain initialization MUST NOT:

- record ordinary scaffold as managed
- transfer all generated files
- transfer full create resolved graph as update authority
- make maintain domain modules create capabilities

## Update Flow

```text
read maintain config
  -> read maintain manifest as base
  -> resolve maintain domains
  -> compute desired managed claims
  -> read current managed logical values
  -> reconcile desired/base/current
  -> block on drift
  -> build maintain WritePlan
  -> validate declared managed surfaces
  -> dry-run or apply
  -> run maintain verify
  -> refresh manifest base
```

## Blockers

Maintain update MUST block when:

- no maintain manifest exists
- selected maintain domain is missing
- manifest schema is unsupported
- domain contract transition cannot prove identity and semantic continuity
- managed surface drifted
- update plan targets undeclared surfaces
- update plan writes outside declared managed surfaces
- update plan needs to add or expand external surfaces without approval

Ordinary scaffold drift MUST be ignored.

Handoff source drift MUST be ignored.

## Contract Transition

Contract transition is explicit and maintain-core executed.

A contract transition plan SHOULD declare:

- previous contract identity
- next contract identity
- surface identity mapping
- ownership transfer
- retire, delete, or detach behavior
- preconditions

Maintain core validates preconditions, reads current logical values, detects drift, produces maintain WritePlan, applies writes, re-reads outputs, and records the new manifest base.

Maintain domain modules MUST NOT mutate previous manifests or files directly.
