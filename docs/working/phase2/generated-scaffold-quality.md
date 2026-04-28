# 生成项目质量自治审计愿景与 ADR

## 读者与目标

本文面向后续继续优化 CLI 生成项目质量的维护者和 agent。

读完后，读者应能完成一件事：把“生成项目 lint / DX 问题”拆成可执行迭代，并知道哪些问题应由生成物审计发现，哪些问题应由模板反查定位，哪些问题需要人类做产品或规则取舍。

## 背景

当前 CLI 已能通过 preset 生成 React 与 Vue 项目，生成项目也能完成安装与构建。但在真实打开生成项目时，会出现编辑器红线、保存后自动修复、lint 报错、格式不规整等体验问题。

这些问题不一定影响运行时功能，但会影响脚手架第一印象。对于 scaffold CLI，“生成后能跑”是底线；“生成后是干净的工程”才是成熟体验。

本阶段关注的是生成物质量，而不是新增 scaffold 类型、远程模板、插件系统或已有项目增量更新。

当前可执行证据与 source map 见：[生成项目审计基线与 source map](./generated-scaffold-audit-baseline.md)。

## 愿景

生成项目应满足以下质量约束：

1. 新生成项目在安装依赖后，`build` 通过。
2. 新生成项目在用户未保存、未手动格式化、未执行自动修复前，`lint` 通过。
3. 新生成项目被编辑器打开时，不应出现可由模板提前避免的红线或黄线。
4. 模板输出应与生成项目自带的 ESLint / TypeScript / Vue / React 规则一致。
5. 如果某条规则与脚手架目标天然冲突，应通过明确策略处理，而不是依赖用户保存自动修复。

## 已观察问题

React preset 生成项目当前暴露的问题包括：

- React Refresh 规则认为 router 模块中混入了组件边界与 router 导出。
- 生成的 Vite config、ESLint config 存在格式问题。
- 生成的 package manifest 与 TypeScript config 触发 JSON key order 规则。
- 生成的 README 缺少文件末尾换行。

Vue preset 生成项目当前暴露的问题包括：

- 入口文件 import order 与生成项目 ESLint 配置不一致。
- 部分 Vue SFC 中存在未使用导入。
- 部分 Vue SFC 的 template 缩进、块换行、尾随空格与 style 起始换行不符合规则。
- 生成的 TypeScript config 触发 JSON key order 规则。
- 生成的 README 缺少文件末尾换行。

跨框架问题包括：

- Handlebars 条件渲染容易引入非预期空行。
- Vue SFC style 块并不总能被 Antfu ESLint 完整格式化，模板仍需输出规整样式。
- Tailwind / Vite build 当前可通过，但会输出 lightningcss 对 Tailwind at-rule 的 warning，应作为单独问题评估。

## Agent 自治模型

本阶段推荐把 agent 拆成三个角色，而不是让一个 agent 直接从模板开始修。

### 生成物审计 Agent

职责：

- 从真实生成项目出发，模拟用户拿到脚手架后的第一轮体验。
- 执行生成项目自己的验证命令。
- 不先阅读模板，避免被实现结构锚定。
- 输出生成物问题报告，不直接修复模板。

审计分类：

- auto-fixable formatting
- unused imports / dead code
- framework semantic rules
- generated config issues
- build warnings
- editor-only diagnostics

### 模板溯源 Agent

职责：

- 接收生成物审计报告。
- 反查问题来源属于模板、partial、JSON mutation、package policy、ESLint config 还是依赖版本。
- 判断问题是否由条件分支组合触发。
- 输出 “生成文件 → 源头 → 修复形状 → 影响面” 的映射。

示例输出形状：

```text
generated: src/views/Home.vue
source: Vue SFC template fragment
issue: template indentation and style block newline
fix shape: adjust template whitespace and block structure
risk: affects Vue preset and custom Vue create flow
```

### 策略裁判 / 主 Agent

职责：

- 汇总审计与溯源结果。
- 对非机械问题做产品或规则判断。
- 决定是修改生成代码形状、调整模板格式、收窄 ESLint override，还是拆出后续议题。
- 决定何时把 `lint` 纳入生成项目 smoke 基线。

需要人工确认的典型问题：

