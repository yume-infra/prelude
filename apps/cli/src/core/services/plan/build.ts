import type { PostGenerateCommand } from '../../commands'
import type { TemplatePath } from '@/brand/template-path'
import type { PlanSpecProjectionIssue } from '@/core/errors'
import type { ContributionTrace } from '@/core/ownership/model'
import type {
  JsonLiteral,
  PlanOperationSpec,
  PlanSpec,
  PostGenerateFileActionPhaseSpec,
} from '@/schema/plan-spec'
import { Effect } from 'effect'
import { makeTemplatePath } from '@/brand/template-path'
import { PlanSpecProjectionError } from '@/core/errors'
import { toPostGenerateCommandSpec } from '../../commands'

export interface JsonBuilder {
  readExisting: (flag?: boolean) => JsonBuilder
  sortKeys: (flag?: boolean) => JsonBuilder
  base: (fn: () => Record<string, unknown>) => JsonBuilder
  merge: (
    patch: Record<string, unknown> | ((draft: Record<string, unknown>) => Record<string, unknown>),
    ownership?: ContributionTrace,
  ) => JsonBuilder
  modify: (
    fn: (draft: Record<string, unknown>) => void,
    ownership?: ContributionTrace,
  ) => JsonBuilder
  finalize: (
    fn: (draft: Record<string, unknown>) => void,
    ownership?: ContributionTrace,
  ) => void
}

export interface TextBuilder {
  readExisting: (flag?: boolean) => TextBuilder
  base: (fn: () => string) => TextBuilder
  transform: (
    fn: (current: string) => string,
    ownership?: ContributionTrace,
  ) => TextBuilder
}

export interface ComposeDSL {
  json: (path: string, ownership?: ContributionTrace) => JsonBuilder
  text: (path: string, ownership?: ContributionTrace) => TextBuilder
  copy: (src: TemplatePath, path: string, ownership?: ContributionTrace) => void
  render: (src: TemplatePath, path: string, data?: object, ownership?: ContributionTrace) => void
}

export type GenerateTask = RenderTask | CopyTask
export type ModifyTask = JsonTask | TextTask
export type Task = GenerateTask | ModifyTask

interface ITask {
  kind: 'render' | 'copy' | 'json' | 'text'
  path: string
  ownership?: ContributionTrace
}

export interface RenderTask extends ITask {
  kind: 'render'
  src: string
  data?: unknown
}

export interface CopyTask extends ITask {
  kind: 'copy'
  src: string
}

export interface JsonTask extends ITask {
  kind: 'json'
  readExisting?: boolean
  sortKeys?: boolean
  reducers: Array<(draft: Record<string, unknown>) => void>
  base?: () => Record<string, unknown>
  finalize?: (draft: Record<string, unknown>) => void
}

export interface TextTask extends ITask {
  kind: 'text'
  readExisting?: boolean
  transforms: Array<(current: string) => string>
  base?: () => string
}

export interface PostGenerateFileAction {
  kind: 'write-file'
  path: string
  content: string
  phase: PostGenerateFileActionPhaseSpec
  ownership?: ContributionTrace
  executable?: boolean
}

export interface Plan {
  tasks: Task[]
  postGenerateCommands?: PostGenerateCommand[]
  postGenerateFileActions?: PostGenerateFileAction[]
}

const planOperationSpecSymbol = Symbol('planOperationSpec')
const planOperationRawInputSymbol = Symbol('planOperationRawInput')

type OperationWithProjectionMetadata = ((...args: any[]) => unknown) & {
  readonly [planOperationSpecSymbol]?: PlanOperationSpec
  readonly [planOperationRawInputSymbol]?: unknown
}

type ProjectionContext = Pick<PlanSpecProjectionIssue, 'taskKind' | 'targetPath'> & {
  readonly issues: PlanSpecProjectionIssue[]
}

interface ProjectionResult {
  readonly spec: PlanSpec
  readonly issues: PlanSpecProjectionIssue[]
}

function annotateOperation<T extends (...args: any[]) => any>(
  fn: T,
  spec: PlanOperationSpec,
  rawInput?: unknown,
): T {
  Object.defineProperty(fn, planOperationSpecSymbol, {
    value: spec,
    enumerable: false,
    configurable: false,
    writable: false,
  })
  if (rawInput !== undefined) {
    Object.defineProperty(fn, planOperationRawInputSymbol, {
      value: rawInput,
      enumerable: false,
      configurable: false,
      writable: false,
    })
  }
  return fn
}

function getOperationSpec(fn: ((...args: any[]) => unknown) | undefined, fallbackName: string): PlanOperationSpec | undefined {
  if (!fn) {
    return undefined
  }

  const spec = (fn as OperationWithProjectionMetadata)[planOperationSpecSymbol]
  if (spec) {
    return spec
  }

  return {
    reducer: fn.name || fallbackName,
  }
}

