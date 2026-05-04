# 脚手架生成链路维护指南

## 读者与行动

本文面向准备修改 Create Yume CLI scaffold pipeline 的 agent 或维护者。

读完后，你应该能：

1. 判断当前改动会触碰哪条链路。
2. 知道哪些 M010 / M011 结论必须保留。
3. 为对应改动选择最低验证命令。
4. 避免把 Later fix 当成已证实的当前缺陷。

本文是执行侧维护契约；用户可读说明见用户侧架构文档。

## 当前闭合结论

M010 是链路级 Effect-native architecture review。结论是：当前 React/Vue 本地 scaffold pipeline 没有证据支持的 Immediate fix。

PRD-3 之后，当前产品范围扩展为 React / Vue 项目脚手架与 pnpm workspace root 脚手架。workspace 子包生成、Node scaffold、远程模板、插件系统、私有 registry、auth 和已有项目增量更新仍然不是当前范围。

M011 已完成 M010 中最高优先级的后续项：typed Plan-to-PlanSpec projection boundary。

因此，当前维护基线是：

- 不需要重新争论 M010 已接受的 current designs。
- 不需要把 M010 Later fix 当作未完成缺陷塞进无关任务。
- 修改 Plan / PlanSpec / dry run / preview 时，必须保留 M011 的 typed projection boundary。
- 修改 lifecycle / command / Husky / rollback / TemplateEngine 时，必须证明没有破坏受保护契约。

## 链路划分

维护时按链路判断影响面，不要只按目录名判断。

| 链路 | 触发场景 | 必须保护的点 |
| --- | --- | --- |
| CLI/config 输入链路 | flags、prompts、preset、schema、non-interactive 行为 | ProjectConfigSchema 是 scaffold input truth；运行时执行策略不要混进项目配置 |
| owner contribution 链路 | scaffold family、workspace/bootstrap、router、state-management、新 capability | owner 保持 policy；中心 composer 只收集、排序、投影、提交贡献 |
| Plan / PlanSpec 链路 | Plan DSL、projection、schema、preview、dry run、snapshot | PlanSpec 是 inspection truth；M011 typed projection boundary 不得绕开 |
| apply / rollback 链路 | plan apply、target path、文件写入、cleanup、rollback | duplicate/path failure 要在 unsafe write 前拒绝；rollback scopes 不要混淆 |
| TemplateEngine 链路 | helper、partial、prepare/render 生命周期、diagnostics/caching | TemplateEngineService 吸收模板运行时复杂度；不要把 sequencing 泄漏给调用方 |
| post-generate 链路 | install、git、husky、post-generate file actions | command 先于 file action；Husky hook 写入不要提前到 plan apply |
| diagnostics 链路 | CommandError、stdout/stderr/output、error shapes、future redaction | 当前本地范围保留完整可用 command output；secret-bearing scope 才重议 redaction |

## M011 PlanSpec projection boundary 契约

M011 之后，Plan 到 PlanSpec 的投影有两个层次：

- runtime path 使用 typed Effect boundary。
- sync compatibility wrapper 只服务当前有效调用方。

维护要求：

1. preview / dry run / finish inspection 不要绕回旧的无诊断投影方式。
2. malformed render data、JSON base、object-form reducer input 等不能安全进入 inspection data 的值，必须 loud fail。
3. projection failure 应保留结构化 issue 信息，至少能定位 task kind、target path、field path 和 reason。
4. function-form reducer input 不应强行展开；它仍是 runtime-only limitation。
5. preview formatter 继续只消费 PlanSpec，不直接解释 runtime Plan。
6. typed projection boundary 不等于 lifecycle redesign，不要顺手改 PlanService.apply、rollback、command execution 或 TemplateEngine。

## 受保护契约

### R016 — preview / dry run 以 PlanSpec 为真实数据源

任何 preview / dry run 改动都必须证明输出来自 PlanSpec，而不是 runtime Plan 内部细节。

### R017 — dry run 不写入、不创建目标目录、不执行 command

不要为了“更真实”把 dry run 接到 apply 或 command 执行路径。

### R018 — preview 必须诚实标注 command 内部副作用限制

Preview 可以展示已知 command 和已结构化 file action。

Preview 不能声称完整展示 command-internal file effects。

### R020 — conservative failure handling

保留保守失败处理：duplicate target/path escape 在 unsafe write 前失败；apply rollback、post-generate whole-target rollback、original failure preservation、cleanup warning visibility 是不同诊断面。

### R021 — full local command diagnostics

当前本地 React/Vue/workspace-root scope 下，CommandError 应保留完整可用 command context 与 stdout / stderr / output。

不要把 redaction 当作普通 cleanup。只有进入 private registry、auth、remote template、plugin、secret-bearing command env 或外部服务时，才重新设计。

### R022 — Husky command-first / file-action-after-command

Husky init 仍是 post-generate command。Hook 最终内容仍是 post-generate file action，且在 command 之后执行。

不要把 hook 写入提前到 plan apply 阶段。

