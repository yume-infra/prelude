import antfu from '@antfu/eslint-config'

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
  {
    name: 'prelude/effect-import-boundary',
    files: ['apps/cli/src/**/*.ts', 'apps/cli/tests/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/repos/effect/**', 'repos/effect/**'],
              message: 'Do not import from the effect-harness source pin; use installed dependencies.',
            },
          ],
        },
      ],
    },
  },
)
