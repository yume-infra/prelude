# Workflow Materialization 约束

## 目的

本约束定义 CLI workflow 中不同生成策略的使用边界。

当前系统只有一条稳定 workflow：

1. 收敛 `ProjectConfig`。
2. owner 贡献 generation units。
3. 构建 `Plan` / `PlanSpec`。
4. 应用 plan。
5. 执行 post-generate command。
6. 执行 post-generate file action。

Handlebars fragment render、JSON / text mutation、static asset copy、post-generate command 和 post-generate file action 都只是这条 workflow 下的 materialization strategy，不是多套 workflow。

## 读者与行动

本文档面向修改 CLI workflow、模板注册、组合型文件生成或 capability owner 的执行者。

读完后，应能判断一个生成目标应该使用哪种 materialization strategy，并知道热点文件、路径边界、preview / dry run 与 command output 应如何处理。

## 核心原则

1. 单一 workflow 优先于统一渲染技术。
2. `Plan` / `PlanSpec` 是稳定执行边界。
3. materialization strategy 是内部实现选择，不应泄漏成调用方需要记忆的双模式。
4. owner 应拥有自己的规则，中心 composer 只应收集、排序和提交贡献。
5. 热点文件不应为了“所有文件都走模板”而把结构化决策塞进 Handlebars。

## Strategy 选择规则

### Fragment Render

当目标文件主要是固定形状的人类可读源码或配置片段时，使用 fragment render。

适用情况：

- 文件内容整体像完整文件。
- 条件分支少，并且只影响局部文本。
- 读模板时可以直接理解输出结构。
- owner 贡献的是“渲染一个文件”。

不适用情况：

- 模板需要表达大量跨 owner 策略判断。
- 多个 capability 都需要修改同一目标文件。
- 输出需要结构化合并、排序、去重或冲突检查。
- 模板 helper 开始承载 package policy、dependency policy 或 workflow policy。

### JSON / Text Mutation

当目标文件是多方决策汇合点时，使用 JSON / text mutation。

适用情况：

- 文件是结构化数据，或可被稳定视为结构化内容。
- 多个 owner 需要向同一目标贡献片段。
- 输出需要确定性排序、合并、去重或 snapshot。
- 每个 contribution 都需要保留 ownership trace。
- 新 capability 不应该迫使中心 composer 学会该 capability 的内部规则。

`package.json` 是当前最典型的 JSON mutation 目标，不应退回 Handlebars 模板。

### Static Asset Copy

当目标文件固定、不依赖 `ProjectConfig`、也不需要 owner 间合并时，使用 static asset copy。

### Post-Generate Command

当行为必须在文件生成后由外部工具完成时，使用 post-generate command。

适用情况：

- 行为依赖包管理器、Git、工具 CLI 或平台命令。
- 行为不适合表示为文件写入。
- 命令可以明确归属到 owner 与 phase。

post-generate command 不应隐藏文件生成规则。能稳定表示为 plan task 或 post-generate file action 的文件产物，应进入对应文件策略，共享 `PlanSpec`、rollback 和 ownership trace。外部命令只保留真正依赖外部工具执行的行为。

### Post-Generate File Action

当文件写入必须发生在外部 post-generate command 之后时，使用 post-generate file action。

适用情况：

- 文件内容可由当前配置稳定计算。
- 文件写入必须等待外部工具初始化完成，例如 Husky hook 需要在 `pnpm exec husky init` 后覆盖最终内容。
- 文件效果应在 `PlanSpec` / dry run 中可见。
- 写入失败应接入生成目录 rollback。

不适用情况：

- 行为依赖包管理器、Git 或工具 CLI 执行；这仍是 post-generate command。
- 文件效果只是外部命令的内部副作用，当前系统没有结构化表示；dry run 不应猜测。

