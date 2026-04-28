# Phase 3 工作文档路线图

## 读者与目标

本文面向 M005 之后继续执行 Phase 3 的维护者和 agent。

读完后，读者应能完成一件事：判断 M006 与 M007 的执行顺序，并在 `/gsd parallel start` 中避免把 M007 提前到 M006 之前。

## 并行调度契约

- Phase 3 从 M006 开始；M006 `depends_on` M005。
- M007 必须等待 M006；M007 `depends_on` M006。
- M005 完成后，M006 可以与 Phase 4 的 M008 并行启动；M007 不参与这轮并行，直到 M006 完成。

## M006：Structured Package Manifest Contributions

目标：把 package manifest contributions 做成结构化贡献模型，让模板、preset 与生成策略可以稳定表达脚本、依赖和 manifest 字段，而不是依赖脆弱的散落 mutation。

依赖：M006 `depends_on` M005，因为它需要沿用 Phase 2 已完成的生成项目质量基线、`smoke:generated` / `smoke:examples` 结果，以及 full preset 的 `--max-warnings=0` lint gate。

执行提示：修改 manifest 生成策略时，应继续保护 React / Vue 当前支持范围，不引入 Node scaffold、远程模板或插件系统。

## M007：Plan Preview and Dry Run

目标：为生成计划提供 preview 与 dry run 能力，让用户和 agent 能在写文件前检查将要创建的文件、package manifest 贡献和关键命令。

依赖：M007 `depends_on` M006，因为 preview / dry run 需要读取结构化 manifest contributions，不能重新解析最终 `package.json` 文本来猜测贡献来源。

执行提示：M007 只能在 M006 完成后启动；如果 `/gsd parallel start` 同时看到 M006 与 M007，应选择 M006，等待 M006 关闭后再进入 M007。
