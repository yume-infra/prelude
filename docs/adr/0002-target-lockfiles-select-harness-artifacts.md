---
status: accepted
date: 2026-07-10
amended: 2026-07-12
---

# Target lockfiles select harness artifacts

The control root containing `prelude.config.jsonc` is the only V1 executable Artifact importer. Its root `package.json` must directly declare Prelude and every Harness Artifact in `devDependencies`; its `pnpm-lock.yaml` and installed graph select their exact executable versions. Integration `packageRoot` values select target scope only and never create nested Module resolution contexts.

Prelude loads the exact package export named by Integration config from that root graph. Unversioned `npx`, registry-latest discovery, transitive dependency discovery, npm cache paths, nested importer search, and machine-local absolute paths are not selection mechanisms. pnpm catalog, workspace, patch, tarball, and registry selectors remain valid because the committed package graph and lockfile resolve them before Prelude runs.

The configured Module is an exact bare ESM package export specifier such as `@sayoriqwq/effect-harness/prelude`. That export must expose one named `harnessModule` value implementing `@sayoriqwq/prelude-contract`. Prelude has no default-export fallback, package metadata discovery, provider manifest, directory scan, relative or absolute Module path, or legacy shape adapter. Different export subpaths may identify different Modules, but every subpath uses the same fixed export name.

## Consequences

Package name and version alone are not executable identity. The host records an opaque resolution identity that preserves the root importer, selected lock resolution, peer, patch or workspace context, and resolved package export without exposing machine-local absolute paths, the complete lockfile, transitive closure, or redundant whole-package attestation in the public contract. Replanning observes Module output changes, including mutable development Artifacts. Package updates select candidate desired semantics; they do not authorize target writes until Prelude presents and receives approval for the resulting Convergence Plan.
