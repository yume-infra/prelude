---
name: yume-docs-spec-sync
description: "`@sayoriqwq/prelude` knowledge synchronization workflow. Use when Codex changes or reviews `@sayoriqwq/prelude` behavior, generated scaffold scope, architecture, package roles, verification rules, CLI UX, templates, presets, or project onboarding and must decide whether `.trellis/spec/`, `.trellis/user/`, both, or neither need updates."
---

# @sayoriqwq/prelude Docs/Spec Sync

Use this skill to make an explicit `@sayoriqwq/prelude` knowledge-sync judgment after implementation, review, or release-readiness work. The goal is not to update every document; the goal is to keep durable project knowledge in the right place.

## Source Of Truth

- `.trellis/spec/` is agent-facing executable knowledge: contracts, boundaries, verification matrices, generated-output rules, package responsibilities, and implementation constraints.
- `.trellis/user/` is human-facing Simplified Chinese project context: project map, reading order, architecture notes, supported scope, and common pitfalls.
- `docs/` is not a project knowledge source of truth in this repository.
- Do not mirror every spec change into user docs. Update user docs only when humans need the context to understand, navigate, or operate the project.

## Workflow

1. Inspect the changed surface before deciding.
   - Run `git status --short`.
   - Inspect the diff or changed files.
   - Identify whether the change affects runtime behavior, generated output, templates, package manifests, CLI UX, verification, dependencies, project architecture, or only task/session metadata.

2. Read the relevant prelude spec index before making a judgment.
   - Always consider `.trellis/spec/prelude/repository/index.md`.
   - Read `.trellis/spec/prelude/verification/index.md` when verification rules, checks, generated smoke, or release gates are involved.
   - Read the matching layer index when the change touches a specific surface: `cli-runtime`, `generation-model`, `template-system`, `workspace-packages`, `effect`, or `repository`.
   - Read `.trellis/spec/guides/index.md` for shared thinking triggers when the change spans multiple surfaces.

3. Classify the knowledge impact.
   - **Spec update needed** when the change creates or changes an executable rule future agents must follow: supported scope, schema contracts, generated target paths, verification commands, template ownership, dependency policy, CLI behavior, or forbidden patterns.
   - **User doc update needed** when the change affects how a human should understand the project: current supported product surface, package map, reading order, operational commands, architecture shape, onboarding notes, or recurring pitfalls.
   - **Both needed** when a behavior change has both an implementation contract and a human-facing product/project explanation.
   - **Neither needed** when the change only follows existing contracts, affects local task bookkeeping, changes tests without changing policy, or makes an implementation-only fix already covered by current specs.

4. If an update is needed, name the target before editing.
   - For `.trellis/spec/`, name the layer and the contract being changed.
   - For `.trellis/user/`, name the human-facing page and why a human would need it.
   - Use `trellis-update-spec` when the task is to actually capture new durable knowledge.

5. Verify the knowledge-only surface.
   - For skill/spec/user-doc-only changes, do a manual cold read.
   - Run targeted validation when available, such as skill validation for skill changes.
   - Use `.trellis/spec/prelude/verification/index.md` if the changed surface reaches code, templates, generated output, or verification behavior.

## Judgment Template

Include this judgment in the task PRD, final notes, or review summary:

```markdown
## Knowledge Sync Judgment

- `.trellis/spec/` update: yes/no
  - Target:
  - Reason:
- `.trellis/user/` update: yes/no
  - Target:
  - Reason:
- Existing contract followed:
- Verification:
- Residual risk:
```

## Common Decisions

- New or changed generated scaffold behavior usually needs a spec update; it also needs a user doc update if supported scope or operator guidance changed.
- New verification command, smoke selector, or release gate usually needs `.trellis/spec/prelude/verification/` guidance.
- New project-local workflow skill usually does not require `.trellis/user/` unless it changes how humans navigate the project; it may require spec updates only if it changes durable repository rules.
- Dependency freshness changes follow existing repository and verification contracts unless they introduce a new policy or command.
- Task PRDs, archived notes, and session journals are not stable project knowledge by themselves.