function hasRawOperationInput(fn: ((...args: any[]) => unknown) | undefined): fn is OperationWithProjectionMetadata {
  return !!fn && Object.hasOwn(fn, planOperationRawInputSymbol)
}

function unsupportedJsonReason(value: unknown): string {
  if (value === undefined) {
    return 'Unsupported undefined value cannot be projected to JsonLiteral'
  }

  return `Unsupported ${typeof value} value cannot be projected to JsonLiteral`
}

function isPlainJsonObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function projectJsonLiteral(value: unknown, fieldPath: string, context: ProjectionContext): JsonLiteral | undefined {
  if (value === null) {
    return null
  }

  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return value
    case 'undefined':
    case 'function':
    case 'symbol':
    case 'bigint':
      context.issues.push({
        taskKind: context.taskKind,
        targetPath: context.targetPath,
        fieldPath,
        reason: unsupportedJsonReason(value),
      })
      return undefined
    case 'object':
      if (Array.isArray(value)) {
        const arrayValue: JsonLiteral[] = []
        for (let index = 0; index < value.length; index += 1) {
          const item = projectJsonLiteral(value[index], `${fieldPath}[${index}]`, context)
          if (item !== undefined) {
            arrayValue.push(item)
          }
        }
        return arrayValue
      }

      if (!isPlainJsonObject(value)) {
        context.issues.push({
          taskKind: context.taskKind,
          targetPath: context.targetPath,
          fieldPath,
          reason: 'Unsupported object value cannot be projected to JsonLiteral',
        })
        return undefined
      }

      return Object.fromEntries(
        Object.entries(value)
          .flatMap(([key, nestedValue]) => {
            const projected = projectJsonLiteral(nestedValue, `${fieldPath}.${key}`, context)
            return projected === undefined ? [] : [[key, projected]]
          }),
      )
    default:
      context.issues.push({
        taskKind: context.taskKind,
        targetPath: context.targetPath,
        fieldPath,
        reason: 'Unsupported unknown value cannot be projected to JsonLiteral',
      })
      return undefined
  }
}

function projectOperationSpec(
  fn: ((...args: any[]) => unknown) | undefined,
  fallbackName: string,
  fieldPath: string,
  context: ProjectionContext,
): PlanOperationSpec | undefined {
  const spec = getOperationSpec(fn, fallbackName)
  if (!spec) {
    return undefined
  }

  if (!hasRawOperationInput(fn)) {
    return spec
  }

  const input = projectJsonLiteral(fn[planOperationRawInputSymbol], `${fieldPath}.input`, context)
  return {
    ...spec,
    ...(input !== undefined ? { input } : {}),
  }
}

function projectPlanSpecSync(plan: Plan): ProjectionResult {
  const issues: PlanSpecProjectionIssue[] = []
  const spec: PlanSpec = {
    tasks: plan.tasks.map((task, taskIndex) => {
      const context: ProjectionContext = {
        taskKind: task.kind,
        targetPath: task.path,
        issues,
      }

      switch (task.kind) {
        case 'render': {
          const data = task.data === undefined
            ? undefined
            : projectJsonLiteral(task.data, `tasks[${taskIndex}].data`, context)
          return {
            kind: 'render',
            path: task.path,
            src: makeTemplatePath(task.src),
            ...(data !== undefined ? { data } : {}),
            ...(task.ownership ? { ownership: task.ownership } : {}),
          }
        }
        case 'copy':
          return {
            kind: 'copy',
            path: task.path,
            src: makeTemplatePath(task.src),
            ...(task.ownership ? { ownership: task.ownership } : {}),
          }
        case 'json': {
          const base = task.base
            ? projectJsonLiteral(task.base(), `tasks[${taskIndex}].base`, context)
            : undefined
          const finalize = projectOperationSpec(task.finalize, 'finalize', `tasks[${taskIndex}].finalize`, context)
          return {
            kind: 'json',
            path: task.path,
            ...(task.ownership ? { ownership: task.ownership } : {}),
            ...(task.readExisting !== undefined ? { readExisting: task.readExisting } : {}),
            ...(task.sortKeys !== undefined ? { sortKeys: task.sortKeys } : {}),
            ...(base !== undefined ? { base } : {}),
            reducers: task.reducers.map((reducer, reducerIndex) => {
              const operation = projectOperationSpec(
                reducer,
                'modify',
                `tasks[${taskIndex}].reducers[${reducerIndex}]`,
                context,
              )
              return operation ?? { reducer: 'modify' }
            }),
            ...(finalize ? { finalize } : {}),
          }
        }
        case 'text': {
          const base = task.base?.()
          return {
            kind: 'text',
            path: task.path,
            ...(task.ownership ? { ownership: task.ownership } : {}),
            ...(task.readExisting !== undefined ? { readExisting: task.readExisting } : {}),
            ...(base !== undefined ? { base } : {}),
            transforms: task.transforms.map((transform) => {
              const operation = projectOperationSpec(transform, 'transform', `tasks[${taskIndex}].transforms`, context)
              return operation ?? { reducer: 'transform' }
            }),
          }
        }
        default: {
          const exhaustive: never = task
          return exhaustive
        }
      }
    }),
    ...(plan.postGenerateCommands
      ? {
          postGenerateCommands: plan.postGenerateCommands.map(toPostGenerateCommandSpec),
        }
      : {}),
    ...(plan.postGenerateFileActions
      ? {
          postGenerateFileActions: plan.postGenerateFileActions.map(action => ({
            kind: action.kind,
            path: action.path,
            content: action.content,
            phase: action.phase,
            ...(action.ownership ? { ownership: action.ownership } : {}),
            ...(action.executable !== undefined ? { executable: action.executable } : {}),
          })),
        }
      : {}),
  }

  return { spec, issues }
}

