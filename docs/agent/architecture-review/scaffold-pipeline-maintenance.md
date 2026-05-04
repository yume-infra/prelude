# 脚手架生成链路维护指南

## 读者与动作

这份文档面向后续进入 Create Yume 的 agent 或维护者。读完后，应能安全选择一个优化点，知道哪些边界不能顺手重构，并能选择正确的验证方式。

本指南只描述当前稳定维护规则。历史执行记录仍以 `.gsd` 为准，但日常入场不应依赖重新阅读完整 GSD 里程碑。

## 总原则

1. 按真实生成链路理解代码，不按目录孤立理解。
2. 优先删除重复真相和隐式语义，而不是追求表面少几行代码。
3. 保留当前 React / Vue / pnpm workspace root / Node / CLI tool 与结构化 workspace package 本地脚手架范围，不引入 worker app、远程模板、插件系统、私有 registry、auth、完整 CLI package graph UX 或已有项目增量更新。
4. 没有新证据时，不重议已接受的稳定执行核心。
5. 修改后必须用与变更类型匹配的验证命令证明。

## 链路地图

| 链路 | 维护重点 | 不要顺手做的事 |
|---|---|---|
| post-generate lifecycle | 命令、文件动作、trace、rollback 的顺序和诊断 | 不要改变 Husky command-first / file-action-after-command 顺序。 |
| Plan / PlanSpec | PlanSpec 是 dry run、preview、snapshot 和 inspection 边界 | 不要让 preview 读取 runtime Plan 或推断命令内部副作用。 |
| ownership contribution | owner 贡献模板、package、命令和文件动作 | 不要把 owner policy 收回中心函数。 |
| apply / rollback / TemplateEngine | 稳定执行核心、路径安全、rollback、模板渲染生命周期 | 不要在没有负向测试前改 rollback 行为。 |
| CLI / config boundary | CLI args、prompts、presets 通过 Schema 进入 ProjectConfig | 不要把 `--install` 移进生成项目配置。 |

## 当前最高优先级：Plan 到 PlanSpec 投影边界

当前优化主线是让 malformed Plan-to-PlanSpec projection 明确失败，而不是静默省略。

需要保留的判断：

- PlanSpec 是检查数据，不是执行状态，也不是 rollback log。
- runtime reducer、transform、callback 和 command object 不应直接进入 PlanSpec。
- 合法 PlanSpec 输出应继续稳定。
- present-but-malformed 的值不能再和 absent optional field 混为一谈。

建议实现方式：

1. 增加 typed projection boundary，例如 `projectPlanSpec` 或 `encodePlanSpec`。
2. 让 projection failure 携带 task kind、目标路径、字段路径和原因。
3. 保留或迁移 `toPlanSpec` 时，必须明确兼容策略。
4. 先写 malformed projection negative tests，再调整调用方。

最小测试目标：

- render data 不是 JSON literal 时不能静默省略。
- JSON base 返回不可序列化值时不能静默省略。
- JSON merge object input 有不可序列化嵌套值时不能静默省略。
- 合法 render data、JSON base、JSON merge input 仍然成功。
- function patch 没有 input 是允许的，因为函数内部本来就是 runtime-only。
- dry run 仍然不写文件、不执行命令，并继续从 PlanSpec 输出 preview。

## 代码精简候选

### 1. 收敛 post-generate lifecycle enrichment

正常生成和 dry run 都需要附加后置命令和后置文件动作。当前逻辑重复但行为正确。

处理顺序：先完成 PlanSpec projection 边界，再抽一个小的 lifecycle enrichment 边界。不要同时改变执行顺序。

### 2. 拆薄 finishProject 的时序职责

finish 阶段可以按语义拆分：准备 trace、执行 post-generate lifecycle、失败回滚。目标是降低阅读和维护成本，不是改变 rollback policy。

### 3. 删除或派生 legacy package helper

如果旧 package helper 仍然表达 package 选择逻辑，应先做 caller audit。能删除就删除；需要兼容就从 owner contribution collector 派生。

禁止把 package policy 重新集中到一个中心函数。

### 4. 清理 compatibility alias

TemplateEngine partial 相关兼容 alias 只有在 caller audit 证明不再需要时才删除。不要因为“看起来多余”直接删。

### 5. 文档澄清 CLI 非交互和 install policy

`ProjectConfigSchema` 是脚手架输入真相。`--install` 是本次 CLI 调用的执行策略，不是生成项目配置。

如果修改 CLI 文档或行为，必须保持这个区分。

## 保留契约

### Dry run 和 preview

- dry run 必须来自 PlanSpec。
- dry run 不得写文件、创建目录或执行命令。
- preview 不得声称展示后置命令内部文件效果。

### Command diagnostics

当前本地 CLI 范围内，command failure 应保留完整可用 stdout / stderr / output。不要主动加 redaction。

只有未来进入私有 registry、token、远程模板、插件、auth 或其他 secret-bearing 外部系统时，才重新设计 redaction。

### Husky lifecycle

Husky 初始化仍是 post-generate command。hook 文件仍是 post-generate file action，并且在命令之后写入。

任何 lifecycle 或 PlanSpec 改动都必须验证这个顺序。

### Stable execution core

以下边界没有新证据前不要重写：

- Plan/apply
- rollback 语义
- TemplateEngineService
- FsService
- CommandService
- PlanSpec inspection boundary

## 验证选择

| 变更类型 | 最小验证 |
|---|---|
| PlanSpec projection | focused projection tests、PlanSpec schema tests、dry-run preview tests、build/type check。 |
| lifecycle enrichment | command/file-action order tests、dry-run side-effect tests、R021/R022 文档锚点检查。 |
| package helper cleanup | caller audit、package collector tests、package-json output tests；如生成输出变化，跑 generated smoke。 |
| rollback hardening | 先写负向测试：render/copy/JSON/cleanup warning/rollback disabled。 |
| CLI/config 文档 | 文档 grep、cold-read；行为变化时加 CLI args/schema tests。 |
| TemplateEngine diagnostics/cache | 先有诊断或负载证据，再加对应测试；不要无证据加缓存。 |

## 入场检查清单

开始修改前，确认：

- [ ] 我修改的是哪一条链路。
- [ ] 有没有触碰 React / Vue / pnpm workspace root / Node / CLI tool 之外的范围。
- [ ] 有没有改变 dry run、preview、command diagnostics 或 Husky 顺序。
- [ ] 是否需要同步用户文档和执行文档。
- [ ] 验证命令是否能证明这次改动，而不是只证明项目能编译。

## 当前推荐顺序

1. Typed Plan-to-PlanSpec projection boundary。
2. Post-generate lifecycle enrichment 收敛。
3. finishProject 时序职责拆薄。
4. legacy package helper caller audit 与删除/派生。
5. CLI 非交互和 install policy 文档澄清。
6. 只有出现证据后再做 TemplateEngine diagnostics / caching。
