import antfu from '@antfu/eslint-config'
import effectHarnessProviderConfig from './.prelude/providers/effect-harness/eslint.config.mjs'

export default antfu(
  {
    ignores: [
      '.codex/**',
      'apps/examples/.generated/**',
      'docs/**',
      'node_modules/**',
    ],
    lib: true,
    typescript: true,
  },
  ...effectHarnessProviderConfig,
  { rules: {
    // yield 出去的，声明时候也有不用 new 的情况
    'unicorn/throw-new-error': 'off',
  } },
  {
    name: 'prelude/root-effect-harness-pins',
    files: ['package.json'],
    rules: {
      // Root package is a prelude target. effect-harness verifies exact package pins here,
      // while apps/cli keeps its app runtime dependencies on the shared catalog.
      'pnpm/json-enforce-catalog': 'off',
    },
  },
)
