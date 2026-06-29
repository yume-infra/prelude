# Fullscreen Create Workbench V1 Acceptance

This fixture set records the first acceptance slice for issues #47/#46.

Target v1 intent:

- workspace topology
- no application package by default
- direct `CreateSpec` and TUI entrypoints produce the same minimal workspace semantics
- package abilities are explicit recipes layered on top of the workspace intent
- linting and hygiene surfaces are explicit engineering choices, not hidden workbench defaults
- effect-harness maintain initialization

Current executable minimum equivalents:

- `minimal-workspace.create-spec.json` covers the default workbench intent: a pnpm workspace root with `apps/*` and `libs/*` package slots and no package ability.
- `node-monorepo-workspace-v1.create-spec.json` covers the first explicit acceptance ability: `apps/node` plus pnpm, Turbo, Node linting, Knip, and effect-harness maintain initialization.
- `workspace-cli-ability.create-spec.json` covers the explicit CLI package ability layered onto the workspace intent.
- `effect-harness-current-equivalent.create-spec.json` covers direct `CreateSpec`, TypeScript, linting, Knip, and effect-harness maintain initialization through the currently supported `single-package + effect-package + ai-harness + effect-harness` path.
- `workspace-cli-quality-enabled.create-spec.json` is the minimal paired reproduction for explicit root quality surfaces. It explains why Antfu ESLint and Knip appear when `rootCapabilities` includes `linting` and `knip`.

Current boundary:

`node-monorepo-workspace-v1.create-spec.json` is intentionally not an Effect application template. It initializes effect-harness as a maintain provider for the workspace while the `node-app` package stays blank and Node-oriented.

Manual TTY acceptance checklist:

1. Build the CLI with `pnpm --filter @sayoriqwq/prelude build`.
2. Run the built CLI interactively with no `--spec` and no `--no-input`.
3. Confirm the first viewport is the create workbench, not a landing page or prompt tunnel.
4. Confirm the default screen describes the project name, location, starter shape, included tools, generated result, ownership summary, and next actions.
5. Confirm normal copy stays product-facing. Advanced labels such as resolver, WritePlan, manifest, materializer, managed surfaces, and lifecycle ownership should only appear behind an explicit advanced/details surface.
6. Confirm `ctrl+e` shows the canonical `CreateSpec` draft and `enter` submits through the normal create route.
7. Run direct spec validation:
   - `pnpm --filter @sayoriqwq/prelude test -- tests/core/create-workbench-v1-acceptance.test.ts`
   - `pnpm --filter @sayoriqwq/prelude typecheck`
   - `pnpm --filter @sayoriqwq/prelude test`

Current automatic coverage:

- direct `--spec <file> --dry-run --no-input` remains usable for the effect-harness equivalent and does not write files.
- direct `--spec <file> --dry-run --no-input` proves the default minimal workspace intent does not emit package ability, ESLint, or Knip surfaces.
- direct `--spec <file> --dry-run --no-input` proves the CLI ability fixture emits package surfaces without hidden ESLint or Knip surfaces.
- direct `--spec <file> --dry-run --no-input` proves the quality-enabled workspace CLI equivalent does emit Antfu ESLint and Knip surfaces.
- direct `--spec <file> --dry-run --no-input` proves the node monorepo workspace v1 ability emits `apps/node`, Turbo, linting, Knip, and effect-harness maintain surfaces together.
- direct `--spec <file> --print-spec --no-input` remains usable for the minimal workspace intent and does not write files.
