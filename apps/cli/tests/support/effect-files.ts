import assert from 'node:assert/strict'
import * as os from 'node:os'
import { Effect, Schema } from 'effect'
import * as FileSystem from 'effect/FileSystem'
import * as Path from 'effect/Path'

const decodeJsonString = Schema.decodeUnknownSync(Schema.UnknownFromJsonString)
const encodeJsonString = Schema.encodeUnknownSync(Schema.UnknownFromJsonString)

export function makeTempProjectDir(prefix: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    return yield* fs.makeTempDirectory({
      directory: os.tmpdir(),
      prefix,
    })
  })
}

export function pathJoin(...segments: readonly string[]) {
  return Effect.map(Path.Path, path => path.join(...segments))
}

export function pathJoinSync(...segments: readonly string[]) {
  const [head, ...tail] = segments
  if (head === undefined) {
    return ''
  }

  return [
    head.replace(/\/+$/u, ''),
    ...tail.map(segment => segment.replace(/^\/+|\/+$/gu, '')),
  ].filter(segment => segment.length > 0).join('/')
}

export function readFileString(filePath: string) {
  return Effect.flatMap(FileSystem.FileSystem, fs => fs.readFileString(filePath))
}

export function readJson<T = unknown>(filePath: string) {
  return readFileString(filePath).pipe(
    Effect.map(content => parseJson<T>(content)),
  )
}

export function parseJson<T = unknown>(content: string) {
  return decodeJsonString(content) as T
}

export function stringifyJson(value: unknown) {
  return encodeJsonString(value)
}

export function pathExists(filePath: string) {
  return Effect.flatMap(FileSystem.FileSystem, fs => fs.exists(filePath))
}

export function assertPathDoesNotExist(filePath: string) {
  return Effect.gen(function* () {
    const exists = yield* pathExists(filePath)
    assert.equal(exists, false)
  })
}
