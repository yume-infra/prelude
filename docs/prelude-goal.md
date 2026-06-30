---
audience: [agent, human]
authors:
  - codex
reviewed_by:
  - sayori
purpose: 记录 prelude 的产品北极星、第一用户、能力取舍和非目标。
status: active
sources:
  - docs/create-maintain-architecture.md
updated: 2026-06-29
---

# Prelude Goal

## North Star

`prelude` 是 Sayori-first 的 project genesis system。

`prelude` 的目标是生成一个真实可用、agent-ready、可验证的项目起点。

`prelude` 生成的是项目开始工作前的 opening state，不是长期接管项目的管理器。

Ordinary scaffold MUST be handed off after create.

Only explicitly managed surfaces MAY participate in maintain.

## First User

Sayori 是第一用户。

`prelude` SHOULD encode Sayori 的技术偏好、工程基线、AI/agent harness 习惯和验证表面。

Public generic usefulness MAY be a side effect.

`prelude` MUST NOT optimize first for neutral template-marketplace extensibility.

## Product Shape

`prelude` has two mainlines:

```text
create   = 一次性 genesis
maintain = 有状态 lifecycle
```

`create` 负责生成项目起点。

`maintain` 负责维护少数 managed surfaces。

The association between create and maintain is maintain initialization.

## Create Input

`CreateSpec` is the canonical create input.

There are three accepted ways to produce a `CreateSpec`:

- Guided CLI MAY ask questions and emit a canonical `CreateSpec`.
- Direct spec MAY provide a complete canonical `CreateSpec`.
- CreateSpec recipe MAY provide a reusable complete project shape.

Every create path MUST enter the same resolver.

Reusable project shapes MUST be complete CreateSpec recipes.

Reusable project shapes MUST NOT become presets.

`CreateSpec` MUST be closed.

`CreateSpec` MUST NOT support include, import, extends, or remote references.

## Composition

The first create split SHOULD be topology.

Supported topology starts with:

- single package
- workspace

React, Vue, Node, CLI, library, Effect, linting, Knip, AI harness initialization, and similar choices SHOULD be scoped capabilities or maintain selections.

Capabilities represent user-understandable abilities.

Capabilities MUST NOT be raw dependencies, source fragments, template fragments, or individual JSON pointers.

The boundary between capability and option is ownership.

If a choice owns dependencies, create surfaces, verification expectations, conflicts, or maintain initialization, it SHOULD be modeled explicitly.

## Engineering Tradeoff

`prelude` optimizes for open/closed extensibility before template reuse.

`prelude` MAY duplicate complete templates when duplication preserves locality and extension safety.

`prelude` MUST NOT introduce a global template engine to reduce text duplication.

`prelude` MUST NOT use cross-capability template inheritance or textual includes.

When multiple capabilities affect the same semantic resource, `prelude` SHOULD deepen a typed surface instead of sharing templates.

## Maintain

Maintain is a core product ability.

Maintain is core product flow, not an integration-scoped adjunct.

Maintain owns the manifest.

The maintain manifest records maintain provider references and verification state.

Provider records under `.prelude/providers/<provider-id>/provider.json` record managed claims, locators, base snapshots, provider options, provider profile, and domain identity.

The maintain manifest MUST NOT become a create ledger for ordinary scaffold.

Maintain MUST NOT update ordinary scaffold.

Maintain MUST compare desired, base, and current logical values for managed surfaces.

Maintain MUST block on managed drift.

## Maintain Domains

Maintain domain modules provide maintain domain semantics.

Maintain domain modules are not create capabilities.

`effect-harness` is currently the first maintain domain.

`prelude` SHOULD NOT expose harness-internal free composition before multiple maintain domains justify that seam.

`prelude` owns:

- topology
- package graph
- create capability selection
- maintain initialization
- root/package scope
- conflict resolution
- create materialization
- create verification
- maintain write boundary

Maintain domains own their domain semantics.

## Version Ownership

Version ownership follows content ownership.

`prelude` owns pins for scaffold content it emits directly.

Maintain domains own pins and contract identity for their managed domain.

Default-policy drift is not a generated-project update.

If the same `CreateSpec` resolves differently because `prelude` changed defaults, that is a create policy change, not maintain update.

## Self Iteration

`prelude` self-iteration may update its own pins, generated examples, docs, and smoke baselines.

Self-iteration MUST NOT apply ordinary scaffold changes to existing created projects.

Generated smoke output SHOULD remain inspectable under the repo-local ignored examples area.

Generated smoke SHOULD include representative renderable app and maintain-domain targets.

## Non Goals

`prelude` MUST NOT become:

- a general existing-project updater
- a preset product model
- a remote template marketplace
- a plugin marketplace
- a Handlebars renderer
- a whole-project lifecycle manager
- a compatibility layer for historical create-yume internals

Historical create-yume is an intent baseline.

Historical create-yume is not an implementation baseline.
