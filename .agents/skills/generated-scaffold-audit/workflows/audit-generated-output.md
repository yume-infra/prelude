<required_reading>
Read these project files before changing audit logic or templates:

- `docs/working/phase2/generated-scaffold-quality.md`
- `docs/working/phase2/generated-scaffold-audit-baseline.md`
- Existing generated scaffold tests under `apps/cli/tests/` that mention generated smoke, generated lint strategy, or generated template cleanliness.
</required_reading>

<process>
1. Generate or inspect real create-yume React and Vue scaffold output before assigning blame to templates.
2. Run generated-project verification commands and record exact command evidence. For lint-enabled full presets, preserve the zero-warning lint gate as `lint --max-warnings=0`.
3. Classify each finding as generated-output symptom, template/source-map owner, package or config policy, dependency/build warning, or editor-only diagnostic.
4. Keep build warnings separate from lint failures. Tailwind or lightningcss build warnings are not the same evidence class as the generated lint gate.
5. Only after the generated symptom is documented, trace likely source files or policy surfaces and propose the smallest template or strategy change.
</process>

<success_criteria>
The workflow is complete when audit evidence comes from tracked project files or real generated output, React and Vue scaffold vocabulary is preserved, lint and build-warning findings stay distinct, and downstream agents can continue from command evidence plus source-map notes rather than assumptions.
</success_criteria>
