# 脚手架生成链路架构说明

## 读者与目标

本文面向想理解 Create Yume 当前架构状态的维护者、贡献者和产品侧读者。

读完后，你应该能回答三个问题：

1. React/Vue 本地脚手架生成链路现在如何组织。
2. dry run / preview 能承诺什么，不能承诺什么。
3. 最近的架构审查和 PlanSpec 边界修复已经把哪些设计定为当前事实。

本文描述当前状态，不是历史复盘。

## 总结

Create Yume 当前是一条收敛的本地 React/Vue 脚手架生成链路。

它不是通用模板市场，也不是插件运行时，也不是已有项目的增量迁移工具。当前范围仍然是：根据用户输入或 preset，生成一个新的 React 或 Vue 前端项目。

M010 的链路审查结论是：当前生成链路没有证据支持的紧急架构缺陷。许多可以继续打磨的点存在，但它们属于后续计划，不是当前必须立即修的错误。

M011 已经完成 M010 中优先级最高的后续项：Plan 到 PlanSpec 的投影边界现在会在遇到不适合进入 inspection / preview 数据的 malformed 值时，通过 typed projection error 失败，而不是静默丢字段。

## 当前生成链路

Create Yume 的主链路可以理解为六段。

### 1. 输入收敛

CLI flags、交互问题和 preset 最终都会收敛成同一份项目配置。

这个配置只表达要生成的项目是什么：React 还是 Vue、是否启用 router、state management、linting、code quality 等。

运行时执行策略与项目配置保持分离。例如，是否执行安装命令属于调用时行为，不是生成项目本身的结构配置。

### 2. owner contribution

当前架构方向是 ownership-oriented architecture。

这意味着不同 owner 贡献自己的生成单元，而不是把所有规则塞进一个中心策略函数。

当前可以按这些层级理解：

1. Preserved Core
2. Scaffold-Family Owner
3. Workspace / Bootstrap Owner
4. Capability Owner

例如 router 和 state-management 都已经是 capability owner。它们应该贡献自己的模板、package 变更或后置动作，而不是让中心 composer 理解所有 capability 细节。

### 3. Plan / PlanSpec 边界

生成流程内部使用 Plan 表示实际要执行的生成任务。

PlanSpec 是 Plan 的可序列化 inspection 形态，用于 dry run、preview、测试快照和未来 agent 诊断。

当前重要事实：

- Plan 负责执行语义。
- PlanSpec 负责可解释的预览 / inspection 语义。
- dry run 和 preview 必须来自 PlanSpec。
- PlanSpec 不是 rollback 状态，也不是外部命令副作用的完整记录。

M011 之后，Plan 到 PlanSpec 的投影边界更严格：如果 runtime Plan 中出现不能安全表示为 inspection data 的 malformed 值，投影会失败并带出结构化诊断，而不是生成一份看起来完整但实际漏字段的 PlanSpec。

### 4. apply / render 执行

稳定执行核心负责实际 materialization：渲染模板、复制静态文件、应用 JSON / text mutation、检查 target path，并在失败时执行清理或 rollback。

这部分是 preserved core。没有新的证据前，不应为了风格重构轻易重写。

### 5. post-generate command 与 file action

文件生成之后，部分行为需要外部工具完成，例如依赖安装、Git 初始化、Husky 初始化。

当前约定是：

1. post-generate command 先执行。
2. post-generate file action 后执行。

Husky 是一个典型例子：Husky 初始化仍是 command；hook 文件的最终内容由后置 file action 在命令之后写入。这个顺序是当前受保护契约。

### 6. 诊断与验证

本地命令失败时，当前策略是保留完整可用诊断输出，方便维护者和 agent 调查失败原因。

当前本地 React/Vue 范围不做 command output redaction。只有当未来进入私有 registry、token、远程模板、插件、认证外部服务等 secret-bearing 场景时，才需要重新设计 redaction 策略。

## Dry run / preview 的用户承诺

`--dry-run` 的承诺是安全预览。

它应该：

- 复用正常配置收集与 plan build。
- 从 PlanSpec 生成输出。
- 展示计划文件、owner / unit、post-generate commands，以及结构化 post-generate file actions。
- 不创建目标目录。
- 不写文件。
- 不执行外部命令。

它不应该：

- 通过执行 apply 或 command 来“获得更真实的预览”。
- 猜测外部命令内部会创建哪些文件。
- 声称完整展示了 command-internal file effects。

所以 preview 中保留这类限制说明是正确行为：post-generate command 的内部文件效果不会被完整展开。

## 当前已接受的设计

以下设计是当前架构事实，后续改动应默认保护它们。

### PlanSpec-derived dry run

Dry run / preview 必须来自 PlanSpec，而不是直接读取 runtime Plan 内部细节。

M011 已加强 Plan 到 PlanSpec 的投影边界，因此 preview 所依赖的 inspection 数据更可信。

### Typed PlanSpec projection boundary

Malformed projection input 现在会通过 typed projection failure 暴露，并携带问题列表。

这解决的是“inspection 数据静默漏字段”的问题。它不改变产品范围，也不重新定义 Plan DSL、rollback、TemplateEngine 或 command 生命周期。

### Honest preview limitation

Preview 可以展示计划中的 command 和已结构化的 file action。

Preview 不能声称知道外部 command 内部会写出哪些文件。

### Full local command diagnostics

当前本地 CLI 命令失败时保留完整可用 stdout / stderr / output。诊断优先于过早 redaction。

### Husky ordering

Husky 初始化仍是 command；Husky hook 内容仍是 command 之后的 file action。

### Owner contribution depth

Owner 应拥有自己的 capability policy。中心 composer 只负责收集、排序、投影和提交贡献。

### Stable execution core

Plan/apply、PlanSpec、TemplateEngine、filesystem service、command service 和 rollback 语义是稳定核心。

## 当前不在范围内

以下内容仍然不在当前产品范围内：

- Node 项目脚手架。
- 远程模板。
- 插件系统或可插拔模板来源。
- 对已有项目做增量式更新。
- 私有 registry、认证外部服务、token-bearing command flow。
- 完整展开 post-generate command 内部文件副作用。

如果未来要进入这些范围，必须先重新审查信任边界、路径边界、command output 安全策略和验证矩阵。

## 后续工作如何理解

M010 中的发现分三类：

| 分类 | 含义 | 当前状态 |
| --- | --- | --- |
| Immediate fix | 当前有证据支持的正确性、安全性或活跃需求缺陷 | M010 没有发现 |
| Later fix | 真实存在的维护性、证明强度、诊断或边界改进候选 | 需要单独规划 |
| Acceptable current design | 当前设计与本地 React/Vue 范围一致，有证据支持 | 后续改动应保护 |

M011 已完成当时优先级最高的 Later fix：typed Plan-to-PlanSpec projection boundary。

剩余 follow-up 仍然只是候选，不代表当前系统错误，也不代表可以顺手扩大范围。

## 读者检查

读完本文后，你应该能判断：

- Create Yume 当前只支持本地 React/Vue 新项目生成。
- dry run 是 PlanSpec-derived、安全、非执行式预览。
- PlanSpec projection 已经有 typed failure 边界。
- R021 command diagnostics、R022 Husky ordering、R016/R017/R018 dry-run / preview contracts 都是当前要保护的事实。
- 如果未来要做远程模板、插件、Node scaffold 或增量更新，需要新的架构与安全审查。
