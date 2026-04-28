# Phase 4 工作文档路线图

## 读者与目标

本文面向 M005 之后继续执行 Phase 4 的维护者和 agent。

读完后，读者应能完成一件事：判断 M008 与 M009 的执行顺序，并在 `/gsd parallel start` 中只启动依赖已满足的 milestone。

## 并行调度契约

- M008 `depends_on` M005。M005 完成后，M008 可以与 M006 并行启动。
- M009 `depends_on` M006 与 M008。M009 必须等待 Phase 3 的 M006 和 Phase 4 的 M008 都完成。
- 安全队列是：M005 之后并行执行 M006 + M008；M007 等 M006；M009 等 M006 + M008。
- 如果 `/gsd parallel start` 在 M006 或 M008 未完成时看到 M009，应跳过 M009，并记录它仍处于 draft / blocking 状态。

## M008：Command Output Diagnostics

### Reader goal

读者应能改进 CLI 命令输出诊断，让失败信息稳定说明命令、阶段、退出码、超时和可操作下一步，避免 agent 只能从原始 stderr 猜测问题归属。

### Dependency notes

M008 `depends_on` M005，因为它应基于 Phase 2 已稳定的 generated / linked smoke gate 语义补充诊断，而不是重新定义生成项目质量基线。

M008 可以在 M005 后与 M006 并行执行。它不应假设 M006 的结构化 manifest contributions 已存在，也不应修改 M006 的 manifest 贡献边界。

### Verification expectations

M008 的验证应证明三件事：

1. 失败诊断能区分 generation、link、install/bootstrap、build 与 lint phase。
2. `smoke:generated` 与 `smoke:examples` 的失败输出仍能保留命令、退出码、超时状态和可操作摘要。
3. Tailwind / lightningcss build warning 与 ESLint `--max-warnings=0` lint warning 在诊断中不会被混为同一类问题。

### Scheduling warning

M008 可以与 M006 同轮执行，但必须保持冲突处理保守：若诊断输出与 manifest contribution 重构触碰同一主线区域，应优先缩小改动、保留 Phase 2 smoke gate 语义，并把结构性冲突留到依赖完成后的后续 milestone。

## M009：Post-Generate File Task Normalization

状态：draft / blocking。M009 的主题已批准进入 Phase 4，但它被 M006 与 M008 双重阻塞；在两个依赖完成前，不应启动实现。

### Reader goal

读者应能规范 post-generate file task，让生成后的文件操作、诊断输出和 manifest contributions 之间有稳定边界，减少后续功能继续追加临时脚本或隐式文件修补。

### Dependency notes

M009 `depends_on` M006 与 M008。M006 提供结构化 manifest contribution 边界；M008 提供命令输出诊断语义。缺少任一输入都会让 M009 只能依赖猜测。

M009 在 M006 与 M008 都完成前只能维护 draft，不应进入实现，也不应为了提前启动而复制 M006 或 M008 的未完成设计。

### Verification expectations

M009 的验证应证明三件事：

1. post-generate file task 使用 M006 的结构化 manifest contribution 边界，而不是临时读取或修补最终生成文件。
2. task 的失败输出接入 M008 的 command output diagnostics，可以说明阶段、命令、退出码、超时和下一步。
3. 现有 `smoke:generated`、`smoke:examples` 与 full preset `--max-warnings=0` lint gate 仍然通过，证明 normalization 没有回退 Phase 2 质量基线。

### Scheduling warning

M009 必须等待 M006 和 M008。若 `/gsd parallel start` 在任一依赖未完成时看到 M009，应跳过 M009，并把阻塞原因记录为 `depends_on M006, M008` 未满足。
