# 生成脚手架说明

## 当前支持范围

Create Yume 当前支持这些本地 scaffold：

- React standalone app
- Vue standalone app
- pnpm workspace root
- Node standalone app
- CLI tool
- 结构化 workspace package 生成

workspace child package 当前规则：

- `frontend-app`、`backend-app`、`cli-tool` 进入 `apps/*`。
- `library-package` 进入 `libs/*`。
- 内部依赖必须显式声明，生成时写入 `workspace:*`。

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
```

结构化 spec：

```bash
node apps/cli/dist/index.js --spec create-yume.json --name my-workspace --no-input
```

dry run：

```bash
node apps/cli/dist/index.js --preset standalone-cli-minimal --name my-tool --dry-run
```

`--dry-run` 展示 `PlanSpec` 中的文件、post-generate commands 和 file actions，但不会创建目标目录、写文件或执行命令。

`--print-spec` 只输出 resolved create spec，方便复用交互或 preset 结果；它不是 dry-run preview。
