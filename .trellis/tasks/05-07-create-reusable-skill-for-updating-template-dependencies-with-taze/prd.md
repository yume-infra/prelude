# Create Reusable Skill For Updating Template Dependencies With Taze

## Goal

Create a project-local Codex skill that makes generated-template dependency maintenance repeatable: trigger the skill, use `taze` to detect stale dependency versions in representative generated package manifests, update the generator source versions, and verify the generated templates still work.

## What I Already Know

- The user wants to update generated template project dependencies with `taze`.
- Template dependency ranges are not stored as static template `package.json` files; they are contributed through TypeScript package manifest owners and workspace bootstrap constants.
- Directly running `taze` against `apps/cli/templates/` is insufficient because the real manifests only exist after generation or manifest collection.
- The skill should be reusable and first-version friendly because the user expects future refinement.

## Requirements

- Add a project-local skill under `.agents/skills/` so future sessions can discover and evolve it with the repository.
- Keep `SKILL.md` concise and include the trigger/check/update/verify workflow.
- Bundle a deterministic script that can:
  - materialize representative generated package manifests into a temporary probe workspace,
  - run installed `taze` against those generated manifests,
  - update source dependency literals when `--write` is requested,
  - leave normal repo verification to the agent after the scripted update.
- Preserve create-yume's source-of-truth rule: fix generator source files, not committed generated smoke output.
- Validate the skill structure with `quick_validate.py`.

## Acceptance Criteria

- [x] `.agents/skills/update-template-deps/SKILL.md` has valid skill frontmatter and workflow instructions.
- [x] `.agents/skills/update-template-deps/scripts/update_template_deps.py` exists and supports check/update modes.
- [x] The script uses `taze` on generated/probe package manifests rather than guessing registry versions itself.
- [x] The script can update known generator dependency source files for the first supported version-literal shape.
- [x] Skill validation passes.

## Definition Of Done

- Spec/user doc sync has been considered.
- A representative dry-run/check validates the script can produce taze probe output.
- The user gets a clear assessment of direct implementation versus skill-based workflow.

## Out Of Scope

- Perfectly handling every future generator storage pattern.
- Committing generated smoke output.
- Adding scheduled automation.
- Replacing repository dependency maintenance scripts.

## Technical Notes

- Relevant specs: repository, template-system, verification.
- First version should focus on version literals in `apps/cli/src/core/owners/*.ts`, `apps/cli/src/core/workspace-bootstrap.ts`, and `apps/cli/src/core/package-manager.ts`.
- Assessment: direct taze over template sources is not reliable because generated manifests are produced by TypeScript package manifest contributions, not static template `package.json` files. The reusable skill path is required for a durable workflow.
- Implemented `.agents/skills/update-template-deps` with a `taze` probe script that supports `--mode check` and `--mode update`.
- Ran the skill script to update generated template dependency literals and generated pnpm package manager metadata.
- Updated generated package `engines.node` to `>=22.22.1` after taze node compatibility output showed latest generated tooling requires Node 22.x.
- Verification: `python3 /Users/sayori/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/update-template-deps`, `python3 .agents/skills/update-template-deps/scripts/update_template_deps.py --mode check --no-force`, `pnpm --filter create-yume test -- package-json workspace-root planner`, `pnpm --filter create-yume typecheck`, and `pnpm verify` passed.

## Phase 3.3 Knowledge Sync

- `.trellis/spec/` update needed: yes. Added generated package engine compatibility guidance to the template-system package manifest contract.
- `.trellis/user/` update needed: yes. Added the current generated Node.js engine floor to generated scaffold notes.
