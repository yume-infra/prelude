# Directory Structure

> How backend-like CLI runtime code is organized in `create-yume`.

---

## Overview

`create-yume` is a TypeScript CLI package, not a server backend. Treat "backend" guidelines here as the runtime, planning, filesystem, command, schema, and orchestration code under `apps/cli/src/`.

The current product boundary only supports React and Vue project scaffolds. Do not add Node project scaffolds, remote templates, plugin sources, or incremental updates to existing projects unless the product boundary documents change first.

## Directory Layout

```text
apps/cli/
  src/
    brand/                 branded string/value constructors
    config/                app-level Effect config service
    constants/             package/config metadata and paths
    core/
      adapters/            small adapters for JSON and prompts
      commands/            CLI command composition helpers
      modifier/            package.json and manifest mutation helpers
      owners/              capability owners such as router and state-management
      ownership/           ownership model and contribution tracing
      questions/           prompt collection and preset composition
      services/            Effect services and plan execution
      template-registry/   React/Vue/shared template registrations
    schema/                Effect Schema contracts and decoders
    utils/                 narrow helpers and type guards
  tests/                   Vitest, snapshots, generated smoke scripts
  templates/               Handlebars fragments, partials, and static assets
  dist/index.js            built CLI entrypoint
```

## Module Organization

- Keep stable execution core in `core/services`: `PlanService`, `PlanSpec`, `TemplateEngineService`, `FsService`, and plan rollback semantics are treated as preserved core.
- Put feature ownership in owner modules, not scattered conditionals. `core/owners/router.ts` and `core/owners/state-management.ts` own package contributions, template entries, and capability predicates.
- Keep family-specific scaffold wiring in `core/template-registry/react.ts`, `core/template-registry/vue.ts`, and shared frontend behavior in `core/template-registry/frontend-app.ts`.
- Put external boundary adapters in `core/adapters/` and keep service APIs domain-shaped.
- Tests live only in `apps/cli/tests/`; mirror source paths for unit tests and use root-level specs/smoke scripts for generated scaffold contracts.

## Naming Conventions

- File names are kebab-case: `template-engine.ts`, `package-json-order.ts`, `project-config.ts`.
- Branded value constructors use `make*` names, for example `makeTemplatePath`, `makeProjectName`, and `makeTargetDir`.
- Effect services use `FooService` classes extending `Effect.Service` plus exported live aliases such as `CommandLive` and `FsLive`.
- Schema files export both schema values and decoder/formatter helpers, for example `ProjectConfigSchema`, `decodeProjectConfig`, and `formatProjectConfigError`.

## Examples

- `apps/cli/src/core/services/command.ts`: wraps platform command execution behind `CommandService` and maps failures to a domain error.
- `apps/cli/src/core/services/plan/apply.ts`: applies generated plan tasks with path validation, duplicate target rejection, and rollback.
- `apps/cli/src/core/template-registry/frontend-app.ts`: composes shared frontend templates before family-specific React/Vue entries.
- `apps/cli/tests/core/services/command.test.ts`: mirrors the service path and tests the Effect service boundary through explicit layers.

## Forbidden Patterns

- Do not put tests in `apps/cli/src/`.
- Do not add server/API/database folders to this package; it is a scaffold CLI.
- Do not bypass owner modules by adding router or state-management package mutations directly in unrelated template registry files.
- Do not move generated template files into runtime source modules; `src` plans work, `templates` contains user-visible scaffold output.
