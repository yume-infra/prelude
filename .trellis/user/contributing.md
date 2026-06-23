# 协作与验证说明

## 常用命令

```bash
pnpm build
pnpm --filter @sayoriqwq/prelude build
pnpm --filter @sayoriqwq/prelude test
pnpm --filter @sayoriqwq/prelude typecheck
pnpm verify
pnpm smoke:dry-run
pnpm smoke:examples
```

`pnpm smoke:examples` 会把 generated scaffold 输出保留在 `apps/examples/.generated/`。如果只改了某类模板或生成链路，不需要全量跑慢 smoke，可以按影响面选择：

```bash
PRELUDE_SMOKE_CASES=react pnpm smoke:examples
PRELUDE_SMOKE_CASES=cli,library pnpm smoke:examples
PRELUDE_SMOKE_CASES=workspace pnpm smoke:examples
```

generated smoke 默认 `PRELUDE_SMOKE_CONCURRENCY=2`：生成阶段和安装后的 build/lint/bin 检查会限流并发，`pnpm install` 会串行执行，避免 `apps/examples/.generated/` workspace 的共享 lockfile 竞争。排查不稳定问题时可用 `PRELUDE_SMOKE_CONCURRENCY=1` 完全串行。

## 验证怎么选

只改 `.trellis/user/` 或 `.trellis/spec/` 时，重点做人工冷读和相关文档 contract 测试。

改模板、registry、planner、schema、CLI args 或 generated output 时，按 `.trellis/spec/prelude/verification/index.md` 选择最低验证命令。

不确定影响面时，直接跑：

```bash
pnpm verify
```

`pnpm verify` 会跑 build、test、lint 和 Knip。需要单独检查未使用文件、导出或依赖时，可以直接跑：

```bash
pnpm knip
```

依赖新鲜度检查不属于 `pnpm verify`，避免 registry 新版本让常规验证突然失败。需要看依赖是否落后时运行：

```bash
pnpm deps:check
pnpm deps:check:all
```

需要按 minor 范围更新依赖并应用 7 天成熟期时运行：

```bash
pnpm deps:fresh
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
