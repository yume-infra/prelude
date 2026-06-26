import type { TsdownConfigContribution, TypeScriptConfigContribution, WriteOperation } from '../model'
import { scopedOperationId, scopedPathFromSurface } from './shared'

export function materializeTypeScriptConfig(contribution: TypeScriptConfigContribution): WriteOperation {
  const targetPath = scopedPathFromSurface(contribution.surfaceId, 'typescript-config:', 'tsconfig.json')

  return {
    id: scopedOperationId('write-tsconfig', targetPath),
    kind: 'writeStructuredFile',
    owner: 'materializer:typescript-config',
    surfaceId: contribution.surfaceId,
    path: targetPath,
    authority: 'none',
    value: contribution.value,
  }
}

export function materializeTsdownConfig(contribution: TsdownConfigContribution): WriteOperation {
  const targetPath = scopedPathFromSurface(contribution.surfaceId, 'tsdown-config:', 'tsdown.config.ts')

  return {
    id: scopedOperationId('write-tsdown-config', targetPath),
    kind: 'writeGeneratedUserFile',
    owner: 'materializer:tsdown-config',
    surfaceId: contribution.surfaceId,
    path: targetPath,
    authority: 'none',
    content: `import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  outDir: 'dist',
  format: 'esm',
  fixedExtension: false,
  dts: true,
})
`,
  }
}
