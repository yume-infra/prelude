# Phase 4 工作文档路线图

## 读者与目标

本文面向 M005 之后继续执行 Phase 4 的维护者和 agent。

读完后，读者应能完成一件事：判断 M008 与 M009 的执行顺序，并在 `/gsd parallel start` 中只启动依赖已满足的 milestone。

## 并行调度契约

- M008 `depends_on` M005，因此 M005 完成后可与 M006 并行启动。
- M009 `depends_on` M006 与 M008，因此必须等 Phase 3 的 M006 和 Phase 4 的 M008 都完成。
- 安全队列是：M005 之后并行执行 M006 + M008；M007 等 M006；M009 等 M006 + M008。

## M008：Command Output Diagnostics

目标：改进 CLI 命令输出诊断，让失败信息能稳定说明命令、阶段、退出码、超时和可操作的下一步，避免 agent 只能从原始 stderr 猜测问题归属。

依赖：M008 `depends_on` M005，因为它应基于 Phase 2 已稳定的 generated / linked smoke gate 语义补充诊断，而不是重新定义生成项目质量基线。

执行提示：M008 可以在 M005 之后与 M006 并行执行，但不应假设 M006 的结构化 manifest contribution 已存在。

## M009：Post-Generate File Task Normalization

状态：draft / blocking。M009 的主题已批准进入 Phase 4，但它被 M006 与 M008 双重阻塞；在两个依赖完成前，不应启动实现。

目标：规范 post-generate file task，让生成后的文件操作、诊断输出和 manifest 贡献之间有稳定边界，减少后续功能继续追加临时脚本或隐式文件修补。

依赖：M009 `depends_on` M006 与 M008。M006 提供结构化 manifest contribution 边界；M008 提供命令输出诊断语义。缺少任一输入都会让 M009 只能依赖猜测。

执行提示：如果 `/gsd parallel start` 在 M006 或 M008 未完成时看到 M009，应跳过 M009，并记录它仍处于 draft / blocking 状态。