- React Refresh 是通过改 router 文件结构解决，还是对 router 文件做窄范围规则 override。
- JSON key order 是让生成 JSON 完全匹配 Antfu 规则，还是对生成配置文件收窄规则。
- Vue style 块是通过模板手写规整，还是引入额外 formatter。
- Tailwind / lightningcss warning 是否属于本阶段修复范围。

## 可复用 Skill：generated-scaffold-audit

项目本地 skill 已固化在 `.agents/skills/generated-scaffold-audit/SKILL.md`。后续 agent 遇到生成项目质量、生成物 lint、模板溯源或 scaffold DX audit 时，应先调用该 skill，并按其 `workflows/audit-generated-output.md` 执行；不应重新发明审计流程。

触发场景：

- “检查生成项目质量”
- “生成物 lint 不干净”
- “反查模板问题”
- “scaffold DX audit”
- “preset generated project audit”

固定流程：

1. 生成或复用真实 example 项目。
2. 对 lint-enabled full preset 运行 `build` 与 `pnpm lint --max-warnings=0`，minimal preset 保持 build-only。
3. 收集命令、退出码、超时状态和脱敏输出摘录，并按问题类型归类。
4. 可选收集编辑器 / LSP diagnostics，用于模拟用户打开项目的第一印象。
5. 将每条问题映射回模板、partial、JSON mutation、package policy、lint strategy、dependency/build warning 或生成项目配置。
6. 使用 `.agents/skills/generated-scaffold-audit/templates/audit-report.md` 输出可继续执行的审计报告。
7. 只有在模板清理和策略边界闭合后，才调整生成项目 smoke 的硬门槛。

重要约束：

- 不要把 `eslint --fix` 作为主路径。
- 可以在临时生成物中运行 auto-fix 来观察期望输出，但只能作为参考。
- 最终修复应回到模板、配置策略或生成逻辑。
- 命令行 `build` / `lint` 是通过与否的主信号；编辑器 / LSP diagnostics 是补充信号。
- Tailwind / lightningcss build warning 与 `lint --max-warnings=0` 失败必须分开记录。

## 测试生成项目的 Agent Lead 文件

当前主仓库有 `roadmap.md` 作为人和 agent 的入口，但 linked example smoke 生成的测试项目没有类似入口。这暴露了一个角色差异：

- 真实用户生成项目主要面向最终用户，`README.md` 是用户入口，不应默认塞入内部审计说明。
- smoke / example 生成项目不仅是产物，也是测试样本、审计对象和 agent 工作空间。

因此，Phase 2 可以为测试生成项目引入非用户入口的 agent lead 文件。候选路径：

- `.create-yume/roadmap.md`
- `.create-yume/audit.md`
- `.create-yume/manifest.json`

建议语义：

- 记录生成来源：preset、create mode、CLI 命令、是否 linked local package。
- 记录期望检查：install、build、lint、可选 LSP diagnostics。
- 明确审计原则：把生成文件视为用户可见输出，不直接修生成物，问题应反查模板或生成策略。
- 标注问题分类：template whitespace、framework lint semantics、generated config policy、dependency/build warning、editor-only diagnostics。

示例 markdown lead 形状：

```md
# Generated Project Audit Lead

## Source

- Generator: create-yume
- Mode: linked smoke
- Preset: react-full

## Expected Checks

- pnpm install
- pnpm build
- pnpm lint

## Audit Scope

- Treat generated files as user-facing output.
- Do not fix generated files directly.
- Trace findings back to templates or generation policy.
```

示例 machine-readable manifest 形状：

```json
{
  "generator": "create-yume",
  "mode": "linked-smoke",
  "preset": "react-full",
  "checks": ["install", "build", "lint"],
  "sourcePolicy": "trace findings back to templates"
}
```

ADR 倾向：真实用户项目保持 README 作为入口；测试/审计生成项目额外携带 agent lead，帮助后续自治 agent 识别自己正在审计的对象和边界。

## LSP 与编辑器诊断定位

VSCode、Zed 或其他编辑器 LSP 可以辅助模拟用户体验，但不应成为主验证。

适合使用 LSP 的场景：

