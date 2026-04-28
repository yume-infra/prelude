# Phase 3 工作文档路线图

## 读者与目标

本文面向 M005 之后继续执行 Phase 3 的维护者和 agent。

读完后，读者应能完成一件事：判断 M006 与 M007 的执行顺序，并在 `/gsd parallel start` 中避免把 M007 提前到 M006 之前。

## 并行调度契约

- M006 `depends_on` M005。M005 完成后，M006 可以启动。
- M007 `depends_on` M006。M007 必须等待 M006 完成，不能与 M006 同轮启动。
- M005 完成后，M006 可以与 Phase 4 的 M008 并行启动；M007 不参与这轮并行。
- 如果 `/gsd parallel start` 同时看到 M006 与 M007，应选择 M006，记录 M007 仍被 M006 阻塞。

## M006：Structured Package Manifest Contributions

### Reader goal

读者应能把 package manifest contributions 建模为结构化贡献，而不是继续在模板、preset 与生成流程里追加脆弱的散落 mutation。

### Dependency notes

M006 `depends_on` M005，因为它需要沿用 Phase 2 已完成的生成项目质量基线、`smoke:generated` / `smoke:examples` 结果，以及 full preset 的 `--max-warnings=0` lint gate。

M006 可以在 M005 后与 M008 并行执行。它不依赖 M008，但必须保持 Phase 2 对 React / Vue 当前支持范围的约束：不新增 Node scaffold、远程模板、插件系统或已有项目增量更新。

### Verification expectations

M006 的验证应证明三件事：

1. 结构化 manifest contribution 可以表达现有 React / Vue minimal/full preset 的 scripts、dependencies、devDependencies 与 package 字段。
2. 生成结果仍通过 `smoke:generated`，并且 lint-enabled full preset 继续通过 `pnpm lint --max-warnings=0`。
3. linked example 路径没有被 manifest 重构破坏；必要时同步运行 `smoke:examples`。

### Scheduling warning

不要为了让 M007 提前启动而在 M006 中输出临时文本结构或半成品 manifest API。M007 的 preview / dry run 依赖 M006 的结构化贡献边界，M006 应先交付稳定接口。

## M007：Plan Preview and Dry Run

### Reader goal

读者应能为生成计划提供 preview 与 dry run 能力，让用户和 agent 在写文件前看见将要创建的文件、package manifest contributions 和关键命令。

### Dependency notes

M007 `depends_on` M006，因为 preview / dry run 必须读取结构化 manifest contributions，不能重新解析最终 `package.json` 文本来猜测贡献来源。

M007 不应在 M006 完成前进入实现。若 M006 尚未关闭，任何 preview / dry run 设计都只能停留在 draft，不应写入稳定执行路径。

### Verification expectations

M007 的验证应证明三件事：

1. preview / dry run 能展示文件计划、manifest contribution 摘要和关键命令，而不真实写入项目文件。
2. dry run 输出与真实生成路径共享同一份计划来源，避免 preview 与执行结果分叉。
3. M006 建立的 manifest contribution 语义在 preview 中可见，并且现有生成 smoke gate 仍通过。

### Scheduling warning

M007 必须等待 M006。若 `/gsd parallel start` 在 M006 未完成时看到 M007，应跳过 M007，并把阻塞原因记录为 `depends_on M006` 未满足。
