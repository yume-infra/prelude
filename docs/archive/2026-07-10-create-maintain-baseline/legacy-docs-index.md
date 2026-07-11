---
audience: [agent, human]
authors:
  - codex
reviewed_by:
  - sayori
purpose: 作为 docs 目录的入口，声明当前 active 文档、读取顺序和文档职责边界。
status: archived
sources: []
updated: 2026-07-08
---

# Prelude Docs

## Scope

`docs/` 是 `prelude` 当前唯一 active project knowledge source。

本目录描述最终架构，不记录迁移状态作为 durable architecture。

旧 `main` 和旧 create-yume 只能作为 ability intent baseline。

旧 `main` 和旧 create-yume MUST NOT become implementation baseline.

## Read Order

1. [`prelude-goal.md`](./prelude-goal.md)
   - 产品北极星、第一用户、取舍和非目标。
2. [`create-maintain-architecture.md`](./create-maintain-architecture.md)
   - `create` 和 `maintain` 两条主线、关联点和最小设计边界。
3. [`prelude-final-state.md`](./prelude-final-state.md)
   - 重建完成后的最终架构状态。
4. [`prelude-rebuild-plan.md`](./prelude-rebuild-plan.md)
   - 需要删除、需要建设和如何判断重建对齐。
5. [`prelude-rebuild-acceptance-matrix.md`](./prelude-rebuild-acceptance-matrix.md)
   - 重建验收门禁、能力恢复、Effect v4、create/maintain 和 generated smoke。
6. [`create-materialization-architecture.md`](./create-materialization-architecture.md)
   - create materialization、create surfaces、WritePlan、handoff 和 maintain initialization。
7. [`maintain-architecture.md`](./maintain-architecture.md)
   - maintain 主线、manifest、managed claims、drift check 和 maintain domains。
8. [`provider-artifact-placement-architecture.md`](./provider-artifact-placement-architecture.md)
   - provider artifact selection、target placement、managed claims 和 npm provider package 主口径。
9. [`agents/`](../../agents/)
   - 当前 operational agent 配置位于 archive 外，不属于本历史架构快照。

## Current Contract

- Product direction: [`prelude-goal.md`](./prelude-goal.md)
- Two-mainline architecture: [`create-maintain-architecture.md`](./create-maintain-architecture.md)
- Target architecture: [`prelude-final-state.md`](./prelude-final-state.md)
- Rebuild execution: [`prelude-rebuild-plan.md`](./prelude-rebuild-plan.md)
- Rebuild acceptance gates: [`prelude-rebuild-acceptance-matrix.md`](./prelude-rebuild-acceptance-matrix.md)
- Create materialization: [`create-materialization-architecture.md`](./create-materialization-architecture.md)
- Maintain model: [`maintain-architecture.md`](./maintain-architecture.md)
- Provider artifact placement: [`provider-artifact-placement-architecture.md`](./provider-artifact-placement-architecture.md)
- Current operational agent configuration outside this archive:
  [`agents/`](../../agents/)

## Policy

Goal documents explain why the product exists.

Architecture documents explain what the finished system must look like.

Rebuild plans name deletion targets, construction targets, and acceptance criteria.

Create materialization documents explain how resolved create intent becomes files.

Maintain documents explain how managed surfaces evolve after create.

Provider placement documents explain how versioned provider artifacts become target-local managed locators.

Agent docs explain how external engineering skills should operate in this repo.

Temporary implementation stages MUST NOT be recorded as durable architecture.
