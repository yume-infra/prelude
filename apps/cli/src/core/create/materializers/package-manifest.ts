import type { JsonValue, PackageManifestContribution, WriteOperation } from '../model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'
import { scopedOperationId, scopedPathFromSurface } from './shared'

interface StructuredSlot {
  readonly value: JsonValue
  readonly owners: readonly string[]
}

function formatJsonPointer(path: readonly string[]) {
  return `/${path.join('/')}`
}

function formatDiagnosticValue(value: JsonValue) {
  return JSON.stringify(value)
}

function isJsonRecord(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return value !== null && !Array.isArray(value) && typeof value === 'object'
}

function cloneJsonValue(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue)
  }

  if (isJsonRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, cloneJsonValue(nestedValue)]),
    )
  }

  return value
}

function jsonValuesMatch(left: JsonValue, right: JsonValue) {
  return formatDiagnosticValue(left) === formatDiagnosticValue(right)
}

function packageManifestConflict(options: {
  readonly surfaceId: string
  readonly path: readonly string[]
  readonly existing: StructuredSlot
  readonly incomingOwner: string
  readonly incomingValue: JsonValue
}) {
  return SchemaContractError.make({
    schema: options.surfaceId,
    issueCount: 1,
    message: [
      `Conflicting ${options.surfaceId} contribution at ${formatJsonPointer(options.path)}.`,
      `Existing owner(s): ${options.existing.owners.join(', ')} with value ${formatDiagnosticValue(options.existing.value)}.`,
      `Incoming owner: ${options.incomingOwner} with value ${formatDiagnosticValue(options.incomingValue)}.`,
    ].join(' '),
  })
}

function recordOwner(slots: Map<string, StructuredSlot>, path: readonly string[], owner: string, value: JsonValue) {
  const key = formatJsonPointer(path)
  const existing = slots.get(key)

  if (existing !== undefined) {
    if (!existing.owners.includes(owner)) {
      slots.set(key, {
        value: existing.value,
        owners: [...existing.owners, owner],
      })
    }
    return
  }

  slots.set(key, {
    value: cloneJsonValue(value),
    owners: [owner],
  })
}

function recordStructuredOwners(
  slots: Map<string, StructuredSlot>,
  path: readonly string[],
  owner: string,
  value: JsonValue,
) {
  if (isJsonRecord(value)) {
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      recordStructuredOwners(slots, [...path, nestedKey], owner, nestedValue)
    }
    return
  }

  recordOwner(slots, path, owner, value)
}

function mergeStructuredValue(options: {
  readonly target: Record<string, JsonValue>
  readonly key: string
  readonly incomingValue: JsonValue
  readonly incomingOwner: string
  readonly path: readonly string[]
  readonly slots: Map<string, StructuredSlot>
  readonly surfaceId: string
}): SchemaContractError | undefined {
  const nextPath = [...options.path, options.key]
  const existingValue = options.target[options.key]

  if (existingValue === undefined && !Object.hasOwn(options.target, options.key)) {
    options.target[options.key] = cloneJsonValue(options.incomingValue)
    recordStructuredOwners(options.slots, nextPath, options.incomingOwner, options.incomingValue)
    return undefined
  }

  const currentValue = existingValue as JsonValue

  if (isJsonRecord(currentValue) && isJsonRecord(options.incomingValue)) {
    for (const [nestedKey, nestedValue] of Object.entries(options.incomingValue)) {
      const conflict = mergeStructuredValue({
        target: currentValue as Record<string, JsonValue>,
        key: nestedKey,
        incomingValue: nestedValue,
        incomingOwner: options.incomingOwner,
        path: nextPath,
        slots: options.slots,
        surfaceId: options.surfaceId,
      })

      if (conflict !== undefined) {
        return conflict
      }
    }
    return undefined
  }

  if (jsonValuesMatch(currentValue, options.incomingValue)) {
    recordOwner(options.slots, nextPath, options.incomingOwner, options.incomingValue)
    return undefined
  }

  return packageManifestConflict({
    surfaceId: options.surfaceId,
    path: nextPath,
    existing: options.slots.get(formatJsonPointer(nextPath)) ?? {
      value: currentValue,
      owners: ['<base>'],
    },
    incomingOwner: options.incomingOwner,
    incomingValue: options.incomingValue,
  })
}

function orderPackageManifest(manifest: Record<string, JsonValue>) {
  const ordered: Record<string, JsonValue> = {}
  const preferredKeys = [
    'name',
    'private',
    'type',
    'version',
    'packageManager',
    'main',
    'types',
    'exports',
    'files',
    'bin',
    'scripts',
    'dependencies',
    'devDependencies',
  ] as const

  for (const key of preferredKeys) {
    if (Object.hasOwn(manifest, key)) {
      ordered[key] = manifest[key]!
    }
  }

  for (const [key, value] of Object.entries(manifest)) {
    if (!Object.hasOwn(ordered, key)) {
      ordered[key] = value
    }
  }

  return ordered
}

function mergePackageManifestContributions(contributions: readonly PackageManifestContribution[]) {
  const manifest: Record<string, JsonValue> = {}
  const slots = new Map<string, StructuredSlot>()
  const surfaceId = contributions[0]?.surfaceId ?? 'package-manifest:root'

  for (const contribution of contributions) {
    for (const [key, value] of Object.entries(contribution.entries)) {
      const conflict = mergeStructuredValue({
        target: manifest,
        key,
        incomingValue: value,
        incomingOwner: contribution.owner,
        path: [],
        slots,
        surfaceId,
      })

      if (conflict !== undefined) {
        return Effect.fail(conflict)
      }
    }
  }

  return Effect.succeed(orderPackageManifest(manifest))
}

export function materializePackageJson(surfaceId: string, contributions: readonly PackageManifestContribution[]) {
  const targetPath = scopedPathFromSurface(surfaceId, 'package-manifest:', 'package.json')

  return Effect.map(mergePackageManifestContributions(contributions), value => ({
    id: scopedOperationId('write-package-json', targetPath),
    kind: 'writeStructuredFile',
    owner: 'materializer:package-json',
    surfaceId,
    path: targetPath,
    authority: 'none',
    value,
  } satisfies WriteOperation))
}
