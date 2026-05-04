# 架构与实现约束

## 产品边界

当前仓库只支持以下脚手架生成能力：

- React
- Vue
- pnpm workspace root
- Node
- CLI tool

明确不在范围内的内容：

- workspace 子包 / 完整 monorepo 生成流程
- worker app 与 library package 生成流程
- Node backend framework 选择；当前 Node scaffold 固定为 `framework: none`
- CLI framework / toolkit 选择；当前 CLI scaffold 固定为 `toolkit: none`
- 远程模板
- 插件系统 / 可插拔模板来源
- 对已有项目做增量式更新

## Generation Model Taxonomy

当前代码可以在 schema 层描述更宽的 generation model，但这不是新的生成能力开关。

稳定术语如下：

- `shape`：`standalone` 或 `workspace`。
- package kind：`frontend-app`、`backend-app`、`worker-app`、`cli-tool`、`library-package`。
- runtime：`browser`、`node`、`neutral`。

runtime 推断与校验规则如下：

- `frontend-app` 固定为 `browser`。
- `backend-app`、`worker-app` 与 `cli-tool` 固定为 `node`。
- `library-package` 只允许 `neutral` 或 `node`，未声明时推断为 `neutral`。

当前 React / Vue / pnpm workspace root / Node / CLI tool 交互、preset、planner 与模板链路仍消费兼容层 `ProjectConfig`。

当前适配关系如下：

- React / Vue：`shape: standalone`、`kind: frontend-app`、`runtime: browser`。
- pnpm workspace root：`shape: workspace`、`packages: []`，只表示根目录物化，不表示已有 workspace 子包。
- Node：`shape: standalone`、`kind: backend-app`、`runtime: node`、`framework: none`。
- CLI tool：`shape: standalone`、`kind: cli-tool`、`runtime: node`、`toolkit: none`。

不要为了新 taxonomy 修改现有 React / Vue 生成产物。

workspace package、`worker-app` 与 `library-package` 目前只是结构化 create spec 的未来输入边界。它们不得被解释为已经支持 workspace 子包调度、worker app / library package 生成或 `workspace:*` 依赖写入。

workspace package spec 可以声明内部依赖 link，目标可按 package id 或 package name 描述。当前只保留 link schema，用于后续 `workspace:*` emission 设计；本阶段不得实现依赖写入。

## 修改区域

默认允许修改的主要区域：

- `apps/cli/src/`
- `apps/cli/templates/`
- `docs/`

当任务明确要求时，可以连带修改为这些区域服务的仓库级元数据。

## 稳定执行核心

当前重构不是重写执行核心，而是在保留执行核心稳定性的前提下推进职责重组。

应被视为稳定核心的内容包括：

- `PlanService`
- `PlanSpec`
- `TemplateEngineService`
- `FsService`
- plan application 中的 rollback 语义

没有新的证据前，不要轻易重议这些稳定核心的必要性。

## 当前架构方向

当前活跃方向是 ownership-oriented architecture，而不是回到单纯的 stage-oriented planning。

应按当前现实理解的层级包括：

1. Preserved Core
2. Scaffold-Family Owner
3. Workspace / Bootstrap Owner
4. Capability Owner

## 稳定组合单元

当前稳定的 contribution units 包括：

- fragment render
- partial namespace
- JSON / text mutation
- static asset copy
- post-generate command
- post-generate file action

在解释 template registry ownership、package mutations 和 bootstrap 行为时，应优先按这些单元理解。

## 已闭合边界

以下边界工作应被视为已落地现实，没有新证据前不要重新争论：

- `CommandService.execute` 已被收进 service boundary，调用方依赖 `CommandService`，而不是 platform executor requirement。
- command failure diagnostics 当前通过 `CommandError` 保留 command、args、cwd、cause，以及可用的 stdout / stderr / output。当前本地命令范围不做 redaction；若未来进入私有 registry、token、远程模板、插件来源、authenticated external services 或 secret-bearing env，必须先重新定义 command output redaction / 降级策略。
- Husky hook 最终文件内容当前通过 post-generate file action 写入：Husky 初始化仍是 post-generate command，`.husky/pre-commit` 与 `.husky/commit-msg` 在命令之后写入并进入 `PlanSpec` / dry run 可见范围。不要把这些 hook 写入提前移动到 plan apply 阶段。
- planner 已在 plan application 开始前拒绝 duplicate target-path conflicts，这属于核心执行契约的一部分。
- shared frontend config 只保留真正共享的语义；React 与 Vue 的 router / state semantics 已分开建模。
- `router` 与 `state-management` 都已经是 capability owner，不应再按“只有 router 是试点”的旧口径理解。

## 深模块判断

以下判断应被视为当前仍然有效：

- `TemplateEngineService` 应继续吸收 template runtime complexity，而不是把复杂度向上泄漏。
- `FsService` 在仓库仍需要 project-local file error boundary 时是有意义的。
- `PlanSpec` 是有价值的 serialization 与 snapshot boundary。
- 使用 scoped cleanup 与 tracked created paths 建模 rollback 是值得保留的模式。

## 相关约束

- [Workflow Materialization 约束](./workflow-materialization.md)：定义 fragment render、JSON / text mutation、static asset copy 与 post-generate command 的使用边界。
- [脚手架生成链路维护指南](../architecture-review/scaffold-pipeline-maintenance.md)：维护 M010 之后的链路审查结论、精简候选、保留契约和验证选择。
