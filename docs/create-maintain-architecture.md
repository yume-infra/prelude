---
audience: [agent, human]
authors:
  - codex
reviewed_by:
  - sayori
purpose: 记录 create 和 maintain 两条主线的终态架构、关联点和最小设计边界。
status: active
sources: []
updated: 2026-06-29
---

# Create Maintain Architecture

## North Star

`prelude` 是 Sayori-first 的 project genesis system。

`prelude` MUST 把 canonical `CreateSpec` materialize 成真实可用、agent-ready、可验证的项目起点。

`prelude` MUST NOT 变成 ordinary scaffold 的长期项目管理器。

`prelude` SHOULD 用最大开闭原则承载已验证的能力语义。

`prelude` MAY 牺牲模板复用性来换取扩展性和语义 locality。

## Mainlines

`prelude` 有两条主线。

```text
create   = 一次性 genesis
maintain = 有状态生命周期维护
```

`create` 主线负责把项目生出来，然后放手。

`maintain` 主线负责维护少数明确 managed 的 surfaces。

`maintain` 是核心能力，不是外部集成的附属层。

Maintain domain module 是 maintain 的语义来源，不是 create capability，也不是架构主角。

## Create

`create` 主线的最小流程是：

```text
Guided CLI | Direct CreateSpec | CreateSpec recipe
  -> CreateSpec
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

`create` MUST use one resolver path for guided CLI, direct spec, and recipes.

`create` MUST NOT maintain ordinary scaffold after successful verification.

`create` SHOULD NOT write a long-term ledger for ordinary generated files.

`create` MAY initialize maintain when the `CreateSpec` selects maintain behavior.

`create` verification proves the generated project is usable at creation time.

`create` verification is not maintain verification.

## Maintain

`maintain` 主线的最小流程是：

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

`maintain` MUST own the manifest.

`maintain` MUST track provider references in `.prelude/manifest.json`.

Provider records under `.prelude/providers/<provider-id>/provider.json` MUST track managed claims, managed locators, base snapshots, provider options, provider profile, and provider runtime metadata.

`maintain` MUST NOT use the create resolved graph as desired truth.

`maintain` MUST NOT update ordinary scaffold.

`maintain` MUST block when a managed logical value has drifted.

`maintain` MUST compare logical values as:

```text
current == desired
  -> already applied
current == base
  -> safe to apply desired
otherwise
  -> drift, block
```

`desired == base` with `current != base` MUST still block.

## Handoff

The only create-to-maintain association is maintain initialization.

```text
create selects maintain behavior
  -> maintain initialization
  -> managed intent
  -> maintain config
  -> provider record
  -> maintain manifest reference
```

`maintain initialization` MUST NOT transfer ordinary scaffold ownership.

`maintain initialization` SHOULD transfer only:

- selected maintain domains
- managed surface locators
- initial managed claims
- initial base snapshots
- domain options needed for status, verify, or update
- contract identity needed to prove maintain continuity

`maintain initialization` MUST NOT transfer:

- all generated files
- the full create resolved graph as update authority
- template provenance for ordinary scaffold
- ordinary package capability choices as maintain claims
- ordinary scaffold provenance records

## Open Closed

新增生成能力时，`prelude` SHOULD add or modify a capability module.

新增多个能力共同影响的语义资源时，`prelude` SHOULD add or deepen a create surface.

新增可维护 domain 时，`prelude` SHOULD add or modify maintain domain modules and managed claim resolution.

Core create flow SHOULD remain closed to ordinary ability additions.

Core maintain flow SHOULD remain closed to ordinary managed-domain additions.

## Templates

Template reuse is not the north-star optimization.

一个 single-owner output SHOULD use a complete local template or local source emitter.

`prelude` SHOULD prefer repeated complete templates over cross-capability template reuse.

`prelude` MUST NOT use:

- global template engine
- cross-capability template inheritance
- cross-capability textual includes
- hidden capability-list conditionals inside templates
- last-writer-wins output

当多个能力共同表达同一语义资源时，`prelude` SHOULD create or deepen a typed surface instead of sharing templates.

## Recipes

CreateSpec recipe 是 reusable project shape。

CreateSpec recipe MUST resolve into a complete `CreateSpec`.

CreateSpec recipe MUST NOT become a preset product model.

CreateSpec recipe MAY be used by guided CLI, generated smoke, and historical-intent tests.

Historical template composition semantics SHOULD be represented as CreateSpec recipes rather than preset execution paths.

## Maintain Domains

Maintain domain module belongs to maintain when it contributes maintained domain semantics.

Maintain domain module MAY also provide initial managed assets during create through maintain initialization.

Maintain domain module MUST NOT be modeled as a create capability.

Maintain domain module MUST NOT write project files directly.

Maintain core MUST validate domain-declared managed changes before applying them.

`effect-harness` is currently the first concrete maintain domain.

`prelude` SHOULD NOT create a generic domain platform before multiple maintain domains prove the seam.

## Rejections

`prelude` MUST NOT restore `ProjectConfig` as creation truth.

`prelude` MUST NOT restore Plan or PlanSpec as the write model.

`prelude` MUST NOT restore Handlebars or global template rendering.

`prelude` MUST NOT restore preset as a product model.

`prelude` MUST NOT treat manifest as create provenance for ordinary scaffold.

`prelude` MUST NOT derive maintain desired state from manifest or provider-record base claims.

`prelude` MUST NOT let maintain become whole-project update.
