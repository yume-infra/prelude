# Create Yume

> 一个专注于 React / Vue 项目与 pnpm workspace root 的现代脚手架，用 Effect 驱动交互、模板编排与生成流程。

Create Yume 用来把“新建项目”这件事做得更稳一点。

它当前不追求覆盖所有框架、所有模板来源、所有工程玩法，而是把范围收紧在三件事上：

- 生成 React 项目
- 生成 Vue 项目
- 生成 pnpm workspace root

在这个范围内，它更关心三个问题：

- 交互配置是否清楚
- 模板生成是否可组合、可验证
- 脚手架自身的实现边界是否稳定

## 为什么是这个仓库

这个仓库不只是一个能跑的 CLI。

它也是一个正在持续打磨的脚手架代码库：

- 用 Effect 组织命令执行、配置收集和错误边界
- 用模板注册与计划生成来描述“生成什么”
- 用明确的文档分层来区分用户说明与实现约束

如果你关心的不只是“怎么生成项目”，还包括“脚手架本身如何组织得更清楚”，这个仓库就是围绕这件事展开的。

## 当前支持范围

- React 项目脚手架
- Vue 项目脚手架
- pnpm workspace root 脚手架

## 当前不支持的范围

- Node 项目脚手架
- workspace 子包生成
- 远程模板
- 插件化模板来源
- 对已有项目做增量式改造

## 快速开始

### 安装依赖并构建

```bash
git clone <repository-url>
cd create-yume
pnpm install
pnpm build
```

### 运行 CLI

```bash
# 交互模式
node apps/cli/dist/index.js

# 非交互 preset 模式
node apps/cli/dist/index.js --preset react-full --name my-app --install

# 生成 pnpm workspace root，不生成子包
node apps/cli/dist/index.js --preset workspace-root --name my-workspace --install

# 预览生成计划，不创建目录、不写文件、不执行命令
node apps/cli/dist/index.js --preset react-full --name my-app --dry-run

# 失败时保留现场，方便排错
node apps/cli/dist/index.js --p vue-full --name my-app --no-rollback
```

### Dry run 预览

`--dry-run` 会复用正常的配置收集与计划构建路径，并打印 human-readable 预览：计划生成的文件、组合型任务的 owner/unit trace、将要执行的 post-generate commands，以及已结构化的 post-generate file actions（例如 Husky hook 文件）。

Dry run 不会创建目标目录、不会写入生成文件、不会执行 `pnpm install`、`git init`、Husky 初始化或任何其他后置命令。它只展示已经进入 PlanSpec 的文件任务和 file actions；未结构化的外部命令内部副作用不会被猜测或展开预览。

```bash
node apps/cli/dist/index.js --preset react-full --name my-app --dry-run --install --git
```

### 可选：建立全局链接

```bash
pnpm link
create-yume
```

## 常用命令

```bash
pnpm build
pnpm outdated
pnpm deps
pnpm deps:latest
pnpm verify
pnpm smoke:examples
```

## 文档入口

- [仓库文档路线图](./roadmap.md)
- [用户文档路线图](./docs/user/roadmap.md)
- [系统总架构](./docs/user/system-architecture.md)
- [执行文档路线图](./docs/agent/roadmap.md)

## 仓库内有什么

```text
apps/cli/      CLI 本体、问题流、模板注册与生成逻辑
docs/user/     面向使用者与贡献者的说明文档
docs/agent/    面向实现与维护工作的约束文档
docs/agent/effect/  本地 Effect 参考与代码风格基线
```

## 提交与协作

仓库使用 conventional commits，并通过 commitlint 校验提交信息。当前没有 `pnpm commit` 或 `pnpm commit:config` 辅助脚本；提交时请直接手写符合约定的提交信息。

```bash
git commit -m "docs: align project documentation"
```

更多约定见：

- [提交与协作说明](./docs/user/contributing.md)
- [pnpm Monorepo 约定](./docs/user/pnpm-monorepo.md)

## 致谢

- [Effect](https://effect.website/)
- [@clack/prompts](https://github.com/natemoo-re/clack)
- [create-better-t-stack](https://github.com/AmanVarshney01/create-better-t-stack)
- [Create Hana](https://github.com/hanaboso/create-hana)
