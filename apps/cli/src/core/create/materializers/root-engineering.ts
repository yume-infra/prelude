import type { EslintRootContribution, KnipRootContribution, WriteOperation } from '../model'
import { eslintProviderHookBlock } from '../eslint-provider-hook'

export function materializeEslintRoot(contributions: readonly EslintRootContribution[]): WriteOperation[] {
  if (contributions.length === 0) {
    return []
  }

  const providerConfigImports = [
    ...new Set(contributions.flatMap(contribution => contribution.providerConfigImports ?? [])),
  ]
  const providerHookBlock = eslintProviderHookBlock(providerConfigImports)
  const spreadLines = providerHookBlock.length === 0 ? '' : '  ...preludeProviderConfigs,\n'

  return [{
    id: 'write-eslint-config',
    kind: 'writeGeneratedUserFile',
    owner: 'materializer:eslint-config',
    surfaceId: 'eslint-root',
    path: 'eslint.config.mjs',
    authority: 'none',
    content: `import antfu from '@antfu/eslint-config'
${providerHookBlock.length === 0 ? '' : `\n${providerHookBlock}`}
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
