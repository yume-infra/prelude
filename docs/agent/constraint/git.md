# 提交与 Git 约束

## 提交信息

1. 使用 conventional commits。
2. 使用 commitlint conventional 配置校验提交结构；为兼容 GSD auto-mode 根据任务摘要生成的提交，`subject-case`、`subject-full-stop` 与 `header-max-length` 不作为阻断规则。
3. 不使用 lobe-commit 生成提交信息。
4. 提交信息可手写，格式示例：`feat: add workspace bootstrap hooks`。

## 提交前验证

1. 代码与文档混合改动，至少执行 `pnpm verify`。
2. 仅代码改动，至少执行 `pnpm verify:code`，或按验证矩阵选择更精确的最低验证集。
3. 仅文档改动，至少做人工冷读、事实核对与入口检查。
4. 高风险区域改动不得跳过针对性验证。

## 提交边界

1. 一次提交应尽量聚焦一个明确意图。
2. 提交信息必须与实际改动相匹配。
3. 文档改动与行为改动应尽量保持同步，不要把两者长期拆开。
4. 不要把用户文档和执行文档混写到同一份提交说明逻辑里。
