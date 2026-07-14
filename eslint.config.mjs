import antfu from '@antfu/eslint-config'
import effectHarness from '@sayoriqwq/effect-harness/eslint'

export default antfu(
  {
    ignores: [
      '.codex/**',
      '.prelude/**/repos/**',
      'apps/examples/.generated/**',
      'docs/**',
      'node_modules/**',
    ],
    lib: true,
    typescript: true,
  },
  { rules: {
    // yield 出去的，声明时候也有不用 new 的情况
    'unicorn/throw-new-error': 'off',
  } },
).append(
  ...effectHarness,
  {
    files: ['smoke/**/*.ts'],
    rules: {
      'antfu/no-top-level-await': 'off',
      'antfu/no-import-dist': 'off',
      'no-console': 'off',
    },
  },
)
