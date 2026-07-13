import { createHash } from 'node:crypto'
import { describe, expect, test } from '@effect/vitest'

import {
  CANONICAL_TREE_ARCHIVE_FORMAT,
  decodeCanonicalTreeArchive,
  encodeCanonicalTreeArchive,
} from '../src/index.js'

const encoder = new TextEncoder()

function frame(header: unknown, payload = new Uint8Array()): Uint8Array {
  const magic = encoder.encode(`${CANONICAL_TREE_ARCHIVE_FORMAT}\n`)
  const headerBytes = encoder.encode(typeof header === 'string' ? header : JSON.stringify(header))
  const bytes = new Uint8Array(magic.length + 8 + headerBytes.length + payload.length)
  bytes.set(magic)
  new DataView(bytes.buffer).setBigUint64(magic.length, BigInt(headerBytes.length), false)
  bytes.set(headerBytes, magic.length + 8)
  bytes.set(payload, magic.length + 8 + headerBytes.length)
  return bytes
}

describe('canonical PinnedReferenceTree archive', () => {
  test('round trips exact files, empty directories, modes, and safe relative symlinks', () => {
    const encoded = encodeCanonicalTreeArchive([
      { kind: 'symbolicLink', path: 'CLAUDE.md', mode: 0o777, target: 'AGENTS.md' },
      { kind: 'directory', path: 'empty', mode: 0o700 },
      { kind: 'file', path: 'AGENTS.md', mode: 0o644, bytes: encoder.encode('source guidance\n') },
      { kind: 'directory', path: 'docs', mode: 0o755 },
      { kind: 'file', path: 'docs/README.md', mode: 0o644, bytes: encoder.encode('outer source guide\n') },
    ])
    const decoded = decodeCanonicalTreeArchive(encoded.bytes)

    expect(decoded.format).toBe(CANONICAL_TREE_ARCHIVE_FORMAT)
    expect(decoded.entries.map(entry => [entry.kind, entry.path])).toEqual([
      ['file', 'AGENTS.md'],
      ['symbolicLink', 'CLAUDE.md'],
      ['directory', 'docs'],
      ['file', 'docs/README.md'],
      ['directory', 'empty'],
    ])
    expect(decoded.treeDigest).toBe(encoded.treeDigest)
    const agents = decoded.entries.find((entry): entry is Extract<typeof entry, { readonly kind: 'file' }> => entry.kind === 'file' && entry.path === 'AGENTS.md')
    expect(agents).toMatchObject({ mode: 0o644 })
    expect(new TextDecoder().decode(agents?.bytes)).toBe('source guidance\n')
  })

  test('is byte deterministic regardless of source entry order', () => {
    const first = encodeCanonicalTreeArchive([
      { kind: 'directory', path: 'nested', mode: 0o755 },
      { kind: 'file', path: 'nested/a.txt', mode: 0o644, bytes: encoder.encode('a') },
      { kind: 'file', path: 'z.txt', mode: 0o600, bytes: encoder.encode('z') },
    ])
    const second = encodeCanonicalTreeArchive([
      { kind: 'file', path: 'z.txt', mode: 0o600, bytes: encoder.encode('z') },
      { kind: 'file', path: 'nested/a.txt', mode: 0o644, bytes: encoder.encode('a') },
      { kind: 'directory', path: 'nested', mode: 0o755 },
    ])
    expect(first.bytes).toEqual(second.bytes)
    expect(first.treeDigest).toBe(second.treeDigest)
  })

  test('keeps the published archive and logical tree vectors stable', () => {
    const encoded = encodeCanonicalTreeArchive([
      { kind: 'file', path: 'AGENTS.md', mode: 0o644, bytes: encoder.encode('source guidance\n') },
      { kind: 'symbolicLink', path: 'CLAUDE.md', mode: 0o777, target: 'AGENTS.md' },
      { kind: 'directory', path: 'empty', mode: 0o700 },
    ])
    expect(encoded.treeDigest).toBe('03676e82dc79b7bd17ca57ff044d98b7acbce7472a16b0a2df6c34ae36e8c4f6')
    expect(createHash('sha256').update(encoded.bytes).digest('hex')).toBe('afbdbe4a7cb1030e98719c0ae23e05e39ab1471a8d90f6f7dee3728986eff36b')
    expect(encoded.bytes.length).toBe(368)
  })

  test('rejects trailing bytes, noncanonical header framing, and file hash mismatch', () => {
    const encoded = encodeCanonicalTreeArchive([{ kind: 'file', path: 'a.txt', mode: 0o644, bytes: encoder.encode('a') }])
    const trailing = new Uint8Array(encoded.bytes.length + 1)
    trailing.set(encoded.bytes)
    expect(() => decodeCanonicalTreeArchive(trailing)).toThrow(/trailing|payload|length/i)

    const decoded = decodeCanonicalTreeArchive(encoded.bytes)
    const entry = decoded.entries[0]
    expect(entry?.kind).toBe('file')
    const badHeader = { format: CANONICAL_TREE_ARCHIVE_FORMAT, entries: [{ kind: 'file', path: 'a.txt', mode: 0o644, size: 1, hash: '0'.repeat(64) }] }
    expect(() => decodeCanonicalTreeArchive(frame(badHeader, encoder.encode('a')))).toThrow(/hash/i)
    expect(() => decodeCanonicalTreeArchive(frame(`{ "format": "${CANONICAL_TREE_ARCHIVE_FORMAT}", "entries": [] }`))).toThrow(/canonical/i)
  })

  test.each([
    { label: 'duplicate path', entries: [{ kind: 'directory', path: 'a', mode: 0o755 }, { kind: 'directory', path: 'a', mode: 0o755 }] },
    { label: 'portable case collision', entries: [{ kind: 'file', path: 'A', mode: 0o644, size: 0, hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }, { kind: 'file', path: 'a', mode: 0o644, size: 0, hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }] },
    { label: 'path escape', entries: [{ kind: 'directory', path: '../outside', mode: 0o755 }] },
    { label: 'missing parent directory', entries: [{ kind: 'file', path: 'a/b.txt', mode: 0o644, size: 0, hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }] },
    { label: 'hardlink', entries: [{ kind: 'hardlink', path: 'a', mode: 0o644, target: 'b' }] },
    { label: 'device', entries: [{ kind: 'device', path: 'a', mode: 0o600 }] },
    { label: 'FIFO', entries: [{ kind: 'fifo', path: 'a', mode: 0o600 }] },
    { label: 'socket', entries: [{ kind: 'socket', path: 'a', mode: 0o600 }] },
    { label: 'unsafe symlink', entries: [{ kind: 'symbolicLink', path: 'a', mode: 0o777, target: '../outside' }] },
    { label: 'noncanonical symlink mode', entries: [{ kind: 'symbolicLink', path: 'a', mode: 0o755, target: 'b' }] },
    { label: 'invalid mode', entries: [{ kind: 'directory', path: 'a', mode: 0o1777 }] },
  ])('rejects $label archive entries', ({ entries }) => {
    expect(() => decodeCanonicalTreeArchive(frame({ format: CANONICAL_TREE_ARCHIVE_FORMAT, entries }))).toThrow()
  })
})
