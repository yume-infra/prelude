# 用户文档路线图

- [系统总架构](./system-architecture.md)
- [架构审查](./architecture-review/roadmap.md)
- [pnpm Monorepo 约定](./pnpm-monorepo.md)
- [提交与协作说明](./contributing.md)

## 常用入口提示

- 使用 `--dry-run` 可以在不创建目标目录、不写文件、不执行 post-generate commands 的情况下查看生成计划。
- Dry run 输出来自 PlanSpec，并展示计划文件与后置命令摘要；它不会展开后置命令内部可能创建的文件效果。
- 使用 `--preset workspace-root-minimal` 可以生成 pnpm workspace root；这个简单 preset 只生成根文件，`workspace-root` 仍作为兼容 alias 保留。
- 使用 `--spec <file-or-json> --name <target>` 可以通过结构化 create spec 生成 `apps/*` 与 `libs/*` 子包；完整 CLI flag / interactive package graph 配置仍不在当前范围内。
- 使用 `--print-spec` 可以把交互或 preset / flags 解析后的 resolved create spec 输出，便于复用到模型调用或 CI。
