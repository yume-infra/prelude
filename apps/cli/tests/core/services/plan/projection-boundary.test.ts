import { Effect, Exit } from 'effect'
import { describe, expect, it } from 'vitest'
import { makeTemplatePath } from '../../../../src/brand/template-path'
import { PlanSpecProjectionError } from '../../../../src/core/errors'
import { buildPlan } from '../../../../src/core/services/plan/build'
import { projectPlanSpec, toPlanSpec } from '../../../../src/core/services/planner'
import { decodePlanSpec } from '../../../../src/schema/plan-spec'

describe('planSpec projection boundary', () => {
  it('projects valid plans into schema-decodable PlanSpec values', async () => {
    const plan = buildPlan((dsl) => {
      dsl.render(makeTemplatePath('/templates/app.hbs'), 'src/app.ts', { framework: 'react', flags: [true, null] })
      dsl.copy(makeTemplatePath('/templates/static.txt'), 'static.txt')
      dsl.json('package.json')
        .readExisting()
        .sortKeys()
        .base(() => ({ name: 'demo', scripts: { dev: 'vite' } }))
        .merge({ dependencies: { react: '^19.0.0' } })
      dsl.text('README.md').base(() => '# Demo').transform(current => `${current}\n`)
    })

    const projected = await Effect.runPromise(projectPlanSpec(plan))
    const decoded = await Effect.runPromise(decodePlanSpec(projected))

    expect(decoded).toEqual(projected)
    expect(toPlanSpec(plan)).toEqual(projected)
  })

  it('rejects malformed render data with structured issue diagnostics', async () => {
    const plan = buildPlan((dsl) => {
      dsl.render(makeTemplatePath('/templates/app.hbs'), 'src/app.ts', { handler: () => 'not-json' })
    })

    const exit = await Effect.runPromiseExit(projectPlanSpec(plan))

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PlanSpecProjectionError)
      expect(exit.cause.error.issues).toEqual([
        {
          taskKind: 'render',
          targetPath: 'src/app.ts',
          fieldPath: 'tasks[0].data.handler',
          reason: 'Unsupported function value cannot be projected to JsonLiteral',
        },
      ])
    }
  })

  it('rejects malformed JSON base output before schema consumers trust it', async () => {
    const plan = buildPlan((dsl) => {
      dsl.json('package.json').base(() => ({ name: 'demo', invalid: BigInt(1) }))
    })

    const exit = await Effect.runPromiseExit(projectPlanSpec(plan))

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PlanSpecProjectionError)
      expect(exit.cause.error.issues).toEqual([
        expect.objectContaining({
          taskKind: 'json',
          targetPath: 'package.json',
          fieldPath: 'tasks[0].base.invalid',
          reason: 'Unsupported bigint value cannot be projected to JsonLiteral',
        }),
      ])
    }
  })

  it('rejects malformed object-form reducer input while preserving reducer identity', async () => {
    const plan = buildPlan((dsl) => {
      dsl.json('package.json').merge({ nested: { invalid: Symbol('secret') } })
    })

    const exit = await Effect.runPromiseExit(projectPlanSpec(plan))

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PlanSpecProjectionError)
      expect(exit.cause.error.issues).toEqual([
        expect.objectContaining({
          taskKind: 'json',
          targetPath: 'package.json',
          fieldPath: 'tasks[0].reducers[0].input.nested.invalid',
          reason: 'Unsupported symbol value cannot be projected to JsonLiteral',
        }),
      ])
    }
  })

  it('reports multiple malformed fields with nested field paths where practical', async () => {
    const plan = buildPlan((dsl) => {
      dsl.render(makeTemplatePath('/templates/app.hbs'), 'src/app.ts', {
        nested: [{ missing: undefined }, { runnable: () => 'nope' }],
      })
      dsl.json('package.json').base(() => ({ bad: undefined, alsoBad: BigInt(2) }))
    })

    const exit = await Effect.runPromiseExit(projectPlanSpec(plan))

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit) && exit.cause._tag === 'Fail') {
      expect(exit.cause.error).toBeInstanceOf(PlanSpecProjectionError)
      expect(exit.cause.error.issues).toEqual([
        expect.objectContaining({
          taskKind: 'render',
          targetPath: 'src/app.ts',
          fieldPath: 'tasks[0].data.nested[0].missing',
          reason: 'Unsupported undefined value cannot be projected to JsonLiteral',
        }),
        expect.objectContaining({
          taskKind: 'render',
          targetPath: 'src/app.ts',
          fieldPath: 'tasks[0].data.nested[1].runnable',
          reason: 'Unsupported function value cannot be projected to JsonLiteral',
        }),
        expect.objectContaining({
          taskKind: 'json',
          targetPath: 'package.json',
          fieldPath: 'tasks[1].base.bad',
          reason: 'Unsupported undefined value cannot be projected to JsonLiteral',
        }),
        expect.objectContaining({
          taskKind: 'json',
          targetPath: 'package.json',
          fieldPath: 'tasks[1].base.alsoBad',
          reason: 'Unsupported bigint value cannot be projected to JsonLiteral',
        }),
      ])
    }
  })

  it('keeps function-form merge patches compatible by omitting reducer input', async () => {
    function addScript() {
      return { scripts: { dev: 'vite' } }
    }

    const plan = buildPlan((dsl) => {
      dsl.json('package.json').merge(addScript)
    })

    await expect(Effect.runPromise(projectPlanSpec(plan))).resolves.toEqual({
      tasks: [
        {
          kind: 'json',
          path: 'package.json',
          reducers: [{ reducer: 'addScript' }],
        },
      ],
    })
  })
})
