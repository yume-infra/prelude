import type { PropertyPath } from 'lodash-es'
import { get as _get, merge as _merge, set as _set } from 'lodash-es'

export type JsonDraft = Record<string, unknown>
type Path = string | Array<string | number>

export function when(cond: boolean, mod: (draft: JsonDraft) => void) {
  return (draft: JsonDraft) => {
    if (cond)
      mod(draft)
  }
}

// mergeAt: 将一组键值合并到路径对应的对象下
function mergeAt(path: Path, values: Record<string, unknown>, opts?: { overwrite?: boolean }) {
  return (draft: JsonDraft) => {
    const p = path as PropertyPath
    const current = _get(draft, p)
    const base: Record<string, unknown> = (current && typeof current === 'object') ? (current as Record<string, unknown>) : {}
    if (opts?.overwrite === true) {
      _set(draft, p, _merge(base, values))
    }
    else {
    // 只在缺失时写入
      const merged: Record<string, unknown> = { ...base }
      for (const k of Object.keys(values)) {
        if (!(k in merged))
          merged[k] = values[k]
      }
      _set(draft, p, merged)
    }
  }
}

export function scripts(entries: Record<string, string>, opts?: { overwrite?: boolean }) {
  return mergeAt('scripts', entries, opts)
}

export function devDeps(entries: Record<string, string>, opts?: { overwrite?: boolean }) {
  return mergeAt('devDependencies', entries, opts)
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Object.prototype.toString.call(v) === '[object Object]'
}

export interface SortJsonKeysOptions {
  caseSensitive?: boolean
  natural?: boolean
  comparator?: (a: string, b: string) => number
}

// 深度排序对象键，确保稳定 JSON 输出（对象按键名排序，数组保持顺序）
// 默认大小写不敏感 + 自然排序，可通过 options 覆盖
// 和 eslint 规则依然有区别，怎么办
export function sortJsonKeys(
  input: Record<string, unknown>,
  options: SortJsonKeysOptions = {},
): Record<string, unknown> {
  const { caseSensitive = false, natural = true, comparator } = options
  const collator = new Intl.Collator(undefined, {
    numeric: natural,
    sensitivity: caseSensitive ? 'variant' : 'base',
  })
  const compare = comparator ?? ((a: string, b: string) => collator.compare(a, b))

  const sortDeep = (value: unknown): unknown => {
    if (Array.isArray(value))
      return value.map(sortDeep)
    if (isPlainObject(value)) {
      const entries = Object.entries(value)
      entries.sort(([ka], [kb]) => compare(ka, kb))
      const out: Record<string, unknown> = {}
      for (const [k, v] of entries) out[k] = sortDeep(v)
      return out
    }
    return value
  }

  return sortDeep(input) as Record<string, unknown>
}
