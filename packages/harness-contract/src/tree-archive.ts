import type { TreeDigestEntry, TreeDigestSnapshot } from './tree-digest.js'

import { createHash } from 'node:crypto'

import { isNormalizedRelativePath } from './primitives.js'
import { canonicalTreeDigest, isSafeRelativeSymlink, SYMBOLIC_LINK_MODE } from './tree-digest.js'

export const CANONICAL_TREE_ARCHIVE_FORMAT = 'prelude-canonical-tree-archive-v1' as const

export const CANONICAL_TREE_ARCHIVE_LIMITS = Object.freeze({
  maxArchiveBytes: 1024 * 1024 * 1024,
  maxEntries: 250_000,
  maxFileBytes: 512 * 1024 * 1024,
  maxHeaderBytes: 64 * 1024 * 1024,
  maxPathBytes: 4 * 1024,
  maxSymlinkTargetBytes: 4 * 1024,
})

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const magic = encoder.encode(`${CANONICAL_TREE_ARCHIVE_FORMAT}\n`)
const sha256Pattern = /^[a-f0-9]{64}$/

export type CanonicalTreeArchiveSourceEntry
  = | { readonly kind: 'directory', readonly path: string, readonly mode: number }
    | { readonly kind: 'file', readonly path: string, readonly mode: number, readonly bytes: Uint8Array }
    | { readonly kind: 'symbolicLink', readonly path: string, readonly mode: number, readonly target: string }

type CanonicalTreeArchiveHeaderEntry
  = | { readonly kind: 'directory', readonly path: string, readonly mode: number }
    | { readonly kind: 'file', readonly path: string, readonly mode: number, readonly size: number, readonly hash: string }
    | { readonly kind: 'symbolicLink', readonly path: string, readonly mode: number, readonly target: string }

export type DecodedCanonicalTreeArchiveEntry
  = | { readonly kind: 'directory', readonly path: string, readonly mode: number }
    | { readonly kind: 'file', readonly path: string, readonly mode: number, readonly size: number, readonly hash: string, readonly bytes: Uint8Array }
    | { readonly kind: 'symbolicLink', readonly path: string, readonly mode: number, readonly target: string }

export interface DecodedCanonicalTreeArchive {
  readonly format: typeof CANONICAL_TREE_ARCHIVE_FORMAT
  readonly entries: ReadonlyArray<DecodedCanonicalTreeArchiveEntry>
  readonly treeDigest: string
}

export interface EncodedCanonicalTreeArchive {
  readonly bytes: Uint8Array
  readonly treeDigest: string
}

function fail(message: string): never {
  throw new TypeError(`Invalid canonical tree archive: ${message}`)
}

