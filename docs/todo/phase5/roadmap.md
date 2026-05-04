# Phase 5 待办：长期约束与下一轮候选

## 读者与目标

本文面向 M009 结束后继续维护 Create Yume 的维护者和 agent。

读完后，读者应能完成一件事：判断下一轮应该守住哪些长期约束、哪些 deferred 能进入规划、哪些范围仍然不要启动。

## 当前状态

- M000-M009 已完成。
- 当前没有执行 blocker。
- 工作区在本轮提交后应保持干净。
- 当前产品范围支持 React、Vue、pnpm workspace root、Node 与 CLI tool 项目脚手架。

## 仍然 active 的长期约束

### R001：当前支持项目生成能力必须持续成立

R001 是产品主路径，不应因为一个 milestone 完成就关闭。

维护要求：

1. 任何改动生成流程、模板、package policy、CLI 参数、post-generate 行为时，都必须重新证明 React / Vue / pnpm workspace root / Node / CLI tool 支持没有回退。
2. 最低证明应从验证矩阵选择；涉及生成行为时优先运行 generated smoke。
3. 不要把 workspace 子包 / 完整 monorepo 生成、worker / library package、远程模板、插件系统或已有项目增量更新混入 R001，它们仍是 out of scope。

建议处理方式：

- 保持 active，作为长期产品守护 requirement。
- 如果未来要降低 active 噪音，可以单独引入 “evergreen requirement” 或 “standing requirement” 状态，而不是把 R001 标成 validated 后遗忘。

### R005：文档与验证范围必须持续对齐

R005 是执行治理约束，也不应因为一轮文档同步完成就关闭。

维护要求：

1. 修改用户可见行为时，同步检查用户文档。
2. 修改执行边界、验证方式、模板能力或约束规则时，同步检查执行文档。
3. 每次规划新 milestone 时，显式选择验证命令，不要默认跑最大集合或跳过关键 smoke。
4. 文档仍应保持 React / Vue / pnpm workspace root / Node / CLI tool 的范围事实。

建议处理方式：

- 保持 active，作为长期治理 requirement。
- 下一轮若建立长期约束状态，可把 R005 从普通 active 迁移过去。

## Deferred 候选

### R023：tsconfig 接入 structured target contribution

当前状态：deferred。

现在不要直接启动，除非出现新的真实需求：多个 owner 同时需要修改 TypeScript 配置中的 compiler options、references、paths、types 或相关结构。

进入规划前必须先回答：

1. 是否真的有两个以上 owner 需要共同修改同一 TypeScript 配置目标？
2. 这些修改是否需要 merge、sort、dedupe 或 conflict policy？
3. fragment render 是否已经开始承载 capability-specific 策略表？
4. 如果迁移，PlanSpec 应如何解释每个 owner 的 contribution？
5. 迁移后是否仍保留 duplicate target-path protection？

建议下一步：

- 先做调研 / spike，不直接实现。
- 只有证据显示 `tsconfig` 已成为真实热点文件时，再规划为 milestone。

### R024：完整展示 post-generate command 内部文件产物的 preview

当前状态：deferred。

M009 已把可结构化的 Husky hook 文件写入纳入 post-generate file action。但外部命令内部副作用仍不应被 dry-run 猜测。

进入规划前必须先回答：

1. 哪些 command 内部文件效果值得结构化？
2. 它们能否由当前配置稳定计算，而不是依赖外部工具运行结果？
3. 它们应该成为 post-generate file action，还是仍然只能作为 command limitation 记录？
4. 是否需要新增 machine-readable preview contract？如果需要，是否接受 `--json` 作为新稳定 API？
5. 是否引入 token、private registry、remote template、plugin source 或 authenticated service？如果引入，必须先重新评估 command output redaction。

建议下一步：

- 不要把 dry-run 扩展成“猜测外部工具副作用”。
- 只有能明确结构化的本地文件效果，才进入 PlanSpec / dry-run。
- 如果要做 JSON preview，单独规划 contract、schema、compatibility 和测试。

## 暂不启动的范围

以下内容仍然不要作为 Phase 5 默认任务启动：

- workspace 子包 / 完整 monorepo 生成。
- worker app 或 library package 生成。
- Node backend framework 选择。
- CLI framework / toolkit 选择。
- 远程模板来源。
- 插件系统或可插拔模板来源。
- 对已有项目做增量式更新。
- 依赖 `eslint --fix` 作为生成物质量主路径。
- 为了 lint-clean 引入明显更复杂的默认 scaffold 结构。

这些不是 backlog 小任务；它们会改变产品边界、安全模型或默认 scaffold 复杂度。若未来要进入范围，必须先更新用户架构、执行约束和验证矩阵。

## 建议的 Phase 5 启动顺序

如果下一轮要继续推进，建议按下面顺序讨论：

1. 先决定 R001 / R005 是否继续保留 active，还是引入长期约束状态。
2. 再选择一个 deferred 候选做 spike：优先评估 R023，因为它的边界更小、更容易用代码证据判断。
3. 只有在出现明确用户价值时，再讨论 R024 或 JSON preview contract。
4. 每个候选进入 milestone 前，都必须写清 `depends_on`、非目标范围和验证命令。

## 验证提示

本文件是待办规划文档，不改变代码行为。修改本文后至少检查：

```bash
rg "R001|R005|R023|R024|React|Vue|out of scope|depends_on" docs/todo/roadmap.md docs/todo/phase5/roadmap.md docs/roadmap.md
```

如果同步修改了执行约束或用户文档，再按验证矩阵选择额外测试。
