# Phase 2 工作文档路线图

## Generated Scaffold Quality

- [生成项目质量自治审计愿景与 ADR](./generated-scaffold-quality.md)
- [生成项目审计基线与 source map](./generated-scaffold-audit-baseline.md)

## Phase 2 完成与下游 handoff

M005 完成后，Phase 2 的稳定文档应把生成项目质量基线、S04 smoke gate 结果、S05 `generated-scaffold-audit` skill，以及后续 milestone 的 `depends_on` 关系连接起来。T02 会补全更详细的 handoff；当前入口先固定下游 agent 的发现路径和并行调度契约。

- S04 已把 `smoke:generated` 与 `smoke:examples` 接入 build + lint gate；lint-enabled full preset 必须保留 `--max-warnings=0`。
- S05 已把生成项目审计流程固化为 `generated-scaffold-audit` skill；后续生成物质量审计应复用该流程。
- Phase 3 入口：[Phase 3 工作文档](../phase3/roadmap.md)，覆盖 M006 与 M007。
- Phase 4 入口：[Phase 4 工作文档](../phase4/roadmap.md)，覆盖 M008 与 M009。
- `/gsd parallel start` 调度契约：M006 `depends_on` M005，M008 `depends_on` M005；因此 M005 后 M006 与 M008 可以并行启动。M007 `depends_on` M006；M009 `depends_on` M006 与 M008。
