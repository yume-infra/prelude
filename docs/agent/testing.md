# 测试组织约束

## 目录边界

1. 所有 CLI 测试统一放在 `apps/cli/tests/` 下。
2. `apps/cli/src/` 只放运行时代码，不再放置 `*.test.ts` 或 `*.spec.ts`。
3. 测试辅助工具、fixture、mock layer 统一放在 `apps/cli/tests/support/` 下。
4. 测试快照保留在 Vitest 默认快照目录，即对应测试文件同级的 `__snapshots__/` 下。

## 命名规则

1. 单元或契约测试使用 `*.test.ts`。
2. 面向 planner、template render 等输出快照的测试可以使用 `*.spec.ts`。
3. smoke 脚本使用描述性文件名，例如 `generated-projects.smoke.ts`，并由专门脚本调用。
4. 需要验证真实 CLI bin、全局 link 或 monorepo 内示例生成时，使用 `linked-examples.smoke.ts`，生成物固定放在 `apps/examples/.generated/`。

## 路径组织

1. 从 `src` 迁出的测试按源码路径在 `tests` 下镜像组织：
   - `src/core/services/template-engine.ts` 的测试放在 `tests/core/services/template-engine.test.ts`。
   - `src/schema/cli-args.ts` 的测试放在 `tests/schema/cli-args.test.ts`。
2. 跨模块的 planner、template render、rollback 等测试允许直接放在 `apps/cli/tests/` 根层。
3. 不为了目录纯度移动已有 snapshot 测试；只有当测试职责发生变化时才调整位置。

## TypeScript 与编辑器

1. `apps/cli/tsconfig.json` 必须 include `tests/**/*`，保证编辑器 LSP 与命令行 `typecheck` 看到同一批测试文件。
2. `apps/cli/tsconfig.build.json` 必须继续只 include `src/**/*`，构建与声明产物不包含测试。
3. 如果编辑器出现 `Cannot find module 'vitest'`，优先检查 pnpm workspace symlink 是否失效，再运行 `pnpm --dir apps/cli install --offline --force` 重新生成链接。

## 验证要求

涉及测试目录、测试类型或 TypeScript 配置的改动，最低验证为：

```bash
pnpm --filter create-yume typecheck
pnpm --filter create-yume test
pnpm lint
```

若同时影响构建配置或不确定影响面，直接运行：

```bash
pnpm verify
```

涉及 CLI 发布入口、bin link、模板依赖安装或生成项目可运行性时，额外运行：

```bash
pnpm smoke:examples
```

S04 之后，真实生成项目 smoke 的质量门槛是 build + lint：`smoke:generated` 与 linked `smoke:examples` 都必须构建生成项目，并且只对 lint-enabled 生成项目运行 `pnpm lint --max-warnings=0`。minimal preset 仍是 build-only；不要把缺少 ESLint 配置或 lint script 当作 minimal preset 失败。
