import type { EslintRootContribution, KnipRootContribution, WriteOperation } from '../model'

export function materializeEslintRoot(contributions: readonly EslintRootContribution[]): WriteOperation[] {
  return contributions.map(contribution => ({
    id: 'write-eslint-config',
    kind: 'writeManagedFile',
    owner: 'materializer:eslint-config',
    surfaceId: contribution.surfaceId,
    path: 'eslint.config.mjs',
    authority: 'none',
    content: `import antfu from '@antfu/eslint-config'

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
)
`,
  }))
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
