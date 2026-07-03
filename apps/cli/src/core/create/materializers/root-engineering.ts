import type { EslintRootContribution, KnipRootContribution, WriteOperation } from '../model'

export function materializeEslintRoot(contributions: readonly EslintRootContribution[]): WriteOperation[] {
  if (contributions.length === 0) {
    return []
  }

  const providerConfigImports = [
    ...new Set(contributions.flatMap(contribution => contribution.providerConfigImports ?? [])),
  ]
  const providerImports = providerConfigImports.map((importPath, index) => ({
    importName: `effectHarnessProviderConfig${index + 1}`,
    importPath,
  }))
  const importLines = providerImports
    .map(providerImport => `import ${providerImport.importName} from '${providerImport.importPath}'`)
    .join('\n')
  const spreadLines = providerImports
    .map(providerImport => `  ...${providerImport.importName},\n`)
    .join('')

  return [{
    id: 'write-eslint-config',
    kind: 'writeManagedFile',
    owner: 'materializer:eslint-config',
    surfaceId: 'eslint-root',
    path: 'eslint.config.mjs',
    authority: 'none',
    content: `import antfu from '@antfu/eslint-config'
${importLines.length === 0 ? '' : `${importLines}\n`}
export default antfu(
  {
    ignores: ['.prelude/**', 'dist/**'],
  },
  {
    rules: {
      'jsonc/sort-keys': 'off',
      'no-console': 'off',
      'node/prefer-global/process': 'off',
      'pnpm/json-enforce-catalog': 'off',
      'style/quotes': 'off',
      'style/jsx-one-expression-per-line': 'off',
    },
  },
${spreadLines})
`,
  }]
}

export function materializeKnipRoot(contributions: readonly KnipRootContribution[]): WriteOperation[] {
  return contributions.map(contribution => ({
    id: 'write-knip-config',
    kind: 'writeStructuredFile',
    owner: 'materializer:knip-config',
    surfaceId: contribution.surfaceId,
    path: 'knip.json',
    authority: 'none',
    value: contribution.config,
  }))
}
