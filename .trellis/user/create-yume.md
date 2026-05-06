# Create Yume 项目说明

## 它是什么

Create Yume 是一个脚手架生成 CLI。用户通过交互、preset 或结构化 spec 输入描述想创建的项目，CLI 会构建一份 `PlanSpec`，再把模板、组合型文件、post-generate commands 和 post-generate file actions 物化到目标目录。

它不是传统业务系统，也不应该按通用业务应用心智模型理解。更贴近的拆分是：

- CLI runtime
- generation model
- template system
- workspace package generation
- verification and generated smoke

## 核心目录怎么理解

| 路径 | 说明 |
| --- | --- |
| `apps/cli/src/index.ts` | CLI entrypoint |
| `apps/cli/src/schema/` | ProjectConfig、create spec、preset 等输入 contract |
| `apps/cli/src/core/questions/` | 交互和 preset 组合 |
| `apps/cli/src/core/services/` | Plan、TemplateEngine、Fs、Command 等 Effect service |
| `apps/cli/src/core/template-registry/` | 不同 scaffold family 的 template registry |
| `apps/cli/src/core/owners/` | router、state-management 等 capability owner |
| `apps/cli/src/core/modifier/` | package manifest 等组合型文件 mutation |
| `apps/cli/templates/` | 用户可见生成文件模板 |
| `apps/cli/tests/` | unit、snapshot、smoke、generated-output contract 测试 |

## 生成链路

Create Yume 的主链路是一条稳定 workflow：

1. 收集并 decode 输入。
2. 得到 `ProjectConfig`。
3. owner 贡献 generation units。
4. 构建 `Plan` / `PlanSpec`。
5. apply plan 写入文件。
6. 执行 post-generate command。
7. 执行 post-generate file action。

`--spec <file-or-json>` 也必须进入这条链路；它不是直接写文件的旁路。

## 最容易踩的点

- 不要把 `package.json` 当 Handlebars 模板，它是 owner contribution 汇合点。
- 不要让 child workspace package 复用 root package manifest policy。
- 不要用 root config 渲染 package-local templates。
- 不要把 `--print-spec` 当 dry-run JSON API。
- 不要在生成项目里手改 smoke 输出；要回到模板或 CLI runtime。
