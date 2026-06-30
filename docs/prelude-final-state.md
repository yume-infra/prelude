---
audience: [agent, human]
authors:
  - codex
reviewed_by:
  - sayori
purpose: 定义 prelude 重建后的最终架构状态和不可破坏的主线边界。
status: active
sources:
  - docs/create-maintain-architecture.md
updated: 2026-06-29
---

# Prelude Final State

## Sentence

`prelude` 是 Sayori-first 的 project genesis system。

`prelude` 把 canonical `CreateSpec` materialize 成真实可用、agent-ready、可验证的项目起点。

`prelude` 通过 maintain 主线维护少数明确 managed 的 surfaces。

## Mainlines

最终架构有两条主线。

```text
create   = 一次性 genesis
maintain = 有状态 lifecycle
```

`create` 和 `maintain` 的详细口径记录在
[`create-maintain-architecture.md`](./create-maintain-architecture.md)。

## Create Line

`create` 主线的职责是生成项目起点。

```text
CreateSpec
  -> create resolver
  -> resolved create graph
  -> capability modules
  -> create contributions
  -> create surfaces
  -> create WritePlan
  -> apply files
  -> create verification
  -> handoff
```

Guided CLI、direct spec 和 CreateSpec recipe MUST enter the same create resolver.

`create` MUST NOT use a separate prompt branch, preset branch, or template branch as generation truth.

`create` MUST NOT create long-term update authority over ordinary scaffold.

`create` MAY initialize maintain when the selected project shape includes maintain behavior.

## Maintain Line

`maintain` 主线的职责是维护明确 managed 的 surfaces。

```text
maintain config
  -> maintain resolver
  -> managed claims
  -> maintain manifest provider references
  -> provider records
  -> status | verify | update
  -> desired/base/current reconcile
  -> maintain WritePlan
  -> apply managed changes
  -> refresh provider records
  -> refresh manifest references
```

`maintain` owns the manifest.

The maintain manifest is a provider index, not create provenance.

Provider records are the reconciliation base for managed surfaces.

`maintain` MUST NOT update ordinary scaffold.

`maintain` MUST NOT derive desired state from manifest or provider-record base claims.

## Association

The create-to-maintain association is maintain initialization.

```text
create selected maintain behavior
  -> initialize maintain config
  -> write initial managed surfaces
  -> write provider records
  -> record maintain manifest references
```

This association MUST be narrow.

Maintain initialization MUST NOT transfer ordinary scaffold ownership.

Maintain initialization MUST NOT transfer the full create resolved graph as update authority.

## CreateSpec

`CreateSpec` is the canonical create input.

`CreateSpec` records topology, package scopes, selected create capabilities, selected maintain behavior, and explicit overrides.

`CreateSpec` is closed.

`CreateSpec` MUST NOT support include, import, extends, or remote references.

Reusable shapes are complete CreateSpec recipes.

CreateSpec recipes MUST NOT become a preset product model.

## Capability

A capability is a scoped create ability.

Capabilities are user-understandable abilities, not raw files, dependencies, or template fragments.

Capability modules SHOULD be deep enough to carry:

- id and label
- root or package scope
- requirements and conflicts
- create surfaces
- create contributions
- create verification expectations
- guided visibility when relevant

Core create flow SHOULD remain closed to ordinary capability additions.

## Surface

A create surface is a semantic merge point with one materializer.

Capabilities contribute typed data to create surfaces.

Capabilities MUST NOT patch shared physical files directly.

One physical path MUST have one writer.

If two capabilities need the same physical file, they MUST meet at one typed surface or generation blocks.

Logical surface depth is more important than template reuse.

## Materialization

Materializers turn create surfaces into write operations.

Materializers MAY use complete local templates, small explicit variables, or local helper functions.

Materializers MUST NOT use a global template engine.

Materializers MUST NOT use cross-capability textual includes.

Materializers MUST NOT use hidden capability-list conditionals inside shared templates.

Text duplication is acceptable when it preserves open/closed extension and local reasoning.

## Verification

Create verification proves the generated project works at creation time.

Create verification SHOULD come from capability or surface expectations rather than a central family switch.

Generated smoke is an external gate.

Generated smoke SHOULD install, build, typecheck, lint, run, or verify representative generated targets.

Generated smoke MUST NOT become the only source of acceptance knowledge.

Maintain verification is separate from create verification.

## Maintain Manifest

The maintain manifest records maintain provider references.

The maintain manifest SHOULD include:

- schema version
- maintain provider id
- provider record path
- provider contract identity
- provider implementation/profile identity
- maintain verification records

Provider records under `.prelude/providers/<provider-id>/provider.json` SHOULD include managed claims, locators, base snapshots, options, profile, and runtime metadata.

The maintain manifest SHOULD NOT include ordinary scaffold provenance records.

The maintain manifest SHOULD NOT expand provider managed surfaces.

Provider records MAY include minimal create context only when a maintain domain needs it.

## Maintain Domains

Maintain domain modules belong to maintain when they provide managed domain semantics.

Maintain domain modules are not create capabilities.

Maintain domain modules MUST NOT write project files directly.

Maintain core validates domain-declared desired changes, drift checks them, and applies managed changes through maintain WritePlan.

`effect-harness` is the first maintain domain.

`prelude` SHOULD NOT build a generic domain platform before multiple maintain domains justify that seam.

## Rejections

The final architecture MUST NOT restore historical create-yume implementation models.

The final architecture MUST NOT restore:

- `ProjectConfig` as creation truth
- Plan or PlanSpec as write model
- Handlebars as global renderer
- preset as product model
- whole-project lifecycle update
- manifest-as-desired-truth
- ordinary scaffold update authority
