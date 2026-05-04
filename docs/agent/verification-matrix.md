# 验证矩阵

## 使用规则

1. 先判断你改动落在哪一类。
2. 按表中最低验证命令执行。
3. 如果改动跨越多类，取更高的一档，或直接运行完整验证。
4. 如果你改动的是高风险区域，不要只凭感觉跳过验证。

## 验证矩阵

| 改动类型 | 常见影响面 | 最低验证命令 | 执行重点 |
| --- | --- | --- | --- |
| 新增或修改模板片段、partial | 模板渲染输出、模板注册表联动 | `pnpm --filter create-yume test` | 检查 planner snapshot 和 template render snapshot 是否只出现预期差异。 |
| 修改 planner 行为 | 计划生成、任务列表、产物编排 | `pnpm --filter create-yume test` | 确认计划结构变化可以被解释；若连带影响构建或入口行为，再补构建验证。 |
| 修改模板引擎或 helper 注册 | 模板能力边界、helper 解析、partial 注册 | `pnpm --filter create-yume test` | 重点看 helper 测试和模板渲染快照。 |
| 修改组合型文件生成逻辑 | 生成产物中的 `package.json` 等组合文件 | `pnpm --filter create-yume build` | 必要时额外生成实际项目检查产物是否符合预期。 |
| 修改 workspace root materialization | root `package.json`、`pnpm-workspace.yaml`、`turbo.json`、root-level commands、rollback | `pnpm --filter create-yume test -- workspace-root` | 检查 root 文件计划、dry-run preview、root package policy 和失败回滚。 |
| 修改 CLI 构建或入口配置 | 构建产物、打包元数据、入口可执行性 | `pnpm --filter create-yume build` | 确认 CLI 可被正确构建；若影响面更广，直接跑完整验证。 |
| 修改 CLI bin、link 入口或真实生成项目基线 | 全局链接、真实命令入口、生成项目安装、构建与 lint | `pnpm --filter create-yume smoke:generated && pnpm --filter create-yume smoke:examples` | 确认本地包可被 link 后以 `create-yume` 调用；`generated` 与 linked smoke 都必须构建生成项目，并对 lint-enabled 生成项目执行 `pnpm lint --max-warnings=0`。 |
| 只改文档 | 用户入口、说明文档、规则文档 | 人工校对 | 检查事实、入口、读者对象和语言风格是否正确。 |

## 完整验证入口

当你不确定影响面，或改动同时覆盖模板、运行时和构建配置时，直接执行：

```bash
pnpm verify
```

当前它覆盖：

- build
- test
- lint

## 执行提醒

- 不要把“测试能跑”当成“验证充分”。要看验证是否覆盖了你的真实改动面。
- 高风险区域一旦修改，必须用对应验证证明行为仍然成立。
- 文档改动虽然不需要自动化命令，但仍然必须人工冷读和事实核对。
