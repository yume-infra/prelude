# Create Yume

> 一个支持 React、Vue、pnpm workspace root、Node、CLI tool 与结构化 workspace package 生成的现代本地脚手架，用 Effect 驱动交互、模板编排与生成流程。

Create Yume 用来把“新建项目”这件事做得更稳一点。

它当前不追求覆盖所有框架、所有模板来源、所有工程玩法，而是把范围收紧在几类本地项目上：

- 生成 React 项目
- 生成 Vue 项目
- 生成 pnpm workspace 根目录
- 生成 TypeScript ESM Node 项目
- 生成 TypeScript ESM CLI tool
- 生成 TypeScript ESM library package
- 通过结构化 package list 生成 workspace 子包

在这个范围内，它更关心三个问题：

- 交互配置是否清楚
- 模板生成是否可组合、可验证
- 脚手架自身的实现边界是否稳定

## 为什么是这个仓库

这个仓库不只是一个能跑的 CLI。

它也是一个正在持续打磨的脚手架代码库：

- 用 Effect 组织命令执行、配置收集和错误边界
- 用模板注册与计划生成来描述“生成什么”
- 用明确的 Trellis 知识分层来区分用户说明与实现约束

如果你关心的不只是“怎么生成项目”，还包括“脚手架本身如何组织得更清楚”，这个仓库就是围绕这件事展开的。

## 当前支持范围

- React 项目脚手架
- Vue 项目脚手架
- pnpm workspace root 脚手架
- Node 项目脚手架
- CLI tool 脚手架
- Library package 脚手架
- 结构化 workspace package 生成：app/tool 位于 `apps/*`，library 位于 `libs/*`

## 当前不支持的范围

- 对已有 workspace 做 append / update 的增量式改造
- worker app 生成
- 通过 CLI flag 或交互问题完整配置任意 workspace package graph
- 远程模板
- 插件化模板来源

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
node apps/cli/dist/index.js --preset standalone-react-full --name my-app --install
node apps/cli/dist/index.js --preset workspace-root-minimal --name my-workspace
node apps/cli/dist/index.js --preset workspace-cli-library --name my-tool-workspace
node apps/cli/dist/index.js --preset workspace-fullstack-react --name my-fullstack
node apps/cli/dist/index.js --preset standalone-library-minimal --name my-lib
node apps/cli/dist/index.js --preset standalone-backend-minimal --name my-node-app
node apps/cli/dist/index.js --preset standalone-backend-full --name my-node-app
node apps/cli/dist/index.js --preset standalone-cli-minimal --name my-tool
node apps/cli/dist/index.js --preset standalone-cli-effect --name my-effect-tool
node apps/cli/dist/index.js --preset standalone-cli-full --name my-full-effect-tool

# 明确禁止 prompts，适合 CI 或模型调用
node apps/cli/dist/index.js --preset standalone-cli-minimal --name my-tool --no-input

# 预览生成计划，不创建目录、不写文件、不执行命令
node apps/cli/dist/index.js --preset standalone-react-full --name my-app --dry-run
node apps/cli/dist/index.js --preset workspace-root-minimal --name my-workspace --dry-run
node apps/cli/dist/index.js --preset workspace-cli-library --name my-tool-workspace --dry-run
node apps/cli/dist/index.js --preset standalone-cli-minimal --name my-tool --dry-run
node apps/cli/dist/index.js --preset standalone-cli-effect --name my-effect-tool --dry-run

# 导出 preset / flags 解析后的 create spec
node apps/cli/dist/index.js --preset standalone-react-full --name my-app --print-spec

