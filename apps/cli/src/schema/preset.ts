import { ParseResult, Schema } from 'effect'

export const PresetSchema = Schema.Literal(
  'react-minimal',
  'react-full',
  'vue-minimal',
  'vue-full',
  'workspace-root',
  'node-minimal',
  'cli-minimal',
).annotations({
  identifier: 'Preset',
  title: 'Preset',
})

export const CreateModeSchema = Schema.Literal('create', 'preset').annotations({
  identifier: 'CreateMode',
  title: 'CreateMode',
})

export type Preset = Schema.Schema.Type<typeof PresetSchema>
export type CreateMode = Schema.Schema.Type<typeof CreateModeSchema>

export const decodePreset = Schema.decodeUnknown(PresetSchema, { errors: 'all' })
export const decodeCreateMode = Schema.decodeUnknown(CreateModeSchema, { errors: 'all' })

export const formatPresetError = ParseResult.TreeFormatter.formatErrorSync
export const formatCreateModeError = ParseResult.TreeFormatter.formatErrorSync
