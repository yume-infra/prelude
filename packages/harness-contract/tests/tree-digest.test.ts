import { describe, expect, test } from '@effect/vitest'

import {
  canonicalTreeDigest,
  canonicalTreeDigestPayload,
  decodeTreeDigestSnapshot,
} from '../src/index.js'

describe('canonical V2 tree digest', () => {
  test('uses one exact JSON framing and path order', () => {
    const snapshot = decodeTreeDigestSnapshot({
      rootKind: 'directory',
      entries: [
        { kind: 'file', path: 'z.txt', mode: 0o644, hash: 'b'.repeat(64) },
        { kind: 'directory', path: 'empty', mode: 0o755 },
        { kind: 'file', path: 'a.txt', mode: 0o755, hash: 'a'.repeat(64) },
      ],
    })

    expect(canonicalTreeDigestPayload(snapshot)).toBe('{"algorithm":"prelude-tree-sha256-v1","rootKind":"directory","entries":[{"kind":"file","path":"a.txt","mode":493,"hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"kind":"directory","path":"empty","mode":493},{"kind":"file","path":"z.txt","mode":420,"hash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}]}')
    expect(canonicalTreeDigest(snapshot)).toBe('f939210d0b006b2e84a018a7bfc9bdabdbfc2627124c6174473708a3ffffae76')
  })

  test('frames safe relative symlinks without dereferencing them', () => {
    const snapshot = decodeTreeDigestSnapshot({ rootKind: 'directory', entries: [
      { kind: 'file', path: 'AGENTS.md', mode: 0o644, hash: 'c'.repeat(64) },
      { kind: 'symbolicLink', path: 'CLAUDE.md', mode: 0o777, target: 'AGENTS.md' },
    ] })
    expect(canonicalTreeDigestPayload(snapshot)).toContain('{"kind":"symbolicLink","path":"CLAUDE.md","mode":511,"target":"AGENTS.md"}')
    expect(canonicalTreeDigest(snapshot)).toBe('ab61d1bcedaf353ae86594c9d1b8e341e44419f299065a3b675cfcdce8d8bafb')
  })

  test('requires the portable symbolic-link mode', () => {
    expect(() => decodeTreeDigestSnapshot({ rootKind: 'directory', entries: [{ kind: 'symbolicLink', path: 'CLAUDE.md', mode: 0o755, target: 'AGENTS.md' }] })).toThrow()
  })

  test.each(['/outside', 'C:/outside', '..', '../../outside', 'dir\\file', 'bad\0target'])('rejects unsafe symlink target %j', (target) => {
    expect(() => decodeTreeDigestSnapshot({ rootKind: 'directory', entries: [{ kind: 'symbolicLink', path: 'CLAUDE.md', mode: 0o777, target }] })).toThrow()
  })

  test('allows contained parent traversal and preserves empty directories and modes', () => {
    expect(() => decodeTreeDigestSnapshot({ rootKind: 'directory', entries: [{ kind: 'symbolicLink', path: 'docs/link', mode: 0o777, target: '../AGENTS.md' }] })).not.toThrow()
    expect(canonicalTreeDigest(decodeTreeDigestSnapshot({ rootKind: 'directory', entries: [{ kind: 'directory', path: 'empty', mode: 0o755 }] })))
      .not
      .toBe(canonicalTreeDigest(decodeTreeDigestSnapshot({ rootKind: 'directory', entries: [{ kind: 'directory', path: 'empty', mode: 0o700 }] })))
  })
})
