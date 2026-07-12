import type { Output } from '@sayoriqwq/prelude-contract'

import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'

import { applyJsonOutput, detectOutputConflicts } from '../src/convergence.js'

const value: Output = { kind: 'JsonValue', id: 'value', path: 'settings.json', pointer: '/plugins/0/enabled', value: true }
const keyed: Output = { kind: 'JsonKeyedItem', id: 'keyed', path: 'settings.json', collectionPointer: '/plugins', keyField: 'name', keyValue: 'alpha', item: { name: 'alpha', enabled: true } }

describe('JSON authority composition', () => {
  it.effect('rejects JsonValue and JsonKeyedItem equal or ancestor authority in either order', () => Effect.sync(() => {
    for (const declarations of [[value, keyed], [keyed, value]]) {
      expect(detectOutputConflicts(declarations).map(conflict => conflict.kind)).toContain('jsonPointerOverlap')
    }
  }))

  it.effect('preserves comments when replacing one keyed item', () => Effect.sync(() => {
    const source = `{
  "plugins": [
    // alpha is required
    { "name": "alpha", "enabled": false }, // keep alpha note
    { "name": "beta", "enabled": true }
  ]
}
`
    const result = applyJsonOutput(source, keyed, 'settings.json')
    expect(result).toContain('// alpha is required')
    expect(result).toContain('// keep alpha note')
    expect(result).toContain('{ "name": "beta", "enabled": true }')
  }))

  it.effect('preserves collection comments when appending one keyed item', () => Effect.sync(() => {
    const source = `{
  "plugins": [
    // existing plugin
    { "name": "beta", "enabled": true }
  ]
}
`
    const result = applyJsonOutput(source, keyed, 'settings.json')
    expect(result).toContain('// existing plugin')
    expect(result).toContain('"name": "beta"')
    expect(result).toContain('"name": "alpha"')
  }))

  it.effect('appends through trailing commas and replans as a stable round trip', () => Effect.sync(() => {
    for (const source of ['{ "plugins": [] }\n', '{ "plugins": [ { "name": "beta" }, ] }\n']) {
      const result = applyJsonOutput(source, keyed, 'settings.json')
      expect(() => applyJsonOutput(result, keyed, 'settings.json')).not.toThrow()
      expect(applyJsonOutput(result, keyed, 'settings.json')).toBe(result)
    }
  }))

  it.effect('recursively replaces fields while preserving retained and independent comments', () => Effect.sync(() => {
    const source = `{
  "plugins": [{
    // identity stays
    "name": "alpha",
    // old field is removed
    "obsolete": true,
    // retained field note
    "enabled": false,
    // independent object note
  }]
}\n`
    const result = applyJsonOutput(source, { ...keyed, item: { name: 'alpha', enabled: true, options: { strict: true } } }, 'settings.json')
    expect(result).toContain('// identity stays')
    expect(result).toContain('// retained field note')
    expect(result).toContain('// independent object note')
    expect(result).not.toContain('obsolete')
    expect(result).toContain('"options"')
  }))
})
