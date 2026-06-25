# 示例项目

当前仓库不维护已提交的模板目录或已提交的生成示例基线。

`pnpm smoke:examples` 会把代表性项目生成到 `apps/examples/.generated/`，完成断言后安装并构建生成物，打印 target 路径并保留生成物。当前 smoke 会保留：

- `canonical-worker`: Effect harness / package baseline 检查目标。
- `react-counter-app`: 可渲染 React counter 检查目标。

`.generated/` 已被 gitignore；它是本地检查区，不是仓库基线。该目录会包含一个本地 `pnpm-workspace.yaml`，用于让生成项目里的 `catalog:` 依赖可以安装和构建。

稳定提交已经通过 smoke 后，如果工作树、生成逻辑、文档契约、harness/package baseline 都没有变化，不需要重复运行 smoke。

从仓库根目录运行：

```bash
pnpm smoke:examples
```

如果需要人工检查另一个可渲染结果，直接用 CLI 生成到你指定的目录：

```bash
pnpm build:cli
repo_root="$(pwd)"
mkdir -p /tmp/prelude-preview
cd /tmp/prelude-preview
node "$repo_root/apps/cli/dist/index.js" --spec '{"topology":"single-package","package":{"id":"app","name":"preview-app","capabilities":["react-app","react-counter"]},"rootCapabilities":["package-manager:pnpm","linting","knip"],"providers":[],"overrides":{}}' --name preview-app --no-input
```

生成物会出现在 `/tmp/prelude-preview/preview-app`。
