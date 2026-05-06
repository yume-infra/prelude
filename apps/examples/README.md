# 示例项目

`apps/examples/.generated/` 专门用于存放本地 generated smoke 验证生成物。

从仓库根目录运行 generated examples smoke：

```bash
pnpm smoke:examples
```

该 smoke 会生成代表性的 preset / workspace 项目，安装依赖，并构建生成后的项目。成功后生成物会保留在 `.generated/`，方便检查。

慢 smoke 不需要每次全跑；只改某类模板或生成逻辑时，用 `CREATE_YUME_SMOKE_CASES` 选择相关 case：

```bash
CREATE_YUME_SMOKE_CASES=react pnpm smoke:examples
CREATE_YUME_SMOKE_CASES=cli,library pnpm smoke:examples
CREATE_YUME_SMOKE_CASES=workspace pnpm smoke:examples
```
