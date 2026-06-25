# @sayoriqwq/prelude

@sayoriqwq/prelude is a focused local project scaffolding CLI.

It currently supports generating:

- React and Vue standalone apps
- TypeScript ESM Node apps
- TypeScript ESM CLI tools
- TypeScript ESM library packages
- pnpm workspace roots
- structured workspace package graphs with `apps/*` and `libs/*` packages

The project is intentionally not a general-purpose template platform yet. Existing project append/update, worker apps, remote templates, and pluginized template sources are planned for later versions rather than the first public release.

## Quick Start

After the package is published, run:

```bash
pnpm dlx @sayoriqwq/prelude --preset standalone-react-full --name my-app
```

For CI or agent-driven generation, use complete non-interactive input:

```bash
pnpm dlx @sayoriqwq/prelude --preset standalone-cli-minimal --name my-tool --no-input
```

Preview the generation plan without writing files:

```bash
pnpm dlx @sayoriqwq/prelude --preset workspace-cli-library --name my-workspace --dry-run
```

Use structured JSON for custom workspace package graphs:

```bash
pnpm dlx @sayoriqwq/prelude --spec prelude.json --name my-workspace --no-input
```

## Common Presets

- `standalone-react-minimal`
- `standalone-react-full`
- `standalone-vue-minimal`
- `standalone-vue-full`
- `standalone-backend-minimal`
- `standalone-backend-full`
- `standalone-cli-minimal`
- `standalone-cli-effect`
- `standalone-cli-full`
- `standalone-library-minimal`
- `standalone-library-node`
- `workspace-root-minimal`
- `workspace-cli-library`
- `workspace-fullstack-react`
- `workspace-fullstack-vue`

Compatibility aliases such as `react-full`, `vue-full`, `workspace-root`, `node-minimal`, `cli-minimal`, and `cli-effect` are still accepted.

## Local Development

```bash
pnpm install
pnpm --filter @sayoriqwq/prelude build
node apps/cli/dist/index.js --help
```

Release confidence checks live in the repository root:

```bash
pnpm verify
pnpm --filter @sayoriqwq/prelude smoke:generated
pnpm --filter @sayoriqwq/prelude smoke:examples
```

`smoke:generated` and `smoke:examples` run the same canonical generated
project check. They generate into a system temporary directory, print the target
path, and keep the generated project for inspection. After a stable commit has
passed smoke, do not rerun smoke again unless code, docs that affect the
contract, or the harness/package baseline changes.
