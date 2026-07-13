import { Schema } from 'effect'

const StableIdPattern = /^[a-z0-9]+(?:[._:/-][a-z0-9]+)*$/
const PackageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const BarePackageExportPattern = /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)(?:\/[a-z0-9][a-z0-9._-]*)*$/
const Sha256Pattern = /^[a-f0-9]{64}$/

const isTrimmedNonEmpty = Schema.makeFilter<string>(
  value => value.length > 0 && value.trim() === value,
  { expected: 'a nonempty string without surrounding whitespace' },
)

const hasNoNullByte = Schema.makeFilter<string>(
  value => !value.includes('\0'),
  { expected: 'a string without null bytes' },
)

export function isNormalizedRelativePath(value: string, allowRoot = false): boolean {
  if (value === '.')
    return allowRoot

  if (value.length === 0 || value.startsWith('/') || value.includes('\\') || value.includes('\0'))
    return false

  if (/^[a-z]:/i.test(value))
    return false

  return value.split('/').every(segment => segment.length > 0 && segment !== '.' && segment !== '..')
}

export function isJsonPointer(value: string): boolean {
  if (value === '')
    return true

  if (!value.startsWith('/') || value.includes('\0'))
    return false

  for (let index = 0; index < value.length; index++) {
    if (value[index] !== '~')
      continue

    const escape = value[index + 1]
    if (escape !== '0' && escape !== '1')
      return false

    index++
  }

  return true
}

const isRelativePath = Schema.makeFilter<string>(
  value => isNormalizedRelativePath(value),
  { expected: 'a normalized relative POSIX path' },
)

const isRootRelativePath = Schema.makeFilter<string>(
  value => isNormalizedRelativePath(value, true),
  { expected: 'a normalized relative POSIX path or "."' },
)

export const NonEmptyTextSchema = Schema.String.pipe(
  Schema.check(isTrimmedNonEmpty),
)

export type NonEmptyText = Schema.Schema.Type<typeof NonEmptyTextSchema>

export const StableIdSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(StableIdPattern, { expected: 'a stable lowercase identifier' })),
)

export type StableId = Schema.Schema.Type<typeof StableIdSchema>

export const RelativePathSchema = Schema.String.pipe(
  Schema.check(isRelativePath),
)

export type RelativePath = Schema.Schema.Type<typeof RelativePathSchema>

export const RootRelativePathSchema = Schema.String.pipe(
  Schema.check(isRootRelativePath),
)

export type RootRelativePath = Schema.Schema.Type<typeof RootRelativePathSchema>

export const TargetPathSchema = RelativePathSchema
export type TargetPath = Schema.Schema.Type<typeof TargetPathSchema>

export const PackageRootSchema = RootRelativePathSchema
export type PackageRoot = Schema.Schema.Type<typeof PackageRootSchema>

export const ArtifactPathSchema = RootRelativePathSchema
export type ArtifactPath = Schema.Schema.Type<typeof ArtifactPathSchema>

export const ArtifactFilePathSchema = RelativePathSchema
export type ArtifactFilePath = Schema.Schema.Type<typeof ArtifactFilePathSchema>

export const PackageNameSchema = Schema.String.pipe(
  Schema.check(
    Schema.isPattern(PackageNamePattern, { expected: 'a bare npm package name' }),
    Schema.isMaxLength(214),
  ),
)

export type PackageName = Schema.Schema.Type<typeof PackageNameSchema>

export const BarePackageExportSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(BarePackageExportPattern, { expected: 'a bare npm package export' })),
)

export type BarePackageExport = Schema.Schema.Type<typeof BarePackageExportSchema>

export const JsonPointerSchema = Schema.String.pipe(
  Schema.check(
    Schema.makeFilter(isJsonPointer, { expected: 'a canonical RFC 6901 JSON pointer' }),
    hasNoNullByte,
  ),
)

export type JsonPointer = Schema.Schema.Type<typeof JsonPointerSchema>

export const CommandArgumentSchema = Schema.String.pipe(
  Schema.check(hasNoNullByte),
)

export type CommandArgument = Schema.Schema.Type<typeof CommandArgumentSchema>

export const Sha256DigestSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(Sha256Pattern, { expected: 'a lowercase SHA-256 digest' })),
)

export type Sha256Digest = Schema.Schema.Type<typeof Sha256DigestSchema>

export const NonEmptyCommandSchema = Schema.NonEmptyArray(CommandArgumentSchema).pipe(
  Schema.check(Schema.makeFilter(
    argv => argv[0].length > 0,
    { expected: 'argv with a nonempty executable at index 0' },
  )),
)

export type NonEmptyCommand = Schema.Schema.Type<typeof NonEmptyCommandSchema>
