---
status: accepted
date: 2026-07-10
amended: 2026-07-12
---

# Keep executable config outside the V1 Output contract

Prelude does not parse or partially rewrite JavaScript or TypeScript configuration files. V1 also does not expose an Owned File Output. Executable configs such as `eslint.config.mjs`, `vitest.config.ts`, and `vite.config.ts` remain target-owned integration entry points rather than complete Harness-owned files.

A Harness Artifact may export a stable, reusable configuration API through its package. Its Harness Module inspects the target read-only and reports a blocking issue when the target's effective executable configuration has not integrated that API correctly. A Prelude-owned bootstrap or reconciliation skill may patch the target-owned entry point after explicit user authorization, show the concrete diff, and then return to normal plan, apply, and check. Harnesses may provide domain guidance for that patch but do not own competing mutators.

Prelude's V1 semantic materializers are limited to JSON/JSONC logical values, keyed structured collection items, host-marked text blocks, and authoritative trees. It does not become a general AST, template, executable-configuration composition engine, or whole-file provenance system.

## Consequences

Harnesses must design self-contained, importable config APIs when they need executable configuration. Stable imports let normal Artifact upgrades change Harness policy without rewriting the target entry point. If an API shape or target composition must change, the Integration blocks until the Prelude-owned skill produces an approved patch. Prelude never guesses executable-code semantics in its deterministic core, and a target-owned entry point cannot silently weaken required Harness policy.
