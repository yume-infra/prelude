import type { PostGenerateCommand } from '../../commands'
import type { TemplatePath } from '@/brand/template-path'
import type { ContributionTrace } from '@/core/ownership/model'
import type {
  JsonLiteral,
  PlanOperationSpec,
  PlanSpec,
  PostGenerateFileActionPhaseSpec,
} from '@/schema/plan-spec'
import { makeTemplatePath } from '@/brand/template-path'
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

type JsonReducer = JsonTask['reducers'][number] & {
  readonly [planOperationSpecSymbol]?: PlanOperationSpec
}

type TextTransform = TextTask['transforms'][number] & {
  readonly [planOperationSpecSymbol]?: PlanOperationSpec
}

function annotateOperation<T extends (...args: any[]) => any>(fn: T, spec: PlanOperationSpec): T {
  Object.defineProperty(fn, planOperationSpecSymbol, {
    value: spec,
    enumerable: false,
    configurable: false,
    writable: false,
  })
  return fn
}

function getOperationSpec(fn: ((...args: any[]) => unknown) | undefined, fallbackName: string): PlanOperationSpec | undefined {
  if (!fn) {
    return undefined
  }

  const spec = (fn as JsonReducer | TextTransform)[planOperationSpecSymbol]
  if (spec) {
    return spec
  }

  return {
    reducer: fn.name || fallbackName,
  }
}

function isJsonLiteral(value: unknown): value is JsonLiteral {
  if (value === null) {
    return true
  }

  switch (typeof value) {
    case 'string':
    case 'number':
    case 'boolean':
      return true
    case 'object':
      if (Array.isArray(value)) {
        return value.every(isJsonLiteral)
      }
      return Object.values(value).every(isJsonLiteral)
    default:
      return false
  }
}

function toJsonLiteral(value: unknown): JsonLiteral | undefined {
  return isJsonLiteral(value) ? value : undefined
}

export function toPlanSpec(plan: Plan): PlanSpec {
  return {
    tasks: plan.tasks.map((task) => {
      switch (task.kind) {
        case 'render': {
          const data = task.data === undefined ? undefined : toJsonLiteral(task.data)
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
          const base = task.base ? toJsonLiteral(task.base()) : undefined
          const finalize = getOperationSpec(task.finalize, 'finalize')
          return {
            kind: 'json',
            path: task.path,
            ...(task.ownership ? { ownership: task.ownership } : {}),
            ...(task.readExisting !== undefined ? { readExisting: task.readExisting } : {}),
            ...(task.sortKeys !== undefined ? { sortKeys: task.sortKeys } : {}),
            ...(base !== undefined ? { base } : {}),
            reducers: task.reducers.map((reducer) => {
              const spec = getOperationSpec(reducer, 'modify')
              return spec ?? { reducer: 'modify' }
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
              const spec = getOperationSpec(transform, 'transform')
              return spec ?? { reducer: 'transform' }
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
        const input = typeof patch === 'function' ? undefined : toJsonLiteral(patch)
        const reducer = annotateOperation((draft: Record<string, unknown>) => {
          const obj = typeof patch === 'function' ? patch(draft) : patch
          Object.assign(draft, obj)
        }, {
          reducer: typeof patch === 'function' ? patch.name || 'merge' : 'merge',
          ...(ownership ? { ownership } : {}),
          ...(input !== undefined ? { input } : {}),
        })
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
