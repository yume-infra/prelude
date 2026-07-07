# @sayoriqwq/prelude

@sayoriqwq/prelude is a focused local project genesis CLI.

It currently supports generating:

- React and Vue standalone apps
- TypeScript ESM Node apps
- TypeScript ESM CLI tools
- TypeScript ESM library packages
- pnpm workspace roots
- structured workspace package graphs with `apps/*` and `libs/*` packages

The active create API accepts a complete canonical `CreateSpec`. Reusable shapes
are stored as complete CreateSpec files, not preset names or compatibility
aliases.

## Quick Start

After the package is published, run:

```bash
pnpm dlx @sayoriqwq/prelude --spec ./prelude.create-spec.json --name my-app --no-input
```

For CI or agent-driven generation, use complete non-interactive input:

```bash
pnpm dlx @sayoriqwq/prelude --spec ./cli-tool.create-spec.json --name my-tool --no-input
```

Preview the generation plan without writing files:

```bash
pnpm dlx @sayoriqwq/prelude --spec ./workspace.create-spec.json --name my-workspace --dry-run --no-input
```

Use structured JSON for custom workspace package graphs:

```bash
pnpm dlx @sayoriqwq/prelude --spec prelude.json --name my-workspace --no-input
```

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
project check. They generate `canonical-worker` and `react-counter-app` under
`apps/examples/.generated/`, print the target paths, and keep the generated
projects for inspection. The generated directory is gitignored and contains a
local `pnpm-workspace.yaml` so the generated packages can install and build.
After a stable commit has passed smoke, do not rerun smoke again unless code,
docs that affect the contract, or the harness/package baseline changes.
