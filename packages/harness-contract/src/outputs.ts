import { Schema } from 'effect'

import {
  ArtifactPathSchema,
  JsonPointerSchema,
  NonEmptyTextSchema,
  StableIdSchema,
  TargetPathSchema,
} from './primitives.js'

export const ManagedTreeSchema = Schema.Struct({
  kind: Schema.Literal('ManagedTree'),
  id: StableIdSchema,
  sourceRoot: ArtifactPathSchema,
  targetRoot: TargetPathSchema,
})

export type ManagedTree = Schema.Schema.Type<typeof ManagedTreeSchema>

export const ManagedBlockSchema = Schema.Struct({
  kind: Schema.Literal('ManagedBlock'),
  id: StableIdSchema,
  path: TargetPathSchema,
  blockId: StableIdSchema,
  content: Schema.String,
})

export type ManagedBlock = Schema.Schema.Type<typeof ManagedBlockSchema>

function ownsPackageDependencies(path: string, pointer: string): boolean {
  if (!(path === 'package.json' || path.endsWith('/package.json')))
    return false

  return pointer === ''
    || pointer === '/dependencies'
    || pointer.startsWith('/dependencies/')
    || pointer === '/devDependencies'
    || pointer.startsWith('/devDependencies/')
}

export const JsonValueSchema = Schema.Struct({
  kind: Schema.Literal('JsonValue'),
  id: StableIdSchema,
  path: TargetPathSchema,
  pointer: JsonPointerSchema,
  value: Schema.Json,
}).pipe(
  Schema.check(Schema.makeFilter(
    output => !ownsPackageDependencies(output.path, output.pointer),
    { expected: 'a JsonValue outside package dependency fields' },
  )),
)

export type JsonValue = Schema.Schema.Type<typeof JsonValueSchema>

const JsonObjectSchema = Schema.Record(Schema.String, Schema.Json)

export const JsonKeyedItemSchema = Schema.Struct({
  kind: Schema.Literal('JsonKeyedItem'),
  id: StableIdSchema,
  path: TargetPathSchema,
  collectionPointer: JsonPointerSchema,
  keyField: NonEmptyTextSchema,
  keyValue: NonEmptyTextSchema,
  item: JsonObjectSchema,
}).pipe(
  Schema.check(Schema.makeFilter(
    output => output.item[output.keyField] === output.keyValue,
    { expected: 'an item whose stable key field equals keyValue' },
  )),
)

export type JsonKeyedItem = Schema.Schema.Type<typeof JsonKeyedItemSchema>

export const OutputSchema = Schema.Union([
  ManagedTreeSchema,
  ManagedBlockSchema,
  JsonValueSchema,
  JsonKeyedItemSchema,
])

export type Output = Schema.Schema.Type<typeof OutputSchema>
