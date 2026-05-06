# Generated Scaffold Audit

> Durable quality vocabulary for output-first generated project audits.

---

## Scope

Generated scaffold quality starts from real generated output, not from template assumptions. Use the project-local `generated-scaffold-audit` skill for React and Vue preset audits, generated lint failures, smoke evidence, and source-map handoffs.

Skill entrypoint:

- `.agents/skills/generated-scaffold-audit/SKILL.md`

Future agents should not recreate the audit process from scratch; use the skill workflow and references.

## Preset Policy

- Full presets are lint-enabled and must preserve `lint --max-warnings=0`.
- Minimal preset lint policy must remain build-only.
- Tailwind/lightningcss messages are dependency/build warning evidence, not lint warnings.
- React Router static imports are a closed strategy boundary unless a real smoke failure appears.
- JSON ordering strategy is a closed strategy boundary unless a real smoke failure appears.

## Classification Vocabulary

Use these durable finding classes:

- `template whitespace`
- `unused imports / dead code`
- `framework lint semantics`
- `generated config policy`
- `dependency/build warning`
- `editor-only diagnostics`

Keep build warnings separate from lint failures.

## Source Map Owners

Map generated-output symptoms to durable owners only after command evidence is clear:

- template fragments
- partials
- JSON/config mutation
- package policy
- lint strategy
- dependency/build-warning policy
- smoke/build gate design

## Required Evidence

- Command, cwd, exit code, timeout status, and verdict.
- Sanitized output excerpts.
- Generated file path when available.
- Negative-test or ambiguity handling when ownership is split.

## Related Skill Contract

The generated scaffold audit skill must keep pointing to this spec. Its workflow required reading should include this file, `references/classification-vocabulary.md`, `references/create-yume-generated-quality.md`, and existing generated scaffold tests under `apps/cli/tests/`.
