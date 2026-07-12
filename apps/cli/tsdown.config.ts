import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  outDir: 'dist',
  format: 'esm',
  fixedExtension: false,
  dts: false,
  deps: {
    neverBundle: [
      '@effect/platform-node',
      '@sayoriqwq/prelude-contract',
      'effect',
      'jsonc-parser',
      'semver',
      'yaml',
    ],
  },
  tsconfig: 'tsconfig.build.json',
  minify: false,
  sourcemap: true,
})
