# 示例项目

当前仓库不再维护持久的模板目录或 `.generated/` 示例目录。

`pnpm smoke:examples` 会把代表性项目生成到系统临时目录，完成断言后打印 target 路径并保留生成物。它验证的是当前 `CreateSpec -> Resolver -> Contributions -> Materializers -> WritePlan` 管线，而不是恢复旧的仓库内 `.generated/` 基线。

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
