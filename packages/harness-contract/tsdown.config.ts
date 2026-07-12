import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/conformance.ts'],
  outDir: 'dist',
  format: 'esm',
  fixedExtension: false,
  dts: true,
  deps: {
    neverBundle: ['effect'],
  },
  tsconfig: 'tsconfig.build.json',
})
