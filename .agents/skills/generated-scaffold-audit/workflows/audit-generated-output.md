<required_reading>
Read these files before changing audit logic, templates, or generated-project gates:

- `references/classification-vocabulary.md`
- `references/prelude-generated-quality.md`
- `templates/audit-report.md` when producing the final handoff
- `.trellis/spec/prelude/verification/generated-scaffold-audit.md`
- `.trellis/spec/prelude/verification/phase-roadmap.md`
- Existing generated scaffold tests under `apps/cli/tests/` that mention generated smoke, generated lint strategy, or generated template cleanliness.
</required_reading>

<process>
<step number="1" name="Start from generated output">
Generate or inspect real prelude scaffold output for the affected supported preset, create spec, or workspace package before reading templates or assigning blame. Treat generated files as the user-visible product and avoid starting from implementation structure, because Handlebars branches, JSON mutation, package policy, generated dependencies, lifecycle scripts, and workspace shape can combine in ways templates alone do not reveal.
</step>

<step number="2" name="Run verification commands">
Run the generated project commands that match the preset policy. Full lint-enabled presets must run build and generated `pnpm verify`; `verify` is required because it includes Knip/dependency usage checks that `lint --max-warnings=0` cannot catch. Minimal presets remain build-only unless a later strategy decision changes their lint policy. Node and CLI audits must include build and runtime/bin evidence when applicable. Record the exact command, working target, exit code, timeout status, and pass/fail verdict for every check.
</step>

<step number="3" name="Check publishable package contracts">
When the generated target is a dist-backed publishable package (`node`, `cli`, `library`, or a workspace `cli-tool`/`library-package` child), include package publishability evidence unless the audit scope explicitly excludes npm packaging. Inspect `package.json` for `exports`, `main`, `types`, `files`, and lifecycle scripts. In a disposable generated target or package-local copy, remove `dist` before running `pnpm pack --dry-run` from the package directory so the audit proves `prepack` rebuilds artifacts. For standalone packages, use `pnpm pack --dry-run --ignore-workspace` when needed to avoid the repository workspace boundary. If code-quality tools or Husky hooks are present, also verify a Git-enabled generated target or clone path: `pnpm verify` must not report `husky` as unused, fresh installs must have `core.hooksPath` set to `.husky/_`, and no-`.git` pack copies must not print Husky `.git` warnings. Record whether `prepack` ran, whether the dry-run tarball includes `dist/index.js` and `dist/index.d.ts`, and whether code-quality scaffolds avoided bare `scripts.prepare = "husky"` while still retaining a Knip-visible Husky script.
</step>

<step number="4" name="Preserve evidence without mutating generated projects">
Capture concise, sanitized output excerpts that show the failure family and file or command surface. Do not use `eslint --fix` as the durable remediation path. Temporary auto-fix, `dist` deletion, or package-copy mutation may be used only as exploratory proof in ignored or disposable generated targets, and final remediation must still map back to templates, partials, JSON/config mutation, package policy, lint strategy, publishability policy, lifecycle policy, or dependency/build-warning owners.
</step>

<step number="5" name="Classify findings with durable vocabulary">
Classify each finding using `references/classification-vocabulary.md`: `template whitespace`, `unused imports / dead code`, `framework lint semantics`, `generated config policy`, `package publishability`, `dependency/build warning`, or `editor-only diagnostics`. Keep build warnings separate from lint failures; Tailwind/lightningcss build warnings are not `lint --max-warnings=0` failures. Missing `prepack`, missing `exports`, bad `files`, tarballs without `dist`, or Husky-generated `prepare` noise are package publishability findings.
</step>

<step number="6" name="Source-map after the symptom is clear">
Only after the generated symptom is documented, trace likely durable owners. Use generated-file locators when lint output names a generated file. Use command/tooling surfaces when the evidence has no generated source locator, such as missing `lint` scripts, failed `pnpm pack --dry-run`, missing tarball artifacts, lifecycle-script noise, or Tailwind/lightningcss warnings. Map ownership to template fragments, partials, JSON/config mutation, package policy, publishability/lifecycle policy, lint strategy, dependency/build-warning policy, or smoke/build gate design.
</step>

<step number="7" name="Handle negative and ambiguous cases explicitly">
For malformed command output, absent files, missing scripts, unknown exit-code shapes, or ambiguous generated-file owners, document what is known and do not invent precise template paths. If an owner is split between a fragment and a partial, name both and identify the first inspection target.
</step>

<step number="8" name="Write the report handoff">
Read `templates/audit-report.md`, copy its structure, and fill every section with command evidence, sanitized excerpts, classifications, source-map ownership, downstream ownership, negative-test handling, and requirement or decision coverage. The report must let a future agent localize failures without reading ignored generated projects.
</step>
</process>

<success_criteria>
The workflow is complete when audit evidence comes from tracked project files or real generated output, supported scaffold vocabulary is preserved, full-preset `lint --max-warnings=0` evidence is separate from build warnings, minimal presets remain build-only, publishable package checks include pack evidence when in scope, downstream source-map owners are named without overclaiming, and the report captures enough diagnostics for another agent to continue from command evidence rather than assumptions.
</success_criteria>
