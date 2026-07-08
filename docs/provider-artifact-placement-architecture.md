---
audience: [agent, human]
authors:
  - codex
reviewed_by:
  - sayori
purpose: 定义 provider artifact selection、target placement、managed claims 和 npm provider package 的主口径。
status: active
sources:
  - docs/create-maintain-architecture.md
  - docs/maintain-architecture.md
updated: 2026-07-08
---

# Provider Artifact Placement Architecture

## Principle

`npm` owns provider artifact selection.

Prelude owns provider artifact projection.

`effect-harness` owns provider desired semantics.

The target owns placement choices that are specific to its shape.

This means an npm package may distribute and version provider desired state, but it MUST NOT
mutate the target repository. Target lifecycle remains in Prelude.

## Layering

The active model is:

```text
@sayoriqwq/effect-harness npm package
  -> versioned provider artifact
  -> provider discovery
  -> package/config/editor/lint/test/verify desired semantics
  -> docs, snippets, and artifact-only source references

target package manager
  -> selected provider package version
  -> lockfile and integrity

Prelude maintain
  -> target shape probe
  -> placement plan
  -> managed claims
  -> desired/base/current reconcile
  -> maintain WritePlan
  -> provider record refresh
```

The provider package is the versioned artifact layer.

Prelude is the lifecycle layer.

## Desired, Base, Current

For package-backed maintain providers:

```text
selected = target package manager + lockfile provider artifact
desired  = selected provider discovery + placement plan
base     = provider record snapshots
current  = target filesystem logical values
```

Desired MUST NOT be derived from `.prelude/manifest.json`.

Desired MUST NOT be derived from provider record base snapshots.

Provider records are reconciliation base, not provider truth.

## Provider Identity

Provider identity has separate axes:

- `package.name`: npm package name, for artifact resolution.
- `package.version`: npm artifact version, for install and update.
- `package.integrity` or resolved locator: package-manager lock identity when available.
- `provider.id`: stable provider id.
- `contractVersion`: discovery and contribution schema understood by Prelude.
- `providerVersion`: provider implementation/content identity.
- `profile.id`: selected provider profile.
- `profile.revision`: optional content hash for the selected profile.

Npm semver communicates artifact compatibility expectations.

`contractVersion` communicates lifecycle protocol compatibility.

Surface expansion still requires Prelude transition approval.

## Placement Plan

Provider discovery declares semantic contributions.

It does not by itself decide where every target writes those contributions.

Prelude resolves:

```text
provider discovery
  -> target shape probe
  -> adoption or maintain placement config
  -> placement plan
  -> physical locators
  -> managed claims
```

A placement plan SHOULD record:

- provider id and profile
- selected package artifact locator
- target topology
- workspace tooling package
- effect runtime package scopes
- effect test package scopes
- tsconfig targets that typecheck Effect code
- eslint entry and inclusion mode
- editor settings targets
- docs and snippets delivery mode
- provider namespace path

Placement plan is not provider truth.

Placement plan is not a manifest ledger.

Placement plan is Prelude's resolved target-local binding between semantic provider contribution
and physical managed locator.

## Semantic Slots

Provider contributions SHOULD describe semantic slots instead of assuming a single target path.

Useful slots for `effect-harness` are:

- `provider-namespace`: `.prelude/providers/effect-harness/**`
- `workspace-tooling-package`: root or tooling package that owns lint and workspace verification
- `effect-runtime-package`: package scopes that run Effect code
- `effect-test-package`: package scopes that run Effect tests
- `effect-tsconfig`: tsconfig files that typecheck Effect code
- `eslint-entry`: target-owned eslint entry that includes provider guardrails
- `editor-policy`: repo-level editor policy settings
- `docs-bundle`: target-facing provider docs
- `snippets`: target-facing provider snippets

Prelude maps slots to files such as `package.json`, `apps/cli/package.json`,
`apps/cli/tsconfig.json`, `eslint.config.mjs`, `.vscode/settings.json`, and
`.zed/settings.json`.

## Managed Surface Types

Prelude SHOULD prefer small, stable managed surfaces:

- package manifest structured pointers
- tsconfig structured pointers
- editor settings structured pointers
- provider namespace managed files
- eslint inclusion hook or managed block
- provider docs and snippets, when copied into the target

Prelude SHOULD NOT take ownership of whole target files when a structured pointer or tiny inclusion
surface is enough.

## Import, Copy, And Reference

Some surfaces are best consumed by import:

- eslint flat config
- provider discovery helpers
- package baseline data
- tsgo policy data

Some surfaces must be materialized or structured-merged:

- `package.json` dependencies and scripts
- `tsconfig.json` language service plugin
- `.vscode/settings.json`
- `.zed/settings.json`
- `.prelude/manifest.json`
- `.prelude/providers/<provider-id>/provider.json`

Docs and snippets may support two modes:

- `copy`: materialize under `.prelude/providers/effect-harness/**` with base snapshots.
- `reference`: record package artifact paths without copying content.

Generated targets SHOULD default to copied docs/snippets.

Existing targets MAY adopt reference mode when they want minimal writes.

## Npm Boundary

The provider npm package MAY expose:

- `effect-harness provider-discover`
- provider discovery programmatic exports
- eslint config export
- package baseline export
- tsgo policy export
- docs and snippets content loaders

The provider npm package MUST NOT use `postinstall`, `prepare`, or another npm lifecycle script to
modify the target repository.

Npm install and update select an artifact.

Prelude status, verify, and update project that artifact into managed target surfaces.

## Current Effect Harness State

The current `prelude` and `effect-harness` integration has these active properties:

- `apps/cli/package.json` is aligned with the provider package baseline for Effect runtime,
  diagnostics, and tests.
- `apps/cli/tsconfig.json` contains the strict `@effect/language-service` plugin policy.
- ESLint provider guardrails are loaded through root `eslint.config.mjs` and apply to
  `apps/cli/src` and `apps/cli/tests`.
- Editor policy is projected into `.vscode/settings.json` and `.zed/settings.json` through
  explicit structured editor settings locators.
- Provider records claim the projected VSCode and Zed editor settings locators.
- The root eslint entry includes provider guardrails through a bounded managed block claim for
  the provider inclusion hook.
- Root `tsconfig.json` is not the primary Effect target scope. The primary Effect scope is the
  package tsconfig that typechecks Effect code.
- Root Effect package entries are workspace tooling dependencies for root scripts and workspace
  verification. They do not make root `tsconfig.json` the primary Effect target tsconfig.

## Lifecycle Authority

Create may initialize effect-harness maintain from the selected provider artifact and placement
plan.

Existing targets use explicit adoption.

Adoption dry-run MUST show selected artifact identity, provider/profile identity, placement
summary, managed claims, current values, desired values, and conflicts without writing files.

Clean adoption MAY write provider-managed surfaces, the provider record, and the maintain manifest
provider reference.

Normal update MUST NOT silently expand lifecycle authority.

When selected provider desired state introduces a surface that is absent from the provider record,
update MUST block until an explicit transition approves the expansion.

Transition approval is a Prelude maintain concern, not npm package install behavior.

## Rejections

Prelude MUST NOT let npm lifecycle scripts mutate target files.

Prelude MUST NOT treat package install as maintain update.

Prelude MUST NOT copy provider internals such as `repos/effect`, `repos/tsgo`, source contracts,
or route documents into target repositories.

Prelude MUST NOT derive desired state from provider records.

Prelude MUST NOT make maintain a whole-project updater.
