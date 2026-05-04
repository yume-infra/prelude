# pnpm Monorepo 约定

这个仓库使用 pnpm 管理工作区依赖，使用 Turborepo 编排构建、测试和 lint 等任务。

当前活跃的业务重点是 CLI 应用本身，因此大部分日常开发都会围绕它展开。

CLI 也可以通过 `workspace-root` preset 生成一个新的 pnpm workspace root：

```bash
create-yume --preset workspace-root --name my-workspace --install
```

这个 preset 只生成根目录文件。生成链路也支持通过结构化 package list 生成 `apps/*` 与 `libs/*` 下的子包；其中 runnable app/tool 位于 `apps/*`，shared library 位于 `libs/*`。完整 CLI / interactive package graph 配置会在后续任务中收敛。

## 依赖版本约定

仓库把外部依赖版本集中维护在 workspace catalog 中。

这意味着：

- 外部依赖版本有统一来源
- 各个工作区包不鼓励各自手写分散版本
- 依赖升级时，优先先看全局约定，再落到具体包

核心原则只有一个：**版本管理优先集中，而不是分散。**

## 常用命令

```bash
pnpm install
pnpm outdated
pnpm deps
pnpm deps:latest
pnpm build
pnpm build:cli
pnpm verify
```

## 新增外部依赖

当你需要引入新的外部依赖时，建议按下面顺序处理：

1. 先确认这个依赖是否真的属于仓库公共能力的一部分。
2. 把版本纳入统一的 catalog 管理。
3. 再把它添加到需要使用它的包里。
4. 最后执行安装并更新锁文件。

## 新增工作区内部依赖

工作区内的包之间互相引用时，应保持“明确声明内部依赖”的做法，而不是把它当成普通外部包处理。

简单说：

- 内部包之间的关系要清楚可见
- 已声明的内部依赖会写入 `workspace:*`
- 未声明的本地包不会被自动 link
- 不要让包解析悄悄退回到外部 registry 语义

## 需要更谨慎的改动

下面几类改动通常值得在提交前做更多确认：

- 调整构建工具链
- 升级大版本依赖
- 修改会影响整个 workspace 的依赖策略
- 修改 CLI 入口或打包相关配置

这类场景下，建议直接执行完整验证，而不是只跑局部命令。

## 相关入口

- [提交与协作说明](./contributing.md)
- [执行文档路线图](../agent/roadmap.md)
