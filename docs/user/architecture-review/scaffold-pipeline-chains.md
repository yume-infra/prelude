# 脚手架生成链路审查

## 读者与用途

这份文档面向想理解 Create Yume 当前架构方向的用户、维护者和贡献者。读完后，应能回答三个问题：

1. 当前 React / Vue / pnpm workspace root / Node / CLI tool 脚手架生成链路由哪些部分组成。
2. 哪些设计已经被接受，不应被随意重写。
3. 后续代码精简和架构优化应该先看哪里。

这不是历史复盘，也不是任务日志。它描述的是当前稳定结论。

## 审查方式

本轮架构审查按真实产品链路组织，而不是按源码目录组织。原因是脚手架问题通常跨越输入、计划、模板、命令、回滚和预览多个模块，单看目录容易漏掉责任漂移。

审查覆盖了五条主链路：

| 链路 | 审查内容 | 当前结论 |
|---|---|---|
| post-generate lifecycle | 计划应用、后置命令、后置文件动作、诊断和回滚顺序 | 当前行为可接受；后续应减少重复 lifecycle 组装。 |
| Plan / PlanSpec | dry run、preview、序列化检查边界和 reducer metadata | PlanSpec 作为检查边界是正确的；投影失败需要更明确。 |
| ownership contribution | 模板、包、命令、文件动作由 owner 贡献 | owner contribution 是有效深模块；不要退回中心大函数。 |
| apply / rollback / TemplateEngine | 文件写入、回滚、模板渲染生命周期 | 稳定执行核心可接受；先补测试再改行为。 |
| CLI / config boundary | CLI 参数、 prompts、presets、Schema decode、workspace bootstrap | `ProjectConfigSchema` 是脚手架输入真相；`--install` 是本次执行策略。 |

## 没有发现必须立刻修的故障

审查没有发现当前必须马上修的 correctness 或 safety defect。也就是说：当前支持范围内的 React / Vue / pnpm workspace root / Node / CLI tool 脚手架生成链路是连贯的。

但这不表示代码没有优化空间。审查发现的是可维护性、类型边界和代码精简方向上的后续工作。

## 最重要的精简方向

### 1. 让 Plan 到 PlanSpec 的投影失败更明确

当前最高优先级是 Plan 到 PlanSpec 的投影边界。PlanSpec 是 dry run、preview 和检查输出的真实来源。如果 runtime Plan 中存在不能进入 PlanSpec 的值，系统不应静默省略它们，而应给出明确的 typed diagnostic。

这项工作能减少隐式 `undefined` 语义，让未来维护者不必猜测某个字段是本来没有，还是被投影过程丢掉。

### 2. 收敛重复的 post-generate lifecycle 组装

正常生成和 dry run 都需要把后置命令、后置文件动作接到 Plan 上。当前行为正确，但组装逻辑有重复。后续可以把这部分收敛成一个小边界，避免生成路径和预览路径分叉。

前提是 PlanSpec 投影边界先稳定。

### 3. 拆薄 finishProject 的时序职责

当前 finish 阶段同时处理 trace、命令执行、文件动作、成功日志和失败回滚。行为没问题，但阅读上像一个时序脚本。

后续应优先把语义块命名清楚，而不是做大重构：准备 trace、执行 post-generate lifecycle、失败时回滚。

### 4. 清理旧 package helper 的重复真相

package manifest 已经有 owner contribution 模型。旧的 package helper 如果仍然保留同一套 package 选择逻辑，就会形成重复真相。

后续应先审计调用方：能删除就删除；需要兼容就从 owner contribution 派生，不要维护第二套 package policy。

### 5. 保持 TemplateEngine 简洁，不要提前加复杂度

TemplateEngine 当前是可接受的深模块。不要因为审查提到了 diagnostics、prepare observability 或 compile caching，就立刻加状态、缓存或 span。

只有出现真实诊断问题、负载证据或调用方证据时，才考虑增强。

## 已接受的当前设计

以下设计应被视为当前稳定契约：

- dry run 来自 PlanSpec，且不写文件、不创建目录、不执行命令。
- preview 可以展示计划文件、后置命令和已知后置文件动作，但不能声称展示后置命令内部可能产生的文件效果。
- 后置命令先于后置文件动作执行；Husky 初始化仍然是命令，hook 文件仍然在命令之后写入。
- 本地 CLI 失败诊断保留完整可用输出；当前不做 command output redaction。
- Plan/apply、TemplateEngine、Fs/Command、rollback 和 PlanSpec 是稳定执行核心。
- 当前产品边界仍然是本地 React / Vue / pnpm workspace root / Node / CLI tool 项目脚手架，不包含 workspace 子包 / 完整 monorepo 生成、远程模板、插件系统或已有项目增量更新。

## 后续阅读

- 用户如果只想了解整体结构，先读 [系统总架构](../system-architecture.md)。
- 贡献者和 agent 如果要修改这些链路，应读执行侧的 [脚手架生成链路维护指南](../../agent/architecture-review/scaffold-pipeline-maintenance.md)。
