# Generation Model

> Product scope, config taxonomy, presets, and create spec contracts.

---

## Scope

This layer covers how user intent becomes a scaffold generation model: presets, prompts, `ProjectConfig`, create spec decode/export, and supported project kinds.

## Supported Scope

Current generated scaffold capabilities:

- React standalone app.
- Vue standalone app.
- pnpm workspace root.
- Node standalone app with `framework: none`.
- CLI tool with `toolkit: none` or `toolkit: effect`; default is `none`.
- Standalone library package with `runtime: neutral` or `runtime: node`; default is `neutral`.
- Structured workspace child package generation:
  - `frontend-app`, `backend-app`, and `cli-tool` under `apps/*`.
  - `library-package` under `libs/*`.

Out of scope:

- Existing-project append/update.
- Worker app materialization.
- Remote templates.
- Plugin or pluggable template sources.
- Full CLI flag or interactive UX for arbitrary workspace package graphs.

## Core Taxonomy

```text
type GenerationShape = 'standalone' | 'workspace'
type GenerationPackageKind =
  | 'frontend-app'
  | 'backend-app'
  | 'worker-app'
  | 'cli-tool'
  | 'library-package'
type GenerationRuntime = 'browser' | 'node' | 'neutral'
type CliToolkit = 'none' | 'effect'

interface CliProjectConfig {
  readonly type: 'cli'
  readonly language: 'typescript'
  readonly toolkit?: CliToolkit
}
```

Runtime rules:

- `frontend-app` -> `browser`.
- `backend-app`, `worker-app`, and `cli-tool` -> `node`.
- `library-package` -> `neutral` or `node`; default is `neutral`.

## CLI Contracts

| Input | Contract |
| --- | --- |
| `--preset <preset> --name <target>` | Simple non-interactive input for common scaffolds. |
| `--spec <file-or-json> --name <target>` | Structured input for complex workspace package graphs. |
| `--no-input` | Requires complete preset/name or spec/name input and does not prompt. |
| `--print-spec` | Prints resolved create spec and exits; it is not a dry-run JSON API. |
| `--dry-run` | Builds normal `PlanSpec` preview and does not write files, create target dirs, or execute commands. |

Interactive custom creation may expose curated workspace starter layouts after the `workspace-root` project type is selected:

- Empty pnpm workspace root.
- CLI-focused workspace with `apps/cli` and `libs/core`.
- React fullstack workspace with `apps/web`, `apps/api`, and `libs/shared`.
- Vue fullstack workspace with `apps/web`, `apps/api`, and `libs/shared`.

These curated layouts must reuse the same package graph builders as their preset equivalents. Arbitrary workspace package graph editing remains a `--spec` responsibility, not a prompt flow.

## CLI Toolkit Tracks

`CliProjectConfig.toolkit` selects the generated CLI runtime style:

- `toolkit: "none"` is the dependency-light default.
- `toolkit: "effect"` is an explicit opt-in Effect CLI track.
- Omitted toolkit values decode to `none` for backward compatibility.
- Presets `standalone-cli-minimal` and `cli-minimal` resolve to `toolkit: "none"`.
- Presets `standalone-cli-effect` and `cli-effect` resolve to `toolkit: "effect"`.
- Preset `standalone-cli-full` resolves to `toolkit: "effect"` with full code-quality defaults.
- Preset `workspace-cli-library` generates an Effect CLI package at `apps/cli` and a neutral library at `libs/core`, with an explicit `workspace:*` link from CLI to core.
- `projectConfigToCreateSpec` and `createSpecToProjectConfig` must preserve the toolkit value.
- Workspace CLI packages carry `spec.cli.toolkit` into the package-local `CliProjectConfig`.

## Preset Package Graphs

- `workspace-cli-library` resolves to package ids `cli` and `core`, materializing `apps/cli` and `libs/core`.
- `workspace-fullstack-react` and `workspace-fullstack-vue` resolve to package ids `web`, `api`, and `shared`, materializing `apps/web`, `apps/api`, and `libs/shared`.
- Workspace preset internal dependencies are explicit package spec links and must emit `workspace:*`; do not infer links from every package in the graph.
- `standalone-library-minimal` resolves to a neutral standalone library package.
- `standalone-library-node` resolves to a Node-runtime standalone library package.
- `standalone-backend-full` and `standalone-cli-full` use the same full code-quality policy as other full presets.
- No worker preset may be exposed until worker templates and generated smoke coverage exist.

## Good/Base/Bad Cases

Good:

```text
// Structured workspace input enters the same workflow.
decodeCreateSpec(input)
  -> createSpecToProjectConfig(spec, targetName)
  -> previewProject(projectConfig)
```

Base:

```typescript
composeProjectConfigFromPreset({ preset: 'standalone-cli-minimal', name })
```

Effect CLI:

```typescript
composeProjectConfigFromPreset({ preset: 'standalone-cli-effect', name })
```

Workspace CLI Library:

```typescript
composeProjectConfigFromPreset({ preset: 'workspace-cli-library', name })
```

Bad:

```typescript
// Do not let create spec bypass planner/template/package contribution paths.
writeWorkspaceFilesDirectly(decodedSpec)
```

## Tests Required

- Schema tests for new or changed project/config fields.
- CLI args tests for input combinations and error messages.
- Create spec round-trip/export tests for `--print-spec`.
- Planner/preview tests proving generated behavior remains routed through `PlanSpec`.
- Preset and structured spec tests for every CLI toolkit track.

## Forbidden Patterns

- Do not describe `node` as the top-level user-facing project choice; it is a runtime/platform dimension.
- Do not expose `worker-app` as generated until templates and tests exist.
- Do not change React/Vue output merely to fit taxonomy naming.
