# Phase 2 工作文档路线图

## 读者与目标

本文面向 M005 之后继续维护 Phase 2 生成项目质量基线的维护者和 agent。

读完后，读者应能完成一件事：从 Phase 2 handoff 找到 S04 / S05 已关闭的质量证据，并知道如何把 M006-M009 放进 `/gsd parallel start` 的安全依赖序列。

## Generated Scaffold Quality

- [生成项目质量自治审计愿景与 ADR](./generated-scaffold-quality.md)：包含 M005 completion handoff、S04 smoke gate 结果、S05 `generated-scaffold-audit` skill、已关闭策略边界，以及何时重新运行 generated / linked smoke。
- [生成项目审计基线与 source map](./generated-scaffold-audit-baseline.md)：保留生成物审计基线与问题定位方式。

## Phase 2 完成 handoff

M005 之后，Phase 2 不再是待探索状态；它提供下游 milestone 继续执行的质量基线。

- S04 已把 `smoke:generated` 与 `smoke:examples` 接入 build + lint gate；lint-enabled full preset 必须继续使用 `pnpm lint --max-warnings=0`，minimal preset 保持 build-only。
- S05 已把生成项目审计流程固化为 `generated-scaffold-audit` skill；后续生成物质量审计应复用该流程，不要重新发明审计工作流。
- React Router static imports、JSON ordering 与 minimal-preset lint policy 都属于已关闭策略边界；没有新的真实 smoke failure 时不要重开。
- Tailwind / lightningcss 输出属于 build/dependency warning，不是 ESLint `--max-warnings=0` lint warning；排查时必须分开记录。

## 下游并行序列

M006-M009 的依赖关系是 Phase 2 handoff 的一部分，不只是 milestone 清单。使用 `/gsd parallel start` 时按下面的 `depends_on` 关系调度：

| Milestone | 阶段 | depends_on | 调度状态 |
| --- | --- | --- | --- |
| M006 | Phase 3 | M005 | M005 完成后可启动 |
| M008 | Phase 4 | M005 | M005 完成后可与 M006 并行启动 |
| M007 | Phase 3 | M006 | 等待 M006 完成，不参与 M005 后第一轮并行 |
| M009 | Phase 4 | M006, M008 | 等待 M006 与 M008，完成前保持 draft / blocking |

Phase 3 入口：[Phase 3 工作文档](../phase3/roadmap.md)，覆盖 M006 与 M007 的 reader goals、dependency notes 与 verification expectations。

Phase 4 入口：[Phase 4 工作文档](../phase4/roadmap.md)，覆盖 M008 与 M009 的 reader goals、dependency notes 与 verification expectations。