function hash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function comparePath(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

export function portableArchivePathKey(path: string): string {
  return path.normalize('NFC').toLowerCase()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: ReadonlyArray<string>): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function validMode(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0o777
}

function validPath(value: unknown): value is string {
  return typeof value === 'string'
    && isNormalizedRelativePath(value)
    && encoder.encode(value).length <= CANONICAL_TREE_ARCHIVE_LIMITS.maxPathBytes
}

function decodeHeaderEntry(value: unknown): CanonicalTreeArchiveHeaderEntry {
  if (!isRecord(value) || typeof value.kind !== 'string')
    return fail('entry must be an object with a supported kind')
  if (!validPath(value.path))
    return fail('entry path must be a bounded normalized relative POSIX path')
  if (!validMode(value.mode))
    return fail(`entry ${value.path} has an invalid mode`)

  if (value.kind === 'directory') {
    if (!hasExactKeys(value, ['kind', 'path', 'mode']))
      return fail(`directory ${value.path} has invalid framing`)
    return { kind: value.kind, path: value.path, mode: value.mode }
  }
  if (value.kind === 'file') {
    if (!hasExactKeys(value, ['kind', 'path', 'mode', 'size', 'hash']))
      return fail(`file ${value.path} has invalid framing`)
    if (typeof value.size !== 'number' || !Number.isInteger(value.size) || value.size < 0 || value.size > CANONICAL_TREE_ARCHIVE_LIMITS.maxFileBytes)
      return fail(`file ${value.path} has an invalid size`)
    if (typeof value.hash !== 'string' || !sha256Pattern.test(value.hash))
      return fail(`file ${value.path} has an invalid hash`)
    return { kind: value.kind, path: value.path, mode: value.mode, size: value.size, hash: value.hash }
  }
  if (value.kind === 'symbolicLink') {
    if (!hasExactKeys(value, ['kind', 'path', 'mode', 'target']))
      return fail(`symbolic link ${value.path} has invalid framing`)
    if (typeof value.target !== 'string'
      || value.mode !== SYMBOLIC_LINK_MODE
      || encoder.encode(value.target).length > CANONICAL_TREE_ARCHIVE_LIMITS.maxSymlinkTargetBytes
      || !isSafeRelativeSymlink(value.path, value.target)) {
      return fail(`symbolic link ${value.path} has an unsafe target`)
    }
    return { kind: value.kind, path: value.path, mode: SYMBOLIC_LINK_MODE, target: value.target }
  }
  return fail(`entry ${value.path} uses unsupported kind ${value.kind}`)
}

function validateEntries(entries: ReadonlyArray<CanonicalTreeArchiveHeaderEntry>): void {
  if (entries.length > CANONICAL_TREE_ARCHIVE_LIMITS.maxEntries)
    return fail(`entry count exceeds ${CANONICAL_TREE_ARCHIVE_LIMITS.maxEntries}`)

  const exact = new Map<string, CanonicalTreeArchiveHeaderEntry>()
  const portable = new Set<string>()
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]!
    const previous = entries[index - 1]
    if (previous !== undefined && comparePath(previous.path, entry.path) >= 0)
      return fail('entries are not in strict deterministic path order or contain a duplicate')
    const portableKey = portableArchivePathKey(entry.path)
    if (portable.has(portableKey))
      return fail(`entry path has a portable collision: ${entry.path}`)
    portable.add(portableKey)
    exact.set(entry.path, entry)
  }

  for (const entry of entries) {
    const segments = entry.path.split('/')
    for (let length = 1; length < segments.length; length++) {
      const parent = exact.get(segments.slice(0, length).join('/'))
      if (parent?.kind !== 'directory')
        return fail(`entry ${entry.path} is missing an explicit directory parent`)
    }
  }
}

function headerValue(entries: ReadonlyArray<CanonicalTreeArchiveHeaderEntry>) {
  return {
    format: CANONICAL_TREE_ARCHIVE_FORMAT,
    entries: entries.map(entry => entry.kind === 'file'
      ? { kind: entry.kind, path: entry.path, mode: entry.mode, size: entry.size, hash: entry.hash }
      : entry.kind === 'symbolicLink'
        ? { kind: entry.kind, path: entry.path, mode: entry.mode, target: entry.target }
        : { kind: entry.kind, path: entry.path, mode: entry.mode }),
  }
}

function canonicalHeader(entries: ReadonlyArray<CanonicalTreeArchiveHeaderEntry>): string {
  return JSON.stringify(headerValue(entries))
}

function logicalEntry(entry: CanonicalTreeArchiveHeaderEntry | DecodedCanonicalTreeArchiveEntry): TreeDigestEntry {
  return entry.kind === 'file'
    ? { kind: entry.kind, path: entry.path, mode: entry.mode, hash: entry.hash }
    : entry.kind === 'symbolicLink'
      ? { kind: entry.kind, path: entry.path, mode: SYMBOLIC_LINK_MODE, target: entry.target }
      : { kind: entry.kind, path: entry.path, mode: entry.mode }
}

function logicalSnapshot(entries: ReadonlyArray<CanonicalTreeArchiveHeaderEntry | DecodedCanonicalTreeArchiveEntry>): TreeDigestSnapshot {
  return { rootKind: 'directory', entries: entries.map(logicalEntry) }
}

