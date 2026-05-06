import { Schema } from 'effect'

export const PresetSchema = Schema.Literal(
  'standalone-react-minimal',
  'standalone-react-full',
  'standalone-vue-minimal',
  'standalone-vue-full',
  'workspace-root-minimal',
  'workspace-cli-library',
  'workspace-fullstack-react',
  'workspace-fullstack-vue',
  'standalone-library-minimal',
  'standalone-library-node',
  'standalone-backend-minimal',
  'standalone-backend-full',
  'standalone-cli-minimal',
  'standalone-cli-effect',
  'standalone-cli-full',
  'react-minimal',
  'react-full',
  'vue-minimal',
  'vue-full',
  'workspace-root',
  'node-minimal',
  'cli-minimal',
  'cli-effect',
).annotations({
  identifier: 'Preset',
  title: 'Preset',
})

export type Preset = Schema.Schema.Type<typeof PresetSchema>
export type CreateMode = 'create' | 'preset'