## 当前不要随手重开的设计

| 设计 | 当前处理 |
| --- | --- |
| PlanSpec 是 inspection / dry-run / trace data，不是 execution state | 保留 |
| Dry run side-effect free | 保留 |
| Command output 当前不 redaction | 保留，除非 scope 变成 secret-bearing |
| Husky ordering | 保留 |
| owner contribution vocabulary | 保留 |
| central assembly thin seam | 中心只收集/排序/投影，不吸收 owner policy |
| apply rollback 与 post-generate rollback 分开 | 保留不同 ownership scope |
| TemplateEngineService 拥有 Handlebars lifecycle | 不把 prepare/helper/partial sequencing 泄漏给上层 |
| ProjectConfigSchema 是 scaffold input truth | flags/prompts/preset 都收敛到这里 |
| `--install` 是 invocation policy | 不写进 generated project config |

## Follow-up 状态

M010 的 P0 follow-up 中，typed Plan-to-PlanSpec projection boundary 已由 M011 完成并验证。

剩余 watchlist 仍然是候选，不是当前缺陷：

| 候选 | 何时进入实现 | 禁止顺手做的事 |
| --- | --- | --- |
| explicit lifecycle representation | 只有当它能减少重复 lifecycle truth 且保留 R021/R022 时 | 不要在 PlanSpec projection 或 dry-run 小改中顺手重构 lifecycle |
| legacy package helper cleanup / derivation | 先证明 caller compatibility，再迁移 | 不要把 owner contributions 折回中心 policy |
| targeted rollback coverage | 先写负向测试证明缺口 | 不要未证明就改 rollback policy |
| non-interactive / install-policy docs | 用户或 agent 对 invocation policy 持续混淆时 | 不要把 `--install` 移入 ProjectConfig |
| TemplateEngine diagnostics / caching / provenance | 有弱诊断、负载或 caller evidence 时 | 不要为抽象整齐添加状态或 cache |
| command-output redaction | 只有 secret-bearing scope 出现时 | 不要在当前本地命令范围削弱诊断 |

## 验证选择

先判断改动类型，再选命令。跨多类时取更高档，或直接跑完整验证。

| 改动类型 | 最低验证 |
| --- | --- |
| PlanSpec projection / schema / preview boundary | focused projection/schema/preview/compose tests + build |
| dry run / built CLI preview | focused tests + build + built dry-run smoke |
| post-generate command / file action ordering | compose/workspace-bootstrap tests + dry-run smoke；必要时 generated smoke |
| command diagnostics | command service tests + compose failure-path tests |
| rollback / target path / apply behavior | planner rollback tests + focused negative tests + build |
| package contribution / package manifest owner policy | package contribution tests + planner/template tests；如输出变化再 generated smoke |
| TemplateEngine behavior | template-engine/helper/render tests + relevant snapshots |
| CLI args / prompts / presets / config schema | CLI args/schema/question tests + build |
| 只改文档 | 冷读、入口链接检查、事实核对 |
| 不确定影响面 | `pnpm verify` |

M011 final closure 使用过的高置信验证组合是：

```bash
pnpm verify
```

以及 requirements artifact 验证：

```bash
test -s .gsd/REQUIREMENTS.md && rg "R032|validated|PlanSpecProjectionError|dry-run|preview" .gsd/REQUIREMENTS.md
```

## 失败处理规则

1. 如果验证暴露当前正确性或安全缺陷，先记录证据，再做窄修复。
2. 如果只是 Later fix 仍然存在，不要在无关任务中顺手修。
3. 如果改动触碰 R021 或 R022，先证明契约仍成立，再继续。
4. 如果任务需要远程模板、插件、private registry、auth、secret-bearing command 或外部服务，停止把它当 cleanup；这属于 scope expansion。
5. 如果 dry run 行为改变，必须证明没有创建目标目录、没有写文件、没有执行 command。
6. 如果 preview 输出改变，必须证明它仍是 PlanSpec-derived，并且没有夸大 command-internal file effects。

## 文档同步规则

修改以下内容时，同步检查用户文档与执行文档：

- dry run / preview 用户可见输出。
- PlanSpec inspection 语义。
- post-generate command / file action 行为。
- command diagnostics 或 redaction 策略。
- 产品范围：React/Vue、workspace root、Node、workspace 子包、remote template、plugin、incremental update。
- verification matrix 或执行约束。

`.gsd` 记录执行证据；`docs/` 记录当前稳定事实。不要只把长期架构信息留在 `.gsd`。

## 冷读检查

开始修改前，确认你能回答：

1. 这次改动触碰哪条链路？
2. 是否会影响 R016/R017/R018/R020/R021/R022？
3. 是否会绕过 M011 typed PlanSpec projection boundary？
4. 是否会把 owner policy 放回中心 composer？
5. 是否改变了本地 React/Vue/workspace-root 产品范围？
6. 最低验证命令是什么？
7. 是否需要同步用户文档？

如果回答不清楚，先回到对应架构约束和本维护指南，不要直接改代码。
