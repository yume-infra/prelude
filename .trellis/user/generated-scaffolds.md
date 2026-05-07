# 生成脚手架说明

## 当前支持范围

Create Yume 当前支持这些本地 scaffold：

- React standalone app
- Vue standalone app
- pnpm workspace root
- Node standalone app
- CLI tool
- standalone library package
- 结构化 workspace package 生成

CLI tool 有两个轨道：

- 默认 `toolkit: "none"`，保持依赖轻量。
- 显式 `toolkit: "effect"`，生成基于 `@effect/cli` 和 `NodeRuntime.runMain` 的 CLI 入口。

workspace child package 当前规则：

- `frontend-app`、`backend-app`、`cli-tool` 进入 `apps/*`。
- `library-package` 进入 `libs/*`。
- 内部依赖必须显式声明，生成时写入 `workspace:*`。
- workspace root 的 `test`、`lint`、`clean` 等聚合脚本只在 child package 实际生成对应脚本时出现。
- 空 workspace 只生成 root 基建，不放占位的 child orchestration script。
- 生成项目当前声明 Node.js `>=22.22.1`，用于匹配最新生成依赖的运行时要求。
- 生成项目默认带维护工具：root `package.json` 会包含 `knip`、`deps:check`、`deps:check:all`、`deps:fresh` 和 `verify` 脚本，并包含 Knip / Taze devDependency；Knip 额外生成 root-scoped `knip.jsonc`。
- standalone 项目的 Taze 脚本只检查当前 package；workspace root 的 Taze 脚本使用 `-r` 递归检查 workspace。

常用 workspace preset：

- `workspace-cli-library`：生成 `apps/cli` Effect CLI 和 `libs/core` neutral library，CLI 通过 `workspace:*` 依赖 core。
- `workspace-fullstack-react`：生成 `apps/web` React app、`apps/api` Node app 和 `libs/shared` neutral library。
- `workspace-fullstack-vue`：生成 `apps/web` Vue app、`apps/api` Node app 和 `libs/shared` neutral library。

## 当前不支持范围

- 对已有项目做 append/update。
- worker app 生成。
- 远程模板。
- 插件化模板来源。
- 完整 CLI flag 或交互式任意 workspace package graph 配置。

## CLI 常用输入

简单 preset：

```bash
node apps/cli/dist/index.js --preset standalone-react-full --name my-app
node apps/cli/dist/index.js --preset workspace-cli-library --name my-tool-workspace
node apps/cli/dist/index.js --preset standalone-library-minimal --name my-lib
```

结构化 spec：

```bash
node apps/cli/dist/index.js --spec create-yume.json --name my-workspace --no-input
```

dry run：

```bash
node apps/cli/dist/index.js --preset standalone-cli-minimal --name my-tool --dry-run
```

Effect CLI：

```bash
node apps/cli/dist/index.js --preset standalone-cli-effect --name my-effect-tool
node apps/cli/dist/index.js --preset standalone-cli-full --name my-full-effect-tool
```

`--dry-run` 展示 `PlanSpec` 中的文件、post-generate commands 和 file actions，但不会创建目标目录、写文件或执行命令。

`--print-spec` 只输出 resolved create spec，方便复用交互或 preset 结果；它不是 dry-run preview。
