---
status: accepted
date: 2026-07-12
---

# Publish the Module contract as a shared package

Prelude, Effect Harness, and Psychogram must depend on one real contract rather than independently reproducing compatible-looking types. Prelude will add `packages/harness-contract` to its existing pnpm workspace and publish it as `@sayoriqwq/prelude-contract`. The Prelude CLI and every Harness Module depend on that package; Harnesses do not depend on the complete Prelude CLI or core.

The package owns canonical Effect Schema codecs, TypeScript declarations derived from those schemas, protocol feature identifiers, and small helpers that produce ordinary JSON-compatible contract values. It contains no target filesystem access, module loading, planning, command execution, mutation, CLI behavior, or Harness-specific domain policy.

Contract values are plain data and never rely on classes, `instanceof`, process-global registries, or one physical package instance. Prelude validates returned values with the contract version it supports, so separate resolved copies do not create runtime identity coupling. The npm package version transports contract code but does not replace the explicit Module protocol version and required-feature negotiation.

## Consequences

The shared package is a small published boundary in the Prelude repository, not another repository or an export of the CLI package. Cross-repository contract drift becomes a compile, schema, or compatibility failure instead of a late integration surprise. Existing changesets and release automation can publish it alongside Prelude while Harness Artifacts select compatible package versions through their own package graphs.
