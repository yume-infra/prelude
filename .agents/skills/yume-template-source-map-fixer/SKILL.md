---
name: yume-template-source-map-fixer
description: "Map @sayoriqwq/prelude generated-output symptoms back to durable template, owner, manifest, planner, or verification sources; implement source fixes instead of editing ignored generated output; and verify the affected generated surface."
---

# @sayoriqwq/prelude Template Source-Map Fixer

Use this skill when the task is to fix a @sayoriqwq/prelude generated scaffold defect after there is a concrete generated-output symptom, audit report, failing smoke command, lint/build failure, or user-visible generated file issue. The skill turns generated evidence into source-owned changes.

## Trigger Conditions

Use this skill for:

- Generated React, Vue, Node, CLI, library, or workspace output that fails build, lint, typecheck, smoke, install, bin invocation, or first-open quality checks.
- Audit handoffs that name generated file locators, command/tooling surfaces, classifications, and likely durable owners.
- Bugs under `apps/examples/.generated/` where the requested fix must be made in generator source instead of the ignored generated workspace.
- Template, partial, owner, package manifest, `PlanSpec`, workspace package, smoke-gate, or generated verification policy fixes that start from generated symptoms.
- Ambiguous source-map work where the generated path is known but the durable owner is not yet proven.

Do not use this skill for report-only generated scaffold audits. Use `generated-scaffold-audit` when the current task is to produce command-backed evidence and a handoff, not to change generator source.

## Boundary

Generated output is the symptom surface, not the repair surface. Never make the final fix by hand-editing ignored generated projects under `apps/examples/.generated/` or another temporary generated target. Temporary generated-output edits are allowed only as throwaway exploration to understand expected output; discard or regenerate them before final verification.

Source fixes must land in the durable owner:

| Symptom surface | Durable owner candidates |
|---|---|
| Generated source/config file path | `apps/cli/templates/fragments/**`, `apps/cli/templates/partials/**`, static assets, render normalization |
| Generated `package.json` scripts, dependencies, engines, package manager, or ordering | package manifest contributions, package policy owners, workspace bootstrap, dependency constants |
| Generated workspace root or child package layout | workspace package planner, target directory rules, owner contributions, `PlanSpec` projection |
| Missing or wrong generated command behavior | package policy, smoke-gate design, post-generate command/file actions |
| Build warning with successful exit | dependency/build-warning policy, generated CSS entry, Vite/Tailwind integration, verification classification |
| Lint rule conflict or preset lint boundary | generated lint config, framework template branch, lint strategy decision |

## Workflow

1. Establish the generated symptom.
   - Prefer an existing audit report produced by `generated-scaffold-audit`.
   - If no report exists, reproduce the symptom with the smallest affected preset, spec, or smoke selector.
   - Record the command, generated target or source, exit code, failing locator or command surface, and a short sanitized excerpt.
   - Preserve the audit vocabulary: `template whitespace`, `unused imports / dead code`, `framework lint semantics`, `generated config policy`, `dependency/build warning`, or `editor-only diagnostics`.

2. Decide whether this is audit work or fixing work.
   - Continue with this skill only when the next action is to change generator source, verification gates, or durable policy.
   - Switch to `generated-scaffold-audit` when evidence is missing, the task asks for a quality report, or the owner cannot be responsibly inferred.
   - Do not broaden an audit handoff into unrelated template cleanup. Fix the named symptom family and any directly coupled owners only.

3. Source-map from output to owner.
   - Start with the generated path or command/tooling surface.
   - Search for stable emitted text, dependency names, script names, config keys, package ids, preset ids, or owner labels in generator source.
   - For generated file locators, inspect likely fragments and partials before changing package policy.
   - For structured JSON or manifest symptoms, inspect manifest contribution code instead of looking for a nonexistent Handlebars template.
   - For workspace symptoms, trace `ProjectConfig` or create-spec input through planner, owner contribution, target directory, `PlanSpec`, and materialization.
   - For command-only warnings or missing scripts, map to package policy, verification policy, dependency/build-warning owner, or smoke-gate design without inventing a generated file owner.

