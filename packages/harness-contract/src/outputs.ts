import { Schema } from 'effect'

import { OutputLocatorSchema } from './locators.js'
import {
  ArtifactFilePathSchema,
  ArtifactPathSchema,
  JsonPointerSchema,
  NonEmptyTextSchema,
  Sha256DigestSchema,
  StableIdSchema,
} from './primitives.js'
import { CANONICAL_TREE_ARCHIVE_FORMAT } from './tree-archive.js'

export const ManagedTreeSchema = Schema.Struct({
  kind: Schema.Literal('ManagedTree'),
  id: StableIdSchema,
  sourceRoot: ArtifactPathSchema,
  locator: OutputLocatorSchema,
})

export type ManagedTree = Schema.Schema.Type<typeof ManagedTreeSchema>

export const PinnedReferenceArchiveSchema = Schema.Struct({
  path: ArtifactFilePathSchema,
  format: Schema.Literal(CANONICAL_TREE_ARCHIVE_FORMAT),
})

export type PinnedReferenceArchive = Schema.Schema.Type<typeof PinnedReferenceArchiveSchema>

export const PinnedReferenceProvenanceSchema = Schema.Struct({
  sourceUrl: NonEmptyTextSchema,
  revision: NonEmptyTextSchema,
  treeDigest: Sha256DigestSchema,
})

export type PinnedReferenceProvenance = Schema.Schema.Type<typeof PinnedReferenceProvenanceSchema>

export const PinnedReferenceTreeSchema = Schema.Struct({
  kind: Schema.Literal('PinnedReferenceTree'),
  id: StableIdSchema,
  archive: PinnedReferenceArchiveSchema,
  locator: OutputLocatorSchema,
  provenance: PinnedReferenceProvenanceSchema,
  referenceOnly: Schema.Literal(true),
}).pipe(
  Schema.check(Schema.makeFilter(
    output => output.locator.root === 'IntegrationWorkspace',
    { expected: 'an IntegrationWorkspace-scoped pinned reference tree' },
  )),
)

export type PinnedReferenceTree = Schema.Schema.Type<typeof PinnedReferenceTreeSchema>

export const ManagedBlockSchema = Schema.Struct({
  kind: Schema.Literal('ManagedBlock'),
  id: StableIdSchema,
  locator: OutputLocatorSchema,
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
  locator: OutputLocatorSchema,
  pointer: JsonPointerSchema,
  value: Schema.Json,
}).pipe(
  Schema.check(Schema.makeFilter(
    output => !ownsPackageDependencies(output.locator.path, output.pointer),
    { expected: 'a JsonValue outside package dependency fields' },
  )),
)

export type JsonValue = Schema.Schema.Type<typeof JsonValueSchema>

const JsonObjectSchema = Schema.Record(Schema.String, Schema.Json)

export const JsonKeyedItemSchema = Schema.Struct({
  kind: Schema.Literal('JsonKeyedItem'),
  id: StableIdSchema,
  locator: OutputLocatorSchema,
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
  PinnedReferenceTreeSchema,
  ManagedBlockSchema,
  JsonValueSchema,
  JsonKeyedItemSchema,
])

export type Output = Schema.Schema.Type<typeof OutputSchema>
