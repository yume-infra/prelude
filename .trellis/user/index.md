# 项目上下文总览

## 这个目录的作用

`.trellis/user/` 是给人读的项目地图，`.trellis/spec/` 是给 agent 执行的工程约束。

两者都是真源，但读者不同：

| 目录 | 主要读者 | 写法 |
| --- | --- | --- |
| `.trellis/user/` | user | 解释项目是什么、怎么读、哪里容易踩坑 |
| `.trellis/spec/` | agent | 记录可执行 contract、检查点、禁止模式和验证要求 |

旧的 `docs/` 目录不再作为真源。原来面向人的说明收敛到 `.trellis/user/`，原来面向执行的约束收敛到 `.trellis/spec/`。

## 项目一眼看懂

@sayoriqwq/prelude 是一个用于创建本地项目脚手架的 TypeScript CLI。它本身不是传统前端或后端应用，而是一个 CLI monorepo：

| 区域 | 角色 |
| --- | --- |
| `apps/cli` | CLI 本体、Effect runtime、schema、planner、template registry、templates |
| `apps/examples` | generated smoke 的可检查生成物落点 |
| `.trellis/spec/prelude` | @sayoriqwq/prelude 的 agent-facing 执行规范 |
| `.trellis/spec/examples` | examples/smoke 区域规范 |
| `.trellis/user` | user-facing 项目地图和阅读顺序 |

## 先读什么

1. 读本文件，先确认项目是 CLI monorepo，而不是传统业务应用拆分。
2. 读 [@sayoriqwq/prelude 项目说明](./prelude.md)，理解 CLI 生成链路。
3. 读 [生成脚手架说明](./generated-scaffolds.md)，理解当前支持范围。
4. 读 [产品能力清单与 TODO](./product-capabilities-and-todo.md)，确认已有能力、暂缓能力和下一步产品 TODO。
5. 读 [协作与验证说明](./contributing.md)，确认常用命令和提交前检查。
6. 开始改代码前，再读 `.trellis/spec/prelude/index.md` 和对应 layer。

## 什么时候维护 user docs

当改动会影响人如何理解项目时，更新 `.trellis/user/`：

- 支持的 scaffold 范围变了。
- package 或目录职责变了。
- 生成链路、模板系统、workspace package 关系变了。
- 常见误解或阅读顺序变了。

如果只是新增一条代码级禁止模式或测试断言，优先更新 `.trellis/spec/`；只有人也需要理解背景时才同步写进这里。
