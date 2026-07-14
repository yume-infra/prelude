---
status: accepted
date: 2026-07-10
amended: 2026-07-15
---

# Prelude owns hard core and soft-boundary skills

> Ownership successor: ADR-0018 supersedes the exclusive assignment of
> package and executable-config adaptation below. Prelude-owned skills retain
> orchestration; a Harness-delivered skill may own authorized domain-specific
> Target Adaptation after Control Handoff.

The Prelude product contains both a deterministic hard core and user-authorized soft-boundary skills. Harnesses own declarative intent and domain guidance; they do not own competing target integration mutators.

Prelude core begins after a pnpm target selects Prelude and its Harness Artifacts and has schema-valid Integration config. Prelude-owned bootstrap skills may run pnpm, create control-plane inputs, and prepare target-owned content after explicit user authorization. Core has no create or init command.

Prelude also owns the generic upgrade and reconciliation skill. The skill captures an old versioned Plan Document, updates package state, captures the new Plan Document, audits outputs that disappeared or moved, proposes residue cleanup, waits for user approval, applies the target-owned or lifecycle patch, and returns to normal plan/apply/check. Core omission means no current request; it does not infer deletion from missing historical intent.

Canonical Prelude skills ship with the target-selected Prelude npm Artifact so their Plan Document expectations match the selected core. A thin agent entry point only locates and runs that versioned skill. Harness Artifacts may ship domain upgrade guidance, but they do not replace Prelude's cross-Harness orchestrator.

## Consequences

Skills may have broad target and command permissions after authorization, but they cannot approve a core Convergence Plan, impersonate observed evidence, or silently preserve a local override inside Harness-managed authority. Direct package updates without an old Plan Document remain possible, but V1 core then verifies only current declarations and cannot guarantee residue-free upgrade.

Harness domain workflows may operate target-owned domain content. That does not transfer ownership of Harness Integration lifecycle: bootstrap, package coordination, executable-config preparation, managed-surface upgrade, and residue cleanup remain Prelude-owned soft-boundary operations. Integration removal is deferred beyond V1 rather than implemented by either side.