- 观察用户首次打开项目时会看到哪些红线或黄线。
- 捕捉 TypeScript、Vue SFC、ESLint extension 给出的上下文诊断。
- 辅助定位某条问题在编辑器中的实际呈现。

不应依赖 LSP 的原因：

- 诊断依赖用户本机插件、插件版本、workspace trust、安装依赖状态和打开的 workspace root。
- 部分问题只在保存、格式化或 CLI lint 时出现。
- 结果不适合稳定 CI 化。

因此，LSP 诊断应作为 “editor DX audit” 的可选阶段；最终基线仍以生成项目自己的命令行为准。

## ADR 摘要

### ADR-001：从生成物出发，而不是从模板出发

决策：生成项目质量审计应先检查生成物，再反查模板。

原因：模板问题常由配置、条件分支、ESLint 规则和依赖版本组合产生。直接从模板出发容易遗漏真实用户路径，也容易把实现结构误当成问题边界。

后果：审计流程需要保留生成物问题报告，并把模板溯源作为第二阶段。

### ADR-002：命令行验证是主信号，LSP 是补充信号

决策：`build` 与 `lint` 是判断生成项目是否干净的主基线；VSCode / Zed / LSP diagnostics 只用于补充编辑器体验观察。

原因：命令行结果稳定、可复现、适合 CI；编辑器诊断依赖本机插件和打开方式。

后果：后续 skill 可以收集 LSP 诊断，但不能因为 LSP 不可用而阻塞审计，也不能用 LSP 通过替代 `lint` 通过。

### ADR-003：不要直接用 auto-fix 结果替代模板修复

决策：`eslint --fix` 可以用于临时观察期望输出，但不能作为主要修复流程。

原因：auto-fix 会掩盖模板 whitespace、条件分支和策略问题，也可能把应当改配置的问题误导成改输出。

后果：最终修复应回到模板、partial、JSON mutation 或 ESLint policy。

### ADR-004：先清理当前 React / Vue preset，再提升 smoke 门槛

决策：先让当前 React 与 Vue preset 的生成项目 `lint` 干净，再把 `lint` 加入 linked generated-project smoke 的硬门槛。

原因：当前 `lint` 已知失败。立即把它加入 smoke 会把基线变红，而不是提高质量门槛。

后果：Phase 2 的第一批 slice 应聚焦模板和规则策略清理；清理完成后再升级 smoke。

### ADR-005：测试生成项目需要 agent lead，真实用户项目不默认携带

决策：为 linked smoke / example 生成项目考虑 `.create-yume/roadmap.md`、`.create-yume/audit.md` 或 `.create-yume/manifest.json` 作为 agent lead；真实用户生成项目默认仍只以 README 作为用户入口。

原因：测试生成项目承担审计样本和 agent 工作空间职责，需要携带生成来源、检查目标和“不要直接修生成物，应反查模板”的边界。真实用户项目不应被内部审计说明污染第一入口。

后果：后续实现 linked example smoke 或 generated scaffold audit skill 时，可以先在测试生成区注入 agent lead，再评估是否需要任何用户可见能力。

## S03 strategy-results：lint 策略结论与 S04 handoff

S03 的读者是继续升级生成项目 smoke gate 的维护者和 agent。读完本节后，应能执行一个动作：在 S04 中把真实生成项目的 build + lint 结果接入完整 smoke，而不重新争论已经闭合的策略边界。

S03 已闭合的策略结论如下：

