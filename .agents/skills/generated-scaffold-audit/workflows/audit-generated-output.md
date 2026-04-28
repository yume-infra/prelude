<required_reading>
Read these files before changing audit logic, templates, or generated-project gates:

- `references/classification-vocabulary.md`
- `references/create-yume-generated-quality.md`
- `templates/audit-report.md` when producing the final handoff
- `docs/working/phase2/generated-scaffold-quality.md`
- `docs/working/phase2/generated-scaffold-audit-baseline.md`
- Existing generated scaffold tests under `apps/cli/tests/` that mention generated smoke, generated lint strategy, or generated template cleanliness.
</required_reading>

<process>
<step number="1" name="Start from generated output">
Generate or inspect real create-yume React and Vue scaffold output before reading templates or assigning blame. Treat generated files as the user-visible product and avoid starting from implementation structure, because Handlebars branches, JSON mutation, package policy, and generated dependencies can combine in ways templates alone do not reveal.
</step>

<step number="2" name="Run verification commands">
Run the generated project commands that match the preset policy. Full lint-enabled presets must run build and `pnpm lint --max-warnings=0`; minimal presets remain build-only unless a later strategy decision changes their lint policy. Record the exact command, working target, exit code, timeout status, and pass/fail verdict for every check.
</step>

<step number="3" name="Preserve evidence without mutating generated projects">
Capture concise, sanitized output excerpts that show the failure family and file or command surface. Do not use `eslint --fix` as the durable remediation path. Temporary auto-fix may be used only as an exploratory diff to understand expected formatting, and final remediation must still map back to templates, partials, JSON/config mutation, package policy, lint strategy, or dependency/build-warning owners.
</step>

<step number="4" name="Classify findings with durable vocabulary">
Classify each finding using `references/classification-vocabulary.md`: `template whitespace`, `unused imports / dead code`, `framework lint semantics`, `generated config policy`, `dependency/build warning`, or `editor-only diagnostics`. Keep build warnings separate from lint failures; Tailwind/lightningcss build warnings are not `lint --max-warnings=0` failures.
</step>

<step number="5" name="Source-map after the symptom is clear">
Only after the generated symptom is documented, trace likely durable owners. Use generated-file locators when lint output names a generated file. Use command/tooling surfaces when the evidence has no generated source locator, such as missing `lint` scripts or Tailwind/lightningcss warnings. Map ownership to template fragments, partials, JSON/config mutation, package policy, lint strategy, dependency/build-warning policy, or smoke/build gate design.
</step>

<step number="6" name="Handle negative and ambiguous cases explicitly">
For malformed command output, absent files, missing scripts, unknown exit-code shapes, or ambiguous generated-file owners, document what is known and do not invent precise template paths. If an owner is split between a fragment and a partial, name both and identify the first inspection target.
</step>

<step number="7" name="Write the report handoff">
Read `templates/audit-report.md`, copy its structure, and fill every section with command evidence, sanitized excerpts, classifications, source-map ownership, downstream ownership, negative-test handling, and requirement or decision coverage. The report must let a future agent localize failures without reading ignored generated projects.
</step>
</process>

<success_criteria>
The workflow is complete when audit evidence comes from tracked project files or real generated output, React and Vue scaffold vocabulary is preserved, full-preset `lint --max-warnings=0` evidence is separate from build warnings, minimal presets remain build-only, downstream source-map owners are named without overclaiming, and the report captures enough diagnostics for another agent to continue from command evidence rather than assumptions.
</success_criteria>