当前 Husky hook 写入已经是 post-generate file action：`pnpm install` / `git init` / `pnpm add -D husky` / `pnpm exec husky init` 仍是 command，`.husky/pre-commit` 与 `.husky/commit-msg` 的最终 hook 内容由 file action 在命令之后写入。不要把这些 hook 提前移动到 plan apply 阶段；`husky init` 可能创建或覆盖 hook 文件。

## 热点文件约束

热点文件是指多个 owner 都天然需要贡献内容的同一目标文件。

热点文件不应由大型 Handlebars 模板承载策略分支，也不应长期依赖一个越来越了解所有 owner 细节的中心函数。

热点文件应按以下方向演进：

1. 一个 owner 负责 base shape。
2. 各 capability owner 暴露自己的 contribution。
3. contribution 携带 ownership trace。
4. 中心 composer 只负责收集、排序和提交 contribution。
5. merge、sort、dedupe、conflict policy 下沉到 plan / mutation boundary。

当前 planner 已在 plan application 前拒绝 duplicate target-path conflicts。这个契约对 fragment render 和 static asset copy 仍然有效。

当多个 JSON / text mutation 需要指向同一热点文件时，应设计 same-path mutation merge，而不是让每个 owner 回到中心聚合函数。合并后仍必须能从 `PlanSpec` 解释每个 owner 的 contribution、顺序和 reducer。

## 已知热点与观察点

### `package.json`

`package.json` 是结构化决策汇合点，不是文本模板。

新增 dependency、script、devDependency、engine 等规则时，应由对应 owner 贡献 JSON mutation，并保持 mutation 可序列化为可解释的 `PlanSpec`。如果新增 capability 时必须直接修改中心 `package.json` 聚合函数，说明 owner contribution 边界还不够深。

当前实现中，package policy 通过 package manifest contribution collector 汇合：`package-manifest-contributions.ts` 负责排序、same-value dedupe、provenance 和 owner-aware conflict diagnostics；`package-json.ts` 只收集 scaffold-family、workspace/bootstrap、router 与 state-management owner 的 contributions，并提交单个 package json task。新增 package 规则时应优先扩展 owner contribution API 与对应 owner 测试，而不是恢复中心 package policy 表或 Handlebars helper。

面向 M007 preview / dry run 时，package manifest contribution 的可解释单元应至少保留 target path、section、key、owner(s) 与 value；不要通过重新解析最终 `package.json` 文本来猜测来源。

### TypeScript 配置

当前 TypeScript config 仍适合 fragment render，因为内容相对固定，主要由 scaffold-family owner 决定。M006 未迁移 `tsconfig`；它只把 `package.json` 的 package policy 收敛为 structured package manifest contributions。

当多个 owner 需要共同修改 compiler options、references、paths、types 等字段时，TypeScript config 应被视为新的结构化热点文件，接入 structured target contribution 与 same-path mutation merge，而不是继续把 capability-specific 条件塞进模板。没有这类新需求前，`tsconfig` 只作为 deferred hotspot watchlist 保留，不应为了“对齐 package manifest”而提前迁移。

### Linter 编辑器配置

当前 `antfu-eslint` 由 workspace / bootstrap owner 生成 `eslint.config.mjs`，并同步生成编辑器项目配置。

- VSCode 配置目标为 `.vscode/settings.json`。
- Zed 配置目标为 `.zed/settings.json`。

编辑器配置仍按 fragment render 处理，因为每个目标文件由单一 owner 生成，内容主要是固定形状的项目级配置。新增编辑器支持时，应优先新增独立目标文件，不要把编辑器行为塞进 `eslint.config.mjs`，也不要让单个编辑器配置承担另一个编辑器的兼容规则。

## 路径与安全边界

生成任务的 target path 应保持 project-relative 语义。

在引入 plan preview、dry run、外部 `PlanSpec` 读取或更多生成目标前，应确保 plan build 或 plan apply 拒绝绝对 target path 与 `..` 越界 target path。模板源路径和生成目标路径应继续使用不同 brand。

当前命令主要用于依赖安装、Git 初始化和工具初始化，通常不处理 secret。M008 的当前边界是：`CommandError` 应保留 command、args、cwd、cause，以及平台失败对象暴露的完整 stdout / stderr / output；当前不做 redaction，也不做 truncation。