4. Prove ownership before editing.
   - Confirm that the candidate owner emits or controls the observed generated output for the affected preset or spec.
   - Check whether the same owner feeds other presets, minimal/full variants, or workspace package scopes.
   - Identify whether the fix is local text, branch selection, owner contribution, manifest policy, validation/schema, or verification gate behavior.
   - If two owners are plausible, name the ambiguity and inspect the smaller or more direct owner first.

5. Make the durable fix.
   - Edit generator source, templates, partials, manifest owners, planner logic, smoke gates, or tests as appropriate.
   - Keep generated-output policy intact: full presets must pass `pnpm lint --max-warnings=0` where lint is enabled; minimal presets remain build-only unless a cited spec changes that policy.
   - Keep build warnings separate from lint failures. Tailwind/Lightning CSS warnings during successful Vite builds are dependency/build-warning evidence unless policy changes.
   - Add or update focused tests when the owner behavior is covered by render snapshots, manifest contribution tests, planner tests, smoke-gate tests, or schema tests.

6. Verify the affected surface.
   - Template fragment, partial, registry, helper: `pnpm --filter @sayoriqwq/prelude test`.
   - Planner or `PlanSpec`: `pnpm --filter @sayoriqwq/prelude test`.
   - Package manifest policy: `pnpm --filter @sayoriqwq/prelude build` plus focused manifest tests.
   - Workspace root or child packages: targeted planner/workspace tests and `pnpm --filter @sayoriqwq/prelude typecheck` when package graph behavior changes.
   - Real generated project behavior: `PRELUDE_SMOKE_CASES=<affected-selector> pnpm --filter @sayoriqwq/prelude smoke:examples`.
   - Broad or uncertain impact: `pnpm verify`.
   - If a full preset is lint-enabled, include generated `pnpm verify` evidence either through smoke or direct generated-project commands; `lint --max-warnings=0` alone is insufficient because it misses Knip/package dependency regressions.
   - If package manifest or lifecycle policy touches Husky/code-quality tooling, verify a Git-enabled generated target: confirm `pnpm verify` passes, `core.hooksPath` is `.husky/_`, and a no-`.git` pack copy is quiet while still including built `dist` files.

7. Re-check the source map after the fix.
   - Regenerate or smoke the affected surface; do not rely only on the source diff.
   - Confirm the generated symptom changed in the intended output.
   - Confirm no unrelated generated surfaces changed unless the owner is intentionally shared.
   - If verification exposes a new symptom family, classify it separately instead of folding it into the original fix.

## Source-Map Heuristics

- Search generated filenames and distinctive emitted text first.
- Search package script names, dependency package names, engines, and config keys for manifest symptoms.
- Search preset ids and `GenerationPackageKind` values for preset or workspace routing bugs.
- Treat `package.json` as structured mutation unless the source proves it is static text.
- Treat absent files, malformed output, timeouts, and missing scripts as command/tooling surfaces until source ownership is proven.
- Prefer owner contribution boundaries over central branching when the spec already assigns a package or feature owner.
- Do not change generated React/Vue output merely to satisfy taxonomy naming; preserve supported product behavior unless the task explicitly changes it.

## Handoff Output

When handing work back, include:

```markdown
## Source-Map Fix Summary

- Generated symptom:
- Classification:
- Durable owner changed:
- Why this owner controls the symptom:
- Fix shape:
- Affected generated surfaces:
- Verification run:
- Generated-output evidence after fix:
- Audit/report boundary:
- Knowledge sync judgment:
- Residual risk:
```

For unresolved ambiguity, include the exact generated locator or command surface, owners inspected, evidence for and against each owner, and the next safest inspection target.

## Knowledge Sync

After a source fix, make an explicit `yume-docs-spec-sync` judgment:

- Update `.trellis/spec/` when the fix creates or changes a durable rule for templates, owners, manifest policy, verification gates, generated target paths, dependency policy, or CLI/generated behavior.
- Update `.trellis/user/` only when humans need new project context, supported-scope information, reading-order guidance, or operational instructions.
- Usually no spec or user-doc update is needed for a skill-only change or a fix that follows existing contracts.

## Success Criteria

The skill succeeds when the final change is made in durable generator source, the generated-output symptom is reproduced or cited from a reliable audit handoff, ownership is proven rather than guessed, verification covers the affected generated surface, and the final handoff preserves the distinction between audit/report evidence and source-fixing work.
