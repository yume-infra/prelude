# 协作与验证说明

## 常用命令

```bash
pnpm build
pnpm --filter create-yume build
pnpm --filter create-yume test
pnpm --filter create-yume typecheck
pnpm verify
pnpm smoke:examples
```

## 验证怎么选

只改 `.trellis/user/` 或 `.trellis/spec/` 时，重点做人工冷读和相关文档 contract 测试。

改模板、registry、planner、schema、CLI args 或 generated output 时，按 `.trellis/spec/create-yume/verification/index.md` 选择最低验证命令。

不确定影响面时，直接跑：

```bash
pnpm verify
```

## 提交约定

仓库使用 conventional commits：

```bash
git commit -m "docs: align trellis source of truth"
git commit -m "fix: keep package manifest scope filtering stable"
```

常用类型：

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`

## 依赖约定

外部依赖版本优先进入 pnpm catalog。不要在多个 package manifest 中分散维护同一依赖版本。

workspace 内部依赖要显式声明；生成的 workspace child package 只会为声明过的内部依赖写入 `workspace:*`。
