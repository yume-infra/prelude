import type { EditorSettingsContribution, JsonValue, WriteOperation } from '../model'
import { Effect } from 'effect'
import { SchemaContractError } from '@/core/errors'

interface StructuredSlot {
  readonly owner: string
  readonly value: JsonValue
}

function isJsonRecord(value: JsonValue): value is Record<string, JsonValue> {
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
  return JSON.stringify(left) === JSON.stringify(right)
}

function editorSettingsConflict(options: {
  readonly surfaceId: string
  readonly path: string
  readonly existing: StructuredSlot
  readonly incomingOwner: string
  readonly incomingValue: JsonValue
}) {
  return SchemaContractError.make({
    schema: options.surfaceId,
    issueCount: 1,
    message: [
      `Conflicting editor settings contribution at ${options.path}.`,
      `Existing owner: ${options.existing.owner} with value ${JSON.stringify(options.existing.value)}.`,
      `Incoming owner: ${options.incomingOwner} with value ${JSON.stringify(options.incomingValue)}.`,
    ].join(' '),
  })
}

function mergeValue(input: {
  readonly target: Record<string, JsonValue>
  readonly key: string
  readonly incomingValue: JsonValue
  readonly incomingOwner: string
  readonly path: string
  readonly slots: Map<string, StructuredSlot>
  readonly surfaceId: string
}): SchemaContractError | undefined {
  const existingValue = input.target[input.key]
  const nextPath = `${input.path}/${input.key}`

  if (existingValue === undefined && !Object.hasOwn(input.target, input.key)) {
    input.target[input.key] = cloneJsonValue(input.incomingValue)
    input.slots.set(nextPath, {
      owner: input.incomingOwner,
      value: cloneJsonValue(input.incomingValue),
    })
    return undefined
  }

  if (isJsonRecord(existingValue as JsonValue) && isJsonRecord(input.incomingValue)) {
    for (const [nestedKey, nestedValue] of Object.entries(input.incomingValue)) {
      const conflict = mergeValue({
        target: existingValue as Record<string, JsonValue>,
        key: nestedKey,
        incomingValue: nestedValue,
        incomingOwner: input.incomingOwner,
        path: nextPath,
        slots: input.slots,
        surfaceId: input.surfaceId,
      })

      if (conflict !== undefined) {
        return conflict
      }
    }
    return undefined
  }

  const currentValue = existingValue as JsonValue
  if (jsonValuesMatch(currentValue, input.incomingValue)) {
    return undefined
  }

  return editorSettingsConflict({
    surfaceId: input.surfaceId,
    path: nextPath,
    existing: input.slots.get(nextPath) ?? {
      owner: '<base>',
      value: currentValue,
    },
    incomingOwner: input.incomingOwner,
    incomingValue: input.incomingValue,
  })
}

function mergeEditorSettings(surfaceId: string, contributions: readonly EditorSettingsContribution[]) {
  const settings: Record<string, JsonValue> = {}
  const slots = new Map<string, StructuredSlot>()

  for (const contribution of contributions) {
    for (const [key, value] of Object.entries(contribution.value)) {
      const conflict = mergeValue({
        target: settings,
        key,
        incomingValue: value,
        incomingOwner: contribution.owner,
        path: '',
        slots,
        surfaceId,
      })

      if (conflict !== undefined) {
        return Effect.fail(conflict)
      }
    }
  }

  return Effect.succeed(settings)
}

export function materializeEditorSettings(surfaceId: string, contributions: readonly EditorSettingsContribution[]) {
  const targetPath = contributions[0]?.path ?? surfaceId.replace(/^editor-settings:/u, '')

  return Effect.map(mergeEditorSettings(surfaceId, contributions), value => ({
    id: `write-editor-settings:${targetPath}`,
    kind: 'writeStructuredFile',
    owner: 'materializer:editor-settings',
    surfaceId,
    path: targetPath,
    authority: 'bounded',
    value,
  } satisfies WriteOperation))
}
