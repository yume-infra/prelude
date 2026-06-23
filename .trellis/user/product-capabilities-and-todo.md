# 产品能力清单与 TODO

## 这个文档的作用

这份文档用来防止 @sayoriqwq/prelude 的产品方向偏移：

- 先记录已经具备的能力。
- 再记录明确不支持或暂缓的能力。
- 最后把新的产品想法放进 TODO，后续再拆成 Trellis task、spec 或实现 PRD。

TODO 里的条目只是产品意图，不自动代表已承诺实现。进入实现前，需要再判断它是否应该改变 `.trellis/spec/` 的执行 contract。

## 当前产品定位

@sayoriqwq/prelude 是一个本地项目脚手架生成 CLI。它通过交互、preset 或结构化 spec 收集项目意图，构建 `PlanSpec`，再把模板、组合型文件、post-generate commands 和 post-generate file actions 物化到目标目录。

当前重点不是覆盖所有框架和模板来源，而是把一组清晰边界内的项目生成做稳、做可组合、做可验证。

## 已有能力

### CLI 输入与执行

- 交互模式创建项目。
- `--preset <preset> --name <target>` 非交互创建常见项目。
- `--spec <file-or-json> --name <target>` 通过结构化 create spec 创建复杂 workspace package graph。
- `--no-input` 用于 CI 或模型调用场景，输入不完整时明确失败，不进入 prompt。
- `--print-spec` 输出解析后的 create spec，方便复用交互或 preset 结果。
- `--dry-run` 预览 `PlanSpec`，不创建目录、不写文件、不执行命令。
- `--no-rollback` 在失败时保留现场，方便排查。

### Standalone scaffold

- React standalone app。
- Vue standalone app。
- TypeScript ESM Node/backend app。
- TypeScript ESM CLI tool。
- TypeScript ESM library package。

### CLI tool scaffold

- 默认 `toolkit: "none"` 的轻依赖 CLI 轨道。
- 显式 `toolkit: "effect"` 的 Effect CLI 轨道。
- CLI package 生成 `bin` metadata。
- CLI build 保留 shebang。
- generated smoke 会验证 CLI bin invocation。

### Library scaffold

- neutral runtime library。
- Node runtime library。
- TypeScript ESM build output。
- `main` / `types` 指向 `dist` 输出。

### Workspace scaffold

- pnpm workspace root。
- 空 workspace 只生成 root 基建，不生成无目标的 orchestration scripts。
- 结构化 workspace child package 生成。
- `frontend-app`、`backend-app`、`cli-tool` 进入 `apps/*`。
- `library-package` 进入 `libs/*`。
- child package 使用 package-local config 渲染模板。
- child package manifest name 来自 package spec，不来自目录 id。
- internal dependency 必须显式声明。
- 显式 internal dependency 生成 `workspace:*`。
- root `test`、`lint`、`clean` 等聚合脚本从实际 child scripts 推导。

### Workspace presets

- `workspace-cli-library`：生成 `apps/cli` Effect CLI 和 `libs/core` neutral library。
- `workspace-fullstack-react`：生成 React web app、Node api app 和 shared library。
- `workspace-fullstack-vue`：生成 Vue web app、Node api app 和 shared library。

### 工程维护能力

- 生成项目默认使用 Node.js `>=22.22.1`。
- 生成项目包含 Knip/Taze 维护脚本。
- standalone 项目的 Taze 脚本只检查当前 package。
- workspace root 的 Taze 脚本递归检查 workspace。
- root 仓库有 `pnpm verify`，包含 build、test、lint、knip。
- root 仓库有 `pnpm smoke:dry-run` 和 `pnpm smoke:examples`。
- generated smoke 输出保留在 `apps/examples/.generated/`，方便人工检查。
- smoke 支持 `PRELUDE_SMOKE_CASES` 选择相关生成面。
- smoke 支持 `PRELUDE_SMOKE_CONCURRENCY` 控制并发。

### 知识与协作能力

- `.trellis/user/` 记录人类可读的项目上下文。
- `.trellis/spec/` 记录 agent-facing 的执行 contract。
- `.trellis/tasks/` 记录任务 PRD、上下文和验收。
- 项目本地 skills 覆盖 release readiness、docs/spec sync、template source-map fixer、preset expansion planning、skill improvement、generated scaffold audit、template dependency update。
- Changesets 已用于 package version 和 changelog 管理。

## 当前明确不支持或暂缓

- 对已有项目或 workspace 做 append/update。
- worker app 生成。
- 远程模板。
- 插件化模板来源。
- 通过 CLI flags 完整配置任意 workspace package graph。
- 交互式任意 workspace package graph 编辑。
- 默认生成 publishable library release workflow。
- 默认生成 Changesets release workflow。
- 默认生成 shared TypeScript / ESLint / tooling config packages。
- 默认生成 package-level `turbo.json`。
- npm / yarn / bun workspace 生成。
- Next / Turbopack 方向的 full-stack preset。

## 产品 TODO

把新的想法先放这里。进入实现前，再拆成 Trellis task，并判断是否需要同步 `.trellis/spec/`。

### MVP-next

- [ ] 在这里补充

### Later

- [ ] 在这里补充

### Parking Lot

- [ ] 在这里补充

## 判断新 TODO 是否偏移

新增 TODO 时先问四个问题：

- 它是否强化“本地项目脚手架生成 CLI”这个定位？
- 它是否能进入现有输入 -> `ProjectConfig` -> `PlanSpec` -> materialize 链路？
- 它是否能用 generated smoke 或明确的 contract 测出来？
- 它是否会把产品从“稳定的本地 scaffold”推向“泛模板市场 / 远程插件平台 / 既有项目迁移工具”？

如果前三个答案是“是”，通常适合进入近期路线。

如果第四个答案是“是”，通常先放 Later 或 Parking Lot，并单独做架构规划。