在引入 token、认证、远程模板、私有 registry、插件来源、authenticated external services 或 secret-bearing command env 前，必须先定义 command output 的 redaction 或降级策略。失败诊断应继续保留 command、args、cwd、exit code（如可用）、owner、unit 和 phase，但不得持久化未处理的敏感 stdout / stderr。

远程模板、插件化模板来源、workspace 子包 / 完整 monorepo 生成、worker app / library package 生成和已有项目增量更新仍不在当前产品范围内。若未来要进入实现，必须先更新用户侧系统架构、执行约束、验证矩阵，并重新评估 preserved core、路径边界和 command output 安全边界。

## Plan Preview 与 Dry Run

plan preview 和 dry run 是用户可见能力，不是新的 workflow。

当前实现只提供 `--dry-run`，不提供单独 `--preview` flag，也不提供 `--json` 或其他稳定机器可读 contract。输出是 human-readable preview，数据源仍必须是 `PlanSpec`。如果未来要增加 JSON 输出，应作为新的 contract 重新规划和测试，而不是把当前文本输出当作隐式 API。

如果引入或修改这些能力，应满足以下约束：

1. 复用正常的 config collection 与 plan build。
2. 以 `PlanSpec` 为唯一数据源。
3. 展示 target path、task kind、owner、unit、post-generate command 和 post-generate file action。
4. dry run 不写入文件、不创建目录、不执行外部命令。
5. 如果文件产物仍隐藏在 post-generate command 中，preview 只能展示命令，不能声称已完整展示文件内容。
6. 不要在 dry run 中猜测命令副作用；只有已经进入 `postGenerateFileActions` 的文件效果才能作为文件 action 展示。

涉及用户可见输出时，必须同步检查用户文档。

## 验证提示

新增或修改生成目标时，验证应覆盖真实影响面：

- 修改 fragment、template helper 或 registry 时，检查模板渲染和 planner snapshot。
- 修改 JSON / text mutation 或热点文件时，检查 `PlanSpec` 是否能解释 owner contribution。
- 修改 rollback、path boundary 或 plan apply 行为时，覆盖失败路径。
- 修改依赖版本、package manifest、Vite、TypeScript、React、Vue、workspace root、Node 或 CLI 主模板时，考虑运行 generated project smoke。
- 修改 command phase 时，验证命令顺序、失败诊断和敏感输出边界。
- 修改 post-generate file action 时，验证命令先于 file action、路径越界拒绝、写入失败 rollback、以及真实生成项目中的最终文件内容。

## 反模式

以下做法应避免：

- 为了统一技术栈，把 `package.json` 改成 Handlebars 模板。
- 在 Handlebars helper 中隐藏 package policy。
- 在中心 composer 中持续追加 capability-specific 分支。
- 让调用方记住某个 path 到底应该走模板、mutation 还是命令。
- 让同一设计决策同时出现在模板、package mutation 和 post-generate command 中。
- 为了短期省事，把 owner 的私有规则泄漏到 preserved core。
- 在 `docs/` 中长期保留执行 TODO、阶段性 backlog 或临时讨论材料。

## 检查点

新增或修改生成目标时，先回答以下问题：

1. 这个目标像完整文件，还是像多方决策汇合点？
2. 是否会有多个 owner 修改同一个目标？
3. 是否需要 merge、sort、dedupe、conflict policy？
4. 新 capability 是否只需要新增自己的 contribution，而不需要改中心 composer？
5. 这个规则是否能在 `PlanSpec` 中被解释？
6. 如果用 Handlebars，模板是否会变成策略表？
7. target path 是否明确限制在 project-relative 边界内？
8. 是否有用户可见输出需要同步用户文档？
9. 是否有 command output 泄漏敏感信息的可能？

如果答案显示目标是热点文件，应选择函数式 contribution / mutation 方向，而不是 fragment render。
