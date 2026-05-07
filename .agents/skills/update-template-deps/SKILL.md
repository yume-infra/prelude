---
name: update-template-deps
description: Update create-yume generated template dependency versions with taze. Use when Codex needs to check or refresh dependency ranges emitted into generated React, Vue, Node, CLI, library, or workspace template package.json files, especially after root dependency maintenance or before release validation.
---

# Update Template Deps

## Workflow

1. From the create-yume repository root, inspect the current diff with `git status --short`.
2. Run the bundled checker first:

```bash
python3 .agents/skills/update-template-deps/scripts/update_template_deps.py --mode check
```

3. If it reports stale generated-template dependencies, run:

```bash
python3 .agents/skills/update-template-deps/scripts/update_template_deps.py --mode update
```

4. Review the diff. The script updates generator source literals; do not hand-edit committed output under `apps/examples/.generated/`.
5. Verify according to the changed surface. For dependency literal changes, start with:

```bash
pnpm --filter create-yume test -- package-json workspace-root planner
pnpm --filter create-yume typecheck
```

Run `pnpm verify` when the update is broad, affects package manager behavior, or before committing.

## Script Contract

- The script builds a temporary probe `package.json` from known generator dependency source files and runs the installed workspace `taze`; it does not query npm itself.
- `--mode check` reports what taze would update and exits nonzero when stale versions are found.
- `--mode update` lets taze rewrite the probe manifest, then maps updated ranges back into the known source files.
- The first version intentionally supports simple string-literal dependency maps and the pnpm package manager constant. If a new storage pattern is added, extend the script before trusting the result.

## Source Files Covered

- `apps/cli/src/core/owners/scaffold-family.ts`
- `apps/cli/src/core/owners/router.ts`
- `apps/cli/src/core/owners/state-management.ts`
- `apps/cli/src/core/workspace-bootstrap.ts`
- `apps/cli/src/core/package-manager.ts`