1. React Refresh 问题通过生成代码形状解决。React Router 默认输出采用静态 page import，并保持 router module 专注于 route tree，不为了 `react-refresh/only-export-components` 引入额外文件、lazy component binding 或粗暴 override。这覆盖 R011 与 R012 的策略要求。
2. JSON key order 问题在源头输出阶段解决。package manifest 采用显式 manifest 顺序，TypeScript config 模板按 JSONC lint 期望输出；不通过 broad JSONC override 隐藏 `package.json` 或 `tsconfig` 排序问题。这覆盖 R011 对“优先改生成代码形状”的要求。
3. minimal-preset lint policy 保持简化默认 scaffold。minimal preset 仍表示“不启用 linting”，因此不为了追求统一 smoke 形态而默认加入 ESLint、lint script 或额外配置复杂度。S04 应验证 minimal preset 的 build 可用性，但不应把“缺少 lint script”误判成 minimal preset 的 lint-clean 失败。
4. Tailwind/lightningcss 属于 build-warning policy，不属于 lint-warning policy。Tailwind / Vite 构建中由 lightningcss 暴露的 warning 需要单独评估依赖与构建策略；它不是 `pnpm lint --max-warnings=0` 的 warning，也不应被写成 lint gate 的失败条件。
5. R006 的最终证明仍留给 S04。S03 新增的是 lint-enabled full preset 的 targeted strategy proof：真实生成 React/Vue full 项目、安装依赖，并用 `pnpm lint --max-warnings=0` 证明 React Router 与 JSON ordering 策略可以落到真实生成项目。S04 仍需升级 broader generated-projects 与 linked-examples smoke，使当前支持的 React/Vue 生成项目在真实路径下完成 build + lint gate。

执行边界：S04 可以修改完整 smoke matrix，但不应回退 S03 的静态 import、JSON source-order 或 minimal-preset lint 边界。若 S04 发现新的 lint failure，应先判断它是模板输出问题、生成策略问题、依赖/build warning，还是 smoke 命令定位问题，再决定是否回到模板或策略文档。

## S04 smoke-gate 结果与后续 handoff

S04 的读者是继续维护生成项目质量门槛的维护者和 agent。读完本节后，应能执行一个动作：在改动生成模板、CLI bin/link 入口或生成项目验证策略后，选择并解释正确的 smoke gate。

S04 已把真实生成项目 smoke 从“能生成、能安装、能构建”升级为 build + lint gate：preset matrix smoke 覆盖 React/Vue minimal/full，linked smoke 覆盖通过全局 link 后调用 `create-yume` 的 React/Vue full example 路径。所有生成项目都必须构建；lint-enabled full preset 还必须运行 `pnpm lint --max-warnings=0`，因此 0 error 与 0 warning 已成为 full preset 生成质量的硬门槛。

仍需保留的边界如下：

1. minimal preset 仍是 build-only。它们不应为了统一 smoke 形态而新增 ESLint config、lint script 或额外依赖；缺少这些 lint 资产不是 minimal preset 失败。
2. linked smoke 必须继续证明真实 linked bin/bootstrap 路径，而不是退回只调用构建产物的快捷路径。这个路径用于捕捉 package bin、global link、生成时安装与 example 工作区边界问题。
3. Tailwind/lightningcss build warning 仍属于构建/依赖策略问题，不是 ESLint warning。不要把 build 输出里的 lightningcss warning 解释成 `--max-warnings=0` lint gate 失败。
4. 失败排查应先看 smoke phase：generation、link、install/bootstrap、build、lint 分别指向不同责任面。lint phase 失败优先反查生成模板或 lint 策略；link/bootstrap 失败优先排查 package bin、pnpm global state、registry/cache 或 generated workspace 设置。

S04 之后，如果后续 slice 修改生成项目质量策略，至少应重新运行 generated smoke 与 linked smoke，并保留 `--max-warnings=0` 作为 full preset lint gate，除非有新的策略决策明确修改 lint-enabled preset 的定义。

## 建议迭代顺序

1. 建立生成物审计报告格式，保留当前 React / Vue preset 的 lint 输出摘要。
2. 为 linked smoke / example 生成项目设计 agent lead 文件，明确生成来源、检查目标和反查模板边界。
3. 修复机械模板问题：README 末尾换行、Vite config 空行、ESLint config 格式、Vue SFC 缩进与 style 块换行。
4. 修复明显语义问题：Vue 未使用导入、入口 import order。
5. 评估策略问题：React Refresh、JSON key order、Tailwind / lightningcss warning。
6. 已完成：将 build + `pnpm lint --max-warnings=0` 加入 generated 与 linked smoke gate，其中 minimal preset 保持 build-only。
7. 后续：把流程固化为 `generated-scaffold-audit` skill。

## 非目标

- 不在本阶段引入新的 scaffold 类型。
- 不在本阶段引入远程模板或插件系统。
- 不把生成项目质量审计变成通用前端最佳实践审计。
- 不依赖某个编辑器作为唯一验证来源。
