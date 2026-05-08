<overview>
This reference defines the durable vocabulary for create-yume generated scaffold audits. Use these names consistently so audit reports can separate generated-output symptoms, durable source owners, and strategy-level decisions without re-litigating S01-S04.
</overview>

<classification_terms>
<term name="template whitespace">
Formatting, newline, indentation, trailing-space, import-order, comma, JSX wrapping, or Vue SFC block-shape failures that originate from emitted text. Typical owners are Handlebars templates, partials, static asset copies, or render normalization.
</term>

<term name="unused imports / dead code">
Generated code imports or emits symbols that are not used in the selected preset branch. Typical owners are framework fragments or capability-specific branches that should either remove the import or render matching usage.
</term>

<term name="framework lint semantics">
Lint rules that encode framework behavior rather than pure formatting, such as `react-refresh/only-export-components` or Vue template line-break semantics. These findings may be mechanical, but reports must preserve the possibility of a strategy decision when generated readability or framework conventions conflict.
</term>

<term name="generated config policy">
Failures caused by generated package manifests, TypeScript configs, lint scripts, smoke-gate definitions, or config ordering policies. Missing `lint` scripts are command/tooling surfaces, not source-file lint failures.
</term>

<term name="package publishability">
Failures that only appear when a generated dist-backed package is prepared for npm publication or consumption. Examples include missing `prepack`, missing or incomplete `exports`, `files` that include `dist` without ensuring `dist` exists, `pnpm pack --dry-run` tarballs without `dist/index.js` or `dist/index.d.ts`, and Husky lifecycle noise such as generated `scripts.prepare = "husky"` in publishable packages. Typical owners are package manifest contributions, publishability policy, lifecycle-script policy, workspace bootstrap, or generated smoke/package gates.
</term>

<term name="dependency/build warning">
Warnings emitted during successful build commands by dependencies or build tooling. Tailwind/lightningcss unknown at-rule output belongs here unless a later strategy decision reclassifies it; it must not be merged into lint-cleanliness evidence.
</term>

<term name="editor-only diagnostics">
Diagnostics observed only through an editor or LSP. They can improve first-open DX but are supplemental to command-line build and lint evidence. A lint failure in `.vscode/settings.json` is still generated-file lint evidence, not editor-only diagnostics.
</term>
</classification_terms>

<source_map_vocabulary>
Use these ownership labels when mapping a generated-output symptom to a durable owner:

- **Generated file locator**: a generated path from lint, build, or diagnostic output.
- **Command/tooling surface**: a failure or warning with no stable generated source file, such as a missing script, malformed command error, timeout, registry/tooling warning, or Tailwind/lightningcss build warning.
- **Template fragment**: a concrete `apps/cli/templates/fragments/**` file that owns emitted text.
- **Partial**: a reusable `apps/cli/templates/partials/**` file that may affect multiple generated files or branches.
- **JSON/config mutation**: generated JSON or config assembled through code rather than a single static template.
- **Package policy**: package manifest scripts, dependencies, package ordering, or preset-level dependency decisions.
- **Publishability policy**: generated package `exports`, `files`, `prepack`, tarball contents, lifecycle-script noise, or npm-pack behavior.
- **Lint strategy**: whether a preset should expose lint assets, which lint rule should apply, or whether a narrow override is acceptable.
- **Dependency/build-warning owner**: dependency version, Vite/Tailwind pipeline, generated CSS entry, or build-warning policy.
</source_map_vocabulary>

<boundary_rules>
- Output-first audit order is mandatory: generate or inspect real React/Vue output before editing templates.
- `eslint --fix` is never the durable remediation path. It may explain expected output but final fixes belong in templates, partials, config mutation, package policy, lint strategy, or dependency/build-warning policy.
- Full presets must preserve the zero-warning lint phrase `lint --max-warnings=0` when lint is enabled.
- Minimal presets remain build-only and must not be failed for lacking lint assets unless a later documented strategy changes their policy.
- Dist-backed generated packages must be audited with package publishability evidence when npm packaging is in scope; a successful build or bin invocation alone does not prove the package tarball contains built artifacts.
- Tailwind/lightningcss warnings are build-warning evidence, not lint warning evidence.
- Malformed locators and absent generated-file paths must be documented as command/tooling surfaces instead of assigned invented owners.
</boundary_rules>

<examples>
- `README.md` missing final newline: `template whitespace` → static README fragment or render normalization.
- `src/views/About.vue` imports `Counter` but never uses it: `unused imports / dead code` → Vue view fragment.
- React router module fails `react-refresh/only-export-components`: `framework lint semantics` → React router capability owner or lint strategy.
- `package.json` key ordering fails JSONC lint: `generated config policy` → package JSON mutation or package ordering policy.
- `pnpm pack --dry-run` succeeds but the tarball only contains `package.json` and `README.md`: `package publishability` → package manifest contribution or lifecycle-script policy.
- Generated full CLI has `prepare: husky` after install+git and pack prints `.git can't be found`: `package publishability` → workspace bootstrap lifecycle policy.
- `pnpm lint --max-warnings=0` exits because no `lint` script exists: command/tooling surface → minimal-preset package policy, not a generated file.
- Tailwind/lightningcss unknown at-rule warnings during successful build: `dependency/build warning` → Tailwind/Vite build policy, not lint failure.
</examples>
