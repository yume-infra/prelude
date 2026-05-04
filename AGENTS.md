# Create Yume 执行约束文档

当前仓库支持 `react`、`vue`、`workspace-root`、`node` 与 `cli` 项目脚手架。

## 文档入口

请按下面顺序进入约束与说明文档：

- 根级引导文档：`./roadmap.md`
- 用户文档引导：`./docs/user/roadmap.md`
- 执行文档引导：`./docs/agent/roadmap.md`
- 执行约束引导：`./docs/agent/constraint/roadmap.md`
- Effect 参考引导：`./docs/agent/effect/roadmap.md`
- 面向用户的系统总架构：`./docs/user/system-architecture.md`

## 顶层规则

1. 所有用于指向其他文档的引导文档，统一命名为 `roadmap.md`。
2. 根 `README.md` 是用户入口，不是执行操作手册。
3. 当你需要执行约束、验证规则或实现边界时，不要只看主约束文档，先进入 `docs/agent/constraint/roadmap.md`。
4. 当你需要项目导览或贡献者入口时，从 `docs/user/roadmap.md` 开始。

## 范围事实

- 当前支持 `react`、`vue`、pnpm `workspace-root`、`node` 与 `cli` 项目脚手架。
- 当前 `workspace-root` 只生成 pnpm workspace 根目录，不生成 workspace 子包。
- 不支持 workspace 子包 / 完整 monorepo 生成流程、远程模板、插件系统 / 可插拔模板来源，以及对已有项目做增量式更新。
- 主要允许修改区域：`apps/cli/src/`、`apps/cli/templates/`、`docs/`。
- CLI 构建产物为 `apps/cli/dist/index.js`。

## 约束分层

### 文档约束

见：`./docs/agent/constraint/docs.md`

包含内容：

- 文档命名与入口规则
- 用户文档 / 执行文档分流规则
- 简体中文与术语保留规则
- 修改代码时同步更新文档的约束
- `docs/` 与 `.gsd/` 的职责边界

### 提交与 Git 约束

见：`./docs/agent/constraint/git.md`

包含内容：

- conventional commits
- lobe-commit 工作流
- 提交前验证基线
- 提交粒度与同步约束

### 架构与实现约束

见：`./docs/agent/constraint/architecture.md`

包含内容：

- 产品边界
- 稳定执行核心
- ownership-oriented architecture 方向
- 深模块判断
- 已闭合的边界现实

## 验证入口

最低验证选择见：`./docs/agent/verification-matrix.md`
