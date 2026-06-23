<overview>
This reference captures `@sayoriqwq/prelude`-specific generated quality boundaries established across M005 S01-S04. It should be read with `classification-vocabulary.md` before producing or updating generated scaffold audit reports.
</overview>

<preset_boundaries>
<supported_scope>
The current @sayoriqwq/prelude generated scaffold scope includes React, Vue, Node backend, CLI, library, workspace root, and structured workspace child packages. Audit reports should stay within supported generated surfaces and should not introduce worker scaffolds, remote template sources, plugin systems, or incremental updates to existing projects.
</supported_scope>

<full_preset_policy>
React and Vue full presets are lint-enabled. Generated full projects should install, build, and run `pnpm lint --max-warnings=0` with zero errors and zero warnings. When full-preset lint fails, classify the symptom before assigning an owner.
</full_preset_policy>

<minimal_preset_policy>
React and Vue minimal presets intentionally remain build-only. They should build successfully, but absence of lint scripts, ESLint config, or lint dependencies is not a source lint failure. If a future requirement changes this policy, cite that requirement or decision explicitly before treating minimal presets as lint-enabled.
</minimal_preset_policy>

<linked_smoke_policy>
Linked smoke proves the real linked bin/bootstrap path, not only the built CLI entrypoint. When linked examples build but later lint fails, classify that as a smoke or gate-design finding plus any generated-output findings exposed by the lint command.
</linked_smoke_policy>

<publishable_package_policy>
Node, CLI, and library outputs are dist-backed packages. Build success, typecheck success, and CLI bin invocation do not prove npm publishability. When these surfaces are audited for release or package quality, inspect generated `exports`, `main`, `types`, `files`, and lifecycle scripts, then remove `dist` in a disposable generated target and run `pnpm pack --dry-run` from the package directory. The pack evidence must show `prepack` rebuilding artifacts and the dry-run tarball containing `dist/index.js` and `dist/index.d.ts`. Code-quality scaffolds should not leave `scripts.prepare = "husky"` in publishable generated manifests.
</publishable_package_policy>
</preset_boundaries>

<quality_vocabulary>
Use these known issue families when reading command output:

- **Template whitespace**: missing EOF newline, incorrect indentation, trailing spaces, import-order formatting, missing trailing commas, JSX wrapping, Vue template indentation, Vue style-block newline shape.
- **Unused imports/dead code**: generated framework branches that import components or symbols not used by the selected preset.
- **Framework lint semantics**: React Refresh route-module semantics, Vue template line-break rules, or similar framework-aware lint rules.
- **Generated config policy**: package manifest ordering, TypeScript config ordering, generated lint scripts, generated ESLint config policy, or smoke-gate shape.
- **Package publishability**: missing `prepack`, missing `exports`, bad `files`, tarball contents missing `dist`, or lifecycle-script noise that affects npm packing/publishing.
- **Dependency/build warning**: Tailwind/lightningcss warnings during `pnpm build` even when build exits 0.
- **Editor-only diagnostics**: optional first-open DX signals that supplement, but do not replace, build and lint commands.
</quality_vocabulary>

<known_handoffs>
S01 produced the baseline evidence and source map. S02 consumed mechanical template whitespace, Vue unused import, and generated style issues. S03 closed strategy decisions around React Router static imports, package/tsconfig JSON order, minimal-preset build-only policy, and Tailwind/lightningcss warning separation. S04 upgraded generated smoke so full presets run build plus `pnpm lint --max-warnings=0`, while minimal presets remain build-only.
</known_handoffs>

<source_map_guidance>
Start from the generated file or command surface and then assign ownership:

- Files under generated `src/**`, `vite.config.ts`, `eslint.config.mjs`, `README.md`, `.vscode/settings.json`, or Vue SFCs usually map to template fragments or partials.
- `package.json` scripts, dependency sets, and manifest ordering usually map to package policy or JSON mutation code.
- `package.json` publish fields, `prepack`, `prepare`, and `pnpm pack --dry-run` tarball contents usually map to package policy, publishability policy, lifecycle policy, or workspace bootstrap.
- `tsconfig*.json` ordering can map to JSON templates or broader generated config policy; report the ambiguity if policy is not already settled.
- Missing `lint` scripts and malformed command errors map to command/tooling surfaces, not generated source files.
- Tailwind/lightningcss warning output maps to dependency/build-warning policy, generated CSS entry, or Vite/Tailwind integration strategy.
</source_map_guidance>

<reporting_boundaries>
Audit output should include command status and sanitized excerpts, but it should not require future agents to read ignored generated workspaces. Do not include secrets, absolute user paths, package manager caches, or full environment dumps. Replace repository roots, temporary directories, and home directories with stable placeholders such as `<repo>`, `<tmp>`, and `<home>`.
</reporting_boundaries>

<validation_expectations>
A complete generated quality audit must state which preset or linked path was checked, which commands were run, which checks passed or failed, how warnings differ from errors, whether publishable package checks were applicable, and which downstream owner should consume each finding. Reports should include negative-test handling for missing scripts, malformed outputs, timeouts, absent generated files, missing pack evidence, and ambiguous owners.
</validation_expectations>