export function encodeCanonicalTreeArchive(
  sourceEntries: ReadonlyArray<CanonicalTreeArchiveSourceEntry>,
): EncodedCanonicalTreeArchive {
  const sources = [...sourceEntries].sort((left, right) => comparePath(left.path, right.path))
  const files = new Map<string, Uint8Array>()
  const entries = sources.map((entry): CanonicalTreeArchiveHeaderEntry => {
    if (entry.kind !== 'file')
      return decodeHeaderEntry(entry)
    if (!(entry.bytes instanceof Uint8Array))
      return fail(`file ${entry.path} bytes must be a Uint8Array`)
    files.set(entry.path, entry.bytes)
    return decodeHeaderEntry({ kind: entry.kind, path: entry.path, mode: entry.mode, size: entry.bytes.length, hash: hash(entry.bytes) })
  })
  validateEntries(entries)

  const headerBytes = encoder.encode(canonicalHeader(entries))
  if (headerBytes.length > CANONICAL_TREE_ARCHIVE_LIMITS.maxHeaderBytes)
    return fail(`header exceeds ${CANONICAL_TREE_ARCHIVE_LIMITS.maxHeaderBytes} bytes`)
  const payloadBytes = entries.reduce((total, entry) => total + (entry.kind === 'file' ? entry.size : 0), 0)
  const archiveBytes = magic.length + 8 + headerBytes.length + payloadBytes
  if (!Number.isSafeInteger(archiveBytes) || archiveBytes > CANONICAL_TREE_ARCHIVE_LIMITS.maxArchiveBytes)
    return fail(`archive exceeds ${CANONICAL_TREE_ARCHIVE_LIMITS.maxArchiveBytes} bytes`)

  const bytes = new Uint8Array(archiveBytes)
  bytes.set(magic)
  new DataView(bytes.buffer).setBigUint64(magic.length, BigInt(headerBytes.length), false)
  bytes.set(headerBytes, magic.length + 8)
  let offset = magic.length + 8 + headerBytes.length
  for (const entry of entries) {
    if (entry.kind !== 'file')
      continue
    const file = files.get(entry.path)!
    bytes.set(file, offset)
    offset += file.length
  }
  return { bytes, treeDigest: canonicalTreeDigest(logicalSnapshot(entries)) }
}

function decodeHeader(source: string): ReadonlyArray<CanonicalTreeArchiveHeaderEntry> {
  let value: unknown
  try {
    value = JSON.parse(source)
  }
  catch {
    return fail('header is not valid JSON')
  }
  if (!isRecord(value) || !hasExactKeys(value, ['format', 'entries']) || value.format !== CANONICAL_TREE_ARCHIVE_FORMAT || !Array.isArray(value.entries))
    return fail('header has invalid format or framing')
  const entries = value.entries.map(decodeHeaderEntry)
  validateEntries(entries)
  if (canonicalHeader(entries) !== source)
    return fail('header is not in canonical JSON framing')
  return entries
}

export function decodeCanonicalTreeArchive(bytes: Uint8Array): DecodedCanonicalTreeArchive {
  if (!(bytes instanceof Uint8Array))
    return fail('payload must be a Uint8Array')
  if (bytes.length > CANONICAL_TREE_ARCHIVE_LIMITS.maxArchiveBytes)
    return fail(`archive exceeds ${CANONICAL_TREE_ARCHIVE_LIMITS.maxArchiveBytes} bytes`)
  if (bytes.length < magic.length + 8)
    return fail('payload is shorter than the required framing')
  if (!magic.every((byte, index) => bytes[index] === byte))
    return fail('magic or archive format does not match')

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const headerLengthValue = view.getBigUint64(magic.length, false)
  if (headerLengthValue > BigInt(CANONICAL_TREE_ARCHIVE_LIMITS.maxHeaderBytes))
    return fail(`header exceeds ${CANONICAL_TREE_ARCHIVE_LIMITS.maxHeaderBytes} bytes`)
  const headerLength = Number(headerLengthValue)
  const headerStart = magic.length + 8
  const headerEnd = headerStart + headerLength
  if (!Number.isSafeInteger(headerEnd) || headerEnd > bytes.length)
    return fail('declared header length exceeds the archive payload')

  let headerSource: string
  try {
    headerSource = decoder.decode(bytes.subarray(headerStart, headerEnd))
  }
  catch {
    return fail('header is not valid UTF-8')
  }
  const entries = decodeHeader(headerSource)
  const decodedEntries: Array<DecodedCanonicalTreeArchiveEntry> = []
  let offset = headerEnd
  for (const entry of entries) {
    if (entry.kind !== 'file') {
      decodedEntries.push(entry)
      continue
    }
    const end = offset + entry.size
    if (!Number.isSafeInteger(end) || end > bytes.length)
      return fail(`file ${entry.path} exceeds the archive payload`)
    const fileBytes = bytes.slice(offset, end)
    if (hash(fileBytes) !== entry.hash)
      return fail(`file ${entry.path} hash does not match its header`)
    decodedEntries.push({ ...entry, bytes: fileBytes })
    offset = end
  }
  if (offset !== bytes.length)
    return fail('archive has trailing or ambiguous payload bytes')

  return {
    format: CANONICAL_TREE_ARCHIVE_FORMAT,
    entries: decodedEntries,
    treeDigest: canonicalTreeDigest(logicalSnapshot(decodedEntries)),
  }
}
