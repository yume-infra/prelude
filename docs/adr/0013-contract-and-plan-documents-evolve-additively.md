---
status: accepted
date: 2026-07-12
amended: 2026-07-15
---

# Module and Plan contracts evolve additively

> V2 successor: V2 was an explicit breaking protocol cutover and does not load
> or adapt V1 Modules. Within the V2 line, feature negotiation and frozen field
> semantics retain the additive-evolution rule. V2 also adds
> `PinnedReferenceTree`; see the active V2 Contract.

The stable Harness Module seam is `descriptor + plan(read-only target, Integration, selected Artifact)`. A plan has four top-level categories: outputs, Package Requirements, checks, and issues. Modules return complete current declarations and never target mutation callbacks or hidden lifecycle state.

V1 freezes the semantic meaning of every published field and output type. Future versions may add optional fields or new output capabilities, but may not reinterpret existing values. A module declares its protocol version and required features; Prelude rejects unsupported required features before partial planning or materialization.

The V1 `issues` category is a complete current set of blockers, not a severity-ranked diagnostic stream. Every returned issue prevents apply. An issue has an Integration-scoped stable id, a human summary, and optional detail, target evidence, and Artifact-relative guidance. Nonblocking observations belong in Plan evidence. Prelude persists no issue lifecycle: after remediation the Module replans from current target state and simply stops returning the resolved issue.

A V1 Package Requirement identifies an exact target package importer, package name, compatible version range, and direct manifest section. V1 sections are `dependencies` and `devDependencies`. Satisfaction requires a direct declaration in that section, a lockfile resolution for that importer which satisfies the range, and installed state consistent with the lockfile; an accidentally resolvable transitive dependency does not satisfy the requirement. Manifest protocols such as pnpm catalogs and workspace references remain valid because Prelude evaluates the selected resolution rather than requiring the declaration string itself to be a semver range. Package Requirements are blockers, never core write authority.

Integration identity, stable Harness identity, and package Artifact identity remain separate. This allows package rename or replacement without conflating the Harness, and allows multiple target-local uses without treating a package name as the owner.

`prelude plan --json` is a versioned public machine interface, not incidental CLI formatting. It includes Plan schema and execution-hash versions, Integration and Artifact identities, stable output identities and locators, requirements, checks, issues, display evidence, and the exact execution hash. Prelude-owned upgrade skills compare old and new Plan Documents rather than scraping human output or importing Prelude internals.

## Consequences

Old Harness Artifacts remain loadable by newer compatible Prelude versions. Old Prelude versions block when a selected Harness requires a feature they do not implement. Human plan rendering may evolve independently from the machine document.

Later accepted decisions freeze the V1 Output union to ManagedTree, ManagedBlock, JsonValue, and JsonKeyedItem; publish the Contract as `@sayoriqwq/prelude-contract`; anchor Artifact resolution at the Control Root; and require the real Effect Harness plus Psychogram Partita tracer before the V1 release gate.
