import antfu from '@antfu/eslint-config'

// <prelude:provider-eslint-config:start>
import effectHarnessProviderConfig1 from './.prelude/providers/effect-harness/eslint.config.mjs'

const preludeProviderConfigs = [
  ...effectHarnessProviderConfig1,
]
// <prelude:provider-eslint-config:end>

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
  ...preludeProviderConfigs,
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
