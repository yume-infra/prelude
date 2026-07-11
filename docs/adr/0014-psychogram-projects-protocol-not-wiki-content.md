---
status: accepted
date: 2026-07-12
---

# Psychogram projects protocol, not wiki content

Psychogram is a wiki protocol Harness. Its Prelude Integration projects the protocol and runtime guidance; Prelude does not model a wiki instance, wiki identity, wiki registry, or wiki content ownership.

The Psychogram Managed Tree contains complete `harness/**`, complete `template/**`, and the complete Codex projection, copied byte-for-byte from a static Artifact bundle. Fixtures, unrelated runtime projections, and repository maintenance material are not target surfaces.

Actual wikis are target-owned domain content under the protocol convention `psychogram/wikis/**`. Psychogram may inspect them through its read-only Module, return domain diagnostics, and declare verification. Psychogram domain workflows may create and maintain wiki content after user authorization. Prelude understands only the resulting Harness declarations and checks, not wiki page types or instance lifecycle.

## Consequences

`prelude.config.jsonc` contains no `wikiId`, wiki path list, registry, or per-page ownership. V1 Partita acceptance includes one real wiki. Multi-wiki behavior is deliberately deferred to V2 even though the target namespace uses the plural `wikis`.

All Harness-managed surface mutation and cross-Harness Integration lifecycle remain Prelude-owned. Domain workflows editing target-owned wiki content do not become Prelude core materializers.