# 失败时保留现场，方便排错
node apps/cli/dist/index.js --p vue-full --name my-app --no-rollback
```

短名 preset 仍作为兼容 alias 保留：`react-minimal`、`react-full`、`vue-minimal`、`vue-full`、`workspace-root`、`node-minimal`、`cli-minimal`、`cli-effect`。新文档优先使用包含 shape / package kind 的 canonical preset 名称。

`standalone-cli-minimal` 继续生成 dependency-light 的 `toolkit: "none"` CLI。需要 Effect runtime 的 CLI 时，使用 `standalone-cli-effect`，或在结构化 create spec 的 `cli.toolkit` 中声明 `"effect"`。

`workspace-cli-library` 是偏 CLI 的 workspace starter：默认生成 `apps/cli` 与 `libs/core`，并让 CLI package 通过显式 `workspace:*` 依赖引用 core。更自由的 package graph 仍建议使用结构化 `--spec` 输入。

### 结构化 `--spec` 输入

复杂 workspace package graph 使用结构化 create spec，而不是把子包列表塞进一长串 CLI flags。`--spec` 可以接收 JSON 文件路径，也可以接收 inline JSON；`--name` 仍然负责目标目录名。

```bash
node apps/cli/dist/index.js --spec create-yume.json --name my-workspace --dry-run --no-input
node apps/cli/dist/index.js --spec '{"shape":"workspace","packages":[]}' --name empty-workspace --print-spec --no-input
```

`create-yume.json` 示例：

```json
{
  "shape": "workspace",
  "packages": [
    {
      "id": "web",
      "name": "@demo/web",
      "kind": "frontend-app",
      "frontend": {
        "framework": "react",
        "buildTool": "vite",
        "cssPreprocessor": "less",
        "cssFramework": "none"
      }
    },
    {
      "id": "tool",
      "name": "@demo/tool",
      "kind": "cli-tool",
      "cli": {
        "toolkit": "effect"
      },
      "internalDependencies": [
        {
          "target": {
            "by": "id",
            "id": "shared"
          }
        }
      ]
    },
    {
      "id": "shared",
      "name": "@demo/shared",
      "kind": "library-package",
      "library": {
        "toolkit": "none"
      }
    }
  ]
}
```

当前 `--spec` 走同一条生成链路：先 schema decode，再适配到内部 `ProjectConfig`，最后进入 Plan / PlanSpec。`worker-app` 仍只是保留的 schema 边界，还没有可生成模板。

### Dry run 预览

`--dry-run` 会复用正常的配置收集与计划构建路径，并打印 human-readable 预览：计划生成的文件、组合型任务的 owner/unit trace、将要执行的 post-generate commands，以及已结构化的 post-generate file actions（例如 Husky hook 文件）。

Dry run 不会创建目标目录、不会写入生成文件、不会执行 `pnpm install`、`git init`、Husky 初始化或任何其他后置命令。它只展示已经进入 PlanSpec 的文件任务和 file actions；未结构化的外部命令内部副作用不会被猜测或展开预览。包含 workspace 子包时，预览会把 root files 与 workspace package files 分组，方便审计根目录和 `apps/*` / `libs/*` 产物。

```bash
node apps/cli/dist/index.js --preset standalone-react-full --name my-app --dry-run --install --git
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
pnpm smoke:dry-run
pnpm smoke:examples
```

`pnpm smoke:examples` 会把生成物落到 `apps/examples/.generated/`，成功后也保留，方便直接检查真实 scaffold 输出。慢 smoke 不需要每次全跑；只改某类模板或生成链路时，用 `CREATE_YUME_SMOKE_CASES` 选择相关 case：

```bash
CREATE_YUME_SMOKE_CASES=react pnpm smoke:examples
CREATE_YUME_SMOKE_CASES=cli,library pnpm smoke:examples
CREATE_YUME_SMOKE_CASES=workspace pnpm smoke:examples
```

## 项目知识入口

- [项目上下文总览](./.trellis/user/index.md)
- [Create Yume 项目说明](./.trellis/user/create-yume.md)
- [生成脚手架说明](./.trellis/user/generated-scaffolds.md)
- [执行规范索引](./.trellis/spec/create-yume/index.md)

## 仓库内有什么

```text
apps/cli/      CLI 本体、问题流、模板注册与生成逻辑
apps/examples/ generated smoke 的可检查生成物落点
.trellis/user/ 面向使用者与贡献者的项目上下文
.trellis/spec/ 面向实现与维护工作的执行规范
```

## 提交与协作

仓库使用 conventional commits，并通过 commitlint 校验提交信息。当前没有 `pnpm commit` 或 `pnpm commit:config` 辅助脚本；提交时请直接手写符合约定的提交信息。

```bash
git commit -m "docs: align project documentation"
```

更多约定见：

- [协作与验证说明](./.trellis/user/contributing.md)
- [验证规范](./.trellis/spec/create-yume/verification/index.md)

## 致谢

- [Effect](https://effect.website/)
- [@clack/prompts](https://github.com/natemoo-re/clack)
- [create-better-t-stack](https://github.com/AmanVarshney01/create-better-t-stack)
- [Create Hana](https://github.com/hanaboso/create-hana)
