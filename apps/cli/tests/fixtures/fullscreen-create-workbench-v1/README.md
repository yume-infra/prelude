# Fullscreen Create Workbench V1 Acceptance

This fixture set records the first acceptance slice for issues #47/#46.

Target v1 intent:

- workspace topology
- one Effect/Node CLI package
- TypeScript
- linting
- Knip
- effect-harness maintain initialization

Current executable minimum equivalents:

- `effect-harness-current-equivalent.create-spec.json` covers direct `CreateSpec`, TypeScript, linting, Knip, and effect-harness maintain initialization through the currently supported `single-package + effect-package + ai-harness + effect-harness` path.
- `workspace-cli-current-equivalent.create-spec.json` covers workspace topology, a Node CLI package, TypeScript package build surfaces, linting, and Knip.

Current gap:

The combined v1 target is not one executable `CreateSpec` yet. The current resolver rejects workspace provider orchestration, and package runtime capabilities are mutually exclusive, so there is no single current capability id for an Effect-backed CLI package.

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
- direct `--spec <file> --print-spec --no-input` remains usable for the workspace CLI equivalent and does not write files.
- the currently unsupported combined v1 target reports the resolver blocker instead of silently dropping provider intent.