function makeProjectionError(issues: PlanSpecProjectionIssue[]): PlanSpecProjectionError {
  return new PlanSpecProjectionError({
    message: `PlanSpec projection failed with ${issues.length} issue${issues.length === 1 ? '' : 's'}`,
    issues,
  })
}

export function projectPlanSpec(plan: Plan): Effect.Effect<PlanSpec, PlanSpecProjectionError> {
  return Effect.suspend(() => {
    const { spec, issues } = projectPlanSpecSync(plan)
    return issues.length > 0 ? Effect.fail(makeProjectionError(issues)) : Effect.succeed(spec)
  })
}

export function toPlanSpec(plan: Plan): PlanSpec {
  const { spec, issues } = projectPlanSpecSync(plan)
  if (issues.length > 0) {
    throw makeProjectionError(issues)
  }
  return spec
}

export function buildPlan(program: (dsl: ComposeDSL) => void): Plan {
  const tasks: Task[] = []

  const json: ComposeDSL['json'] = (path, ownership) => {
    const task: JsonTask = { kind: 'json', path, reducers: [], ...(ownership ? { ownership } : {}) }
    tasks.push(task)
    const builder: JsonBuilder = {
      readExisting(flag) {
        if (flag === undefined)
          delete task.readExisting
        else
          task.readExisting = flag
        return builder
      },
      sortKeys(flag) {
        if (flag === undefined)
          delete task.sortKeys
        else
          task.sortKeys = flag
        return builder
      },
      base(fn) {
        task.base = fn
        return builder
      },
      merge(patch, ownership) {
        const reducer = annotateOperation((draft: Record<string, unknown>) => {
          const obj = typeof patch === 'function' ? patch(draft) : patch
          Object.assign(draft, obj)
        }, {
          reducer: typeof patch === 'function' ? patch.name || 'merge' : 'merge',
          ...(ownership ? { ownership } : {}),
        }, typeof patch === 'function' ? undefined : patch)
        task.reducers.push(reducer)
        return builder
      },
      modify(fn, ownership) {
        task.reducers.push(annotateOperation(fn, {
          reducer: fn.name || 'modify',
          ...(ownership ? { ownership } : {}),
        }))
        return builder
      },

      finalize(fn, ownership) {
        task.finalize = annotateOperation(fn, {
          reducer: fn.name || 'finalize',
          ...(ownership ? { ownership } : {}),
        })
        return builder
      },

    }
    return builder
  }

  const text: ComposeDSL['text'] = (path, ownership) => {
    const task: TextTask = { kind: 'text', path, transforms: [], ...(ownership ? { ownership } : {}) }
    tasks.push(task)
    const builder: TextBuilder = {
      readExisting(flag) {
        if (flag === undefined)
          delete task.readExisting
        else
          task.readExisting = flag
        return builder
      },
      base(fn) {
        task.base = fn
        return builder
      },
      transform(fn, ownership) {
        task.transforms.push(annotateOperation(fn, {
          reducer: fn.name || 'transform',
          ...(ownership ? { ownership } : {}),
        }))
        return builder
      },

    }
    return builder
  }

  const render: ComposeDSL['render'] = (src, path, data, ownership) => {
    tasks.push({ kind: 'render', src, path, ...(data !== undefined ? { data } : {}), ...(ownership ? { ownership } : {}) })
  }

  const copy: ComposeDSL['copy'] = (src, path, ownership) => {
    tasks.push({ kind: 'copy', src, path, ...(ownership ? { ownership } : {}) })
  }

  program({ json, text, render, copy })
  return { tasks }
}
