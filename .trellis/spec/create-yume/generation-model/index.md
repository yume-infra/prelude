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

## CLI Toolkit Tracks

`CliProjectConfig.toolkit` selects the generated CLI runtime style:

- `toolkit: "none"` is the dependency-light default.
- `toolkit: "effect"` is an explicit opt-in Effect CLI track.
- Omitted toolkit values decode to `none` for backward compatibility.
- Presets `standalone-cli-minimal` and `cli-minimal` resolve to `toolkit: "none"`.
- Presets `standalone-cli-effect` and `cli-effect` resolve to `toolkit: "effect"`.
- `projectConfigToCreateSpec` and `createSpecToProjectConfig` must preserve the toolkit value.
- Workspace CLI packages carry `spec.cli.toolkit` into the package-local `CliProjectConfig`.

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
