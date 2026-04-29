# 系统总架构

Create Yume 是一个用于创建前端项目的 CLI。

它当前把范围收在两类脚手架上：

- React
- Vue

目标不是覆盖所有模板来源和所有工程玩法，而是在有限范围内把交互配置、模板生成和实现边界组织得更稳定。

## 当前支持范围

- React 项目脚手架
- Vue 项目脚手架

当前主路径是：创建一个新项目，并生成一套完整的初始文件。

CLI 也支持 `--dry-run`：它复用正常配置收集与 PlanSpec 构建路径，打印将要生成的文件、post-generate commands，以及已结构化的 post-generate file actions（例如 Husky hook 文件），但不创建目标目录、不写文件、不执行命令。未结构化的外部命令内部副作用不会被猜测或展开预览。

## 当前不支持的范围

- Node 项目脚手架
- 远程模板
- 插件化模板来源
- 对已有项目做增量式改造

## 当前系统由什么组成

从整体上看，create-yume 目前由五个部分组成：

1. CLI 入口与交互层
2. 配置收集与问题编排层
3. 模板注册、计划生成与渲染执行层
4. 生成后的后置命令与文件动作层
5. 文档与协作约定层

## 当前架构方向

当前仓库已经进入 ownership-oriented architecture 的后续阶段，而不是停留在“尚未开始重构”的状态。

理解当前系统时，应把下面这些层级视为已存在的现实：

1. Preserved Core
2. Scaffold-Family Owner
3. Workspace / Bootstrap Owner
4. Capability Owner

其中，`router` 与 `state-management` 都已经进入 capability owner 的现实状态，不应再按早期试点口径理解系统。

## 架构分层

### 1. CLI 入口与交互层

这一层负责接收命令、处理交互输入，并把不同使用方式统一成同一份项目配置。

### 2. 配置收集与问题编排层

这一层负责把交互模式和 preset 模式收束为统一配置，再把配置交给后续生成流程。

### 3. 模板注册、计划生成与渲染执行层

这是脚手架的核心。

它负责：

- 决定在当前配置下需要生成哪些文件
- 决定哪些模板应被渲染
- 组织文件写入、复制和组合型内容生成
- 在启用 `antfu-eslint` 时生成 ESLint 配置及编辑器项目配置，目前覆盖 VSCode 与 Zed。

### 4. 生成后的后置命令与文件动作层

这一层负责项目生成完成后的可选动作，例如按 `--install` / `--no-install` 或交互选择安装依赖、按 `--git` / `--no-git` 或配置初始化 Git，以及在启用 code quality 工具时准备 Husky、lint-staged 与 commitlint。外部工具初始化仍通过 post-generate command 表示；Husky hook 的最终文件内容通过 post-generate file action 在 Husky 初始化之后写入并进入 dry-run 预览。仓库自身的验证入口由文档与协作约定层说明，不是生成项目时自动执行的步骤。

### 5. 文档与协作约定层

这一层负责把项目说明、用户文档、执行约束文档和协作规则分开组织，避免不同信息入口混在一起。

## 相关入口

- 用户文档路线图：[./roadmap.md](./roadmap.md)
- 执行文档路线图：[../agent/roadmap.md](../agent/roadmap.md)
