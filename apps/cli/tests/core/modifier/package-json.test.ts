import type { ComposeDSL, JsonBuilder } from '@/core/services/planner'
import type { ProjectConfig } from '@/schema/project-config'
import { describe, expect, it } from 'vitest'
import { makeProjectName } from '@/brand/project-name'
import { buildPackageJson, collectPackageManifestForConfig } from '../../../src/core/modifier/package-json'
import { projectConfigs } from '../../support/fixtures'

function renderPackageJson(config: ProjectConfig) {
  let readExisting = false
  let shouldSortKeys = false
  let base: (() => Record<string, unknown>) | undefined
  const reducers: Array<(draft: Record<string, unknown>) => void> = []
  let finalize: ((draft: Record<string, unknown>) => void) | undefined

  const dsl: ComposeDSL = {
    json(path) {
      expect(path).toBe('package.json')

      const builder: JsonBuilder = {
        readExisting(flag) {
          readExisting = flag ?? false
          return builder
        },
        sortKeys(flag) {
          shouldSortKeys = flag ?? false
          return builder
        },
        base(fn) {
          base = fn
          return builder
        },
        merge(patch) {
          reducers.push((draft) => {
            Object.assign(draft, typeof patch === 'function' ? patch(draft) : patch)
          })
          return builder
        },
        modify(fn) {
          reducers.push(fn)
          return builder
        },
        finalize(fn) {
          finalize = fn
          return builder
        },
      }

      return builder
    },
    text() {
      throw new Error('text builder is not used in package-json tests')
    },
    copy() {
      throw new Error('copy is not used in package-json tests')
    },
    render() {
      throw new Error('render is not used in package-json tests')
    },
  }

  buildPackageJson(dsl, config)

  expect(readExisting).toBe(false)
  expect(shouldSortKeys).toBe(false)
  const draft = base ? base() : {}
  for (const reducer of reducers)
    reducer(draft)
  finalize?.(draft)
  const jsonOutput = draft

  if (!jsonOutput)
    throw new Error('package.json was not produced')

  return jsonOutput
}

describe('buildPackageJson', () => {
  it.each(projectConfigs)('keeps materialized package.json aligned with the package manifest collector for $type/$name', (config) => {
    expect(renderPackageJson(config)).toEqual(collectPackageManifestForConfig(config).manifest)
  })

  const expectedFullPackageTopLevelOrder = [
    'name',
    'type',
    'version',
    'description',
    'license',
    'engines',
    'scripts',
    'dependencies',
    'devDependencies',
  ]

  it('writes latest common tooling versions for a full react template', () => {
    const packageJson = renderPackageJson({
      type: 'react',
      name: makeProjectName('phase3-react'),
      language: 'typescript',
      git: true,
      linting: 'antfu-eslint',
      codeQuality: ['lint-staged', 'commitlint'],
      buildTool: 'vite',
      router: 'react-router',
      stateManagement: 'zustand',
      cssPreprocessor: 'css',
      cssFramework: 'none',
    })

    expect(Object.keys(packageJson)).toEqual(expectedFullPackageTopLevelOrder)
    expect(Object.keys(packageJson.scripts as Record<string, unknown>)).toEqual([
      'build',
      'dev',
      'lint',
      'lint:fix',
      'preview',
    ])
    expect(Object.keys(packageJson.devDependencies as Record<string, unknown>)).toEqual([
      '@antfu/eslint-config',
      '@commitlint/cli',
      '@commitlint/config-conventional',
      '@eslint-react/eslint-plugin',
      '@types/react',
      '@types/react-dom',
      'eslint',
      'eslint-plugin-react-hooks',
      'eslint-plugin-react-refresh',
      'husky',
      'lint-staged',
      'typescript',
    ])

    expect(packageJson.devDependencies).toMatchObject({
      '@antfu/eslint-config': '^8.2.0',
      '@commitlint/cli': '^20.5.0',
      '@commitlint/config-conventional': '^20.5.0',
      'eslint': '^10.2.1',
      'husky': '^9.1.7',
      'lint-staged': '^16.4.0',
      'typescript': '^6.0.3',
    })
    expect(packageJson.devDependencies).not.toHaveProperty('@lobehub/commit-cli')
  })

  it('writes latest frontend tooling versions when vite and tailwind are enabled', () => {
    const packageJson = renderPackageJson({
      type: 'vue',
      name: makeProjectName('phase3-vue'),
      language: 'typescript',
      git: true,
      linting: 'antfu-eslint',
      codeQuality: ['lint-staged', 'commitlint'],
      buildTool: 'vite',
      router: true,
      stateManagement: true,
      cssPreprocessor: 'less',
      cssFramework: 'tailwind',
    })

    expect(packageJson.dependencies).toMatchObject({
      '@tailwindcss/vite': '^4.2.4',
      'tailwindcss': '^4.2.4',
      'vite': '^8.0.9',
    })

    expect(packageJson.devDependencies).toMatchObject({
      less: '^4.6.4',
    })
  })

  it('writes latest vue ecosystem versions for a full vue template', () => {
    const packageJson = renderPackageJson({
      type: 'vue',
      name: makeProjectName('phase3-vue-ecosystem'),
      language: 'typescript',
      git: true,
      linting: 'antfu-eslint',
      codeQuality: ['lint-staged', 'commitlint'],
      buildTool: 'vite',
      router: true,
      stateManagement: true,
      cssPreprocessor: 'sass',
      cssFramework: 'tailwind',
    })

    expect(Object.keys(packageJson)).toEqual(expectedFullPackageTopLevelOrder)
    expect(Object.keys(packageJson.dependencies as Record<string, unknown>)).toEqual([
      '@tailwindcss/vite',
      '@vitejs/plugin-vue',
      '@vue/compiler-sfc',
      'pinia',
      'tailwindcss',
      'vite',
      'vue',
      'vue-router',
    ])
    expect(Object.keys(packageJson.devDependencies as Record<string, unknown>)).toEqual([
      '@antfu/eslint-config',
      '@commitlint/cli',
      '@commitlint/config-conventional',
      '@vue/tsconfig',
      'eslint',
      'husky',
      'lint-staged',
      'sass',
      'typescript',
    ])

    expect(packageJson.dependencies).toMatchObject({
      '@vitejs/plugin-vue': '^6.0.6',
      '@vue/compiler-sfc': '^3.5.32',
      'pinia': '^3.0.4',
      'vue': '^3.5.32',
      'vue-router': '^5.0.4',
    })

    expect(packageJson.devDependencies).toMatchObject({
      '@vue/tsconfig': '^0.9.1',
    })
  })

  it('writes latest react ecosystem versions for react-router and zustand', () => {
    const packageJson = renderPackageJson({
      type: 'react',
      name: makeProjectName('phase3-react-ecosystem'),
      language: 'typescript',
      git: true,
      linting: 'antfu-eslint',
      codeQuality: ['lint-staged', 'commitlint'],
      buildTool: 'vite',
      router: 'react-router',
      stateManagement: 'zustand',
      cssPreprocessor: 'sass',
      cssFramework: 'tailwind',
    })

    expect(packageJson.dependencies).toMatchObject({
      '@vitejs/plugin-react': '^6.0.1',
      'react': '^19.2.5',
      'react-dom': '^19.2.5',
      'react-router': '^7.14.2',
      'react-router-dom': '^7.14.2',
      'zustand': '^5.0.12',
    })

    expect(packageJson.devDependencies).toMatchObject({
      '@eslint-react/eslint-plugin': '^3.0.0',
      '@types/react': '^19.2.14',
      '@types/react-dom': '^19.2.3',
      'eslint-plugin-react-hooks': '^7.1.1',
      'eslint-plugin-react-refresh': '^0.5.2',
    })
  })

  it('writes latest react ecosystem versions for tanstack router and jotai', () => {
    const packageJson = renderPackageJson({
      type: 'react',
      name: makeProjectName('phase3-react-alt'),
      language: 'typescript',
      git: true,
      linting: 'antfu-eslint',
      codeQuality: ['lint-staged', 'commitlint'],
      buildTool: 'vite',
      router: 'tanstack-router',
      stateManagement: 'jotai',
      cssPreprocessor: 'css',
      cssFramework: 'none',
    })

    expect(packageJson.dependencies).toMatchObject({
      '@tanstack/react-router': '^1.168.23',
      'jotai': '^2.19.1',
    })
  })

  it('does not add react state-management dependencies when disabled', () => {
    const packageJson = renderPackageJson({
      type: 'react',
      name: makeProjectName('phase3-react-no-state'),
      language: 'typescript',
      git: true,
      linting: 'antfu-eslint',
      codeQuality: ['lint-staged', 'commitlint'],
      buildTool: 'vite',
      router: 'react-router',
      stateManagement: 'none',
      cssPreprocessor: 'css',
      cssFramework: 'none',
    })

    expect(packageJson.dependencies).not.toHaveProperty('jotai')
    expect(packageJson.dependencies).not.toHaveProperty('zustand')
  })

  it('does not add pinia when vue state management is disabled', () => {
    const packageJson = renderPackageJson({
      type: 'vue',
      name: makeProjectName('phase3-vue-no-state'),
      language: 'typescript',
      git: true,
      linting: 'antfu-eslint',
      codeQuality: ['lint-staged', 'commitlint'],
      buildTool: 'vite',
      router: true,
      stateManagement: false,
      cssPreprocessor: 'css',
      cssFramework: 'none',
    })

    expect(packageJson.dependencies).not.toHaveProperty('pinia')
  })

  it('omits workspace bootstrap tooling when git, linting, and code quality are disabled', () => {
    const packageJson = renderPackageJson({
      type: 'react',
      name: makeProjectName('phase-f2-react-minimal-workspace'),
      language: 'typescript',
      git: false,
      linting: 'none',
      codeQuality: [],
      buildTool: 'vite',
      router: 'none',
      stateManagement: 'none',
      cssPreprocessor: 'css',
      cssFramework: 'none',
    })

    expect(packageJson.devDependencies).not.toHaveProperty('@antfu/eslint-config')
    expect(packageJson.devDependencies).not.toHaveProperty('@lobehub/commit-cli')
    expect(packageJson.devDependencies).not.toHaveProperty('husky')
    expect(packageJson.scripts).not.toHaveProperty('commit')
    expect(packageJson.scripts).not.toHaveProperty('lint')
  })

  it('writes TypeScript ESM and tsdown baseline for standalone node projects', () => {
    const packageJson = renderPackageJson({
      type: 'node',
      name: makeProjectName('phase-node-minimal'),
      language: 'typescript',
      git: false,
      linting: 'none',
      codeQuality: [],
    })

    expect(packageJson).toMatchObject({
      name: 'phase-node-minimal',
      type: 'module',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      files: ['dist'],
      scripts: {
        build: 'tsdown --config tsdown.config.ts',
        start: 'node dist/index.js',
        typecheck: 'tsc --noEmit',
      },
      devDependencies: {
        '@types/node': '^25.6.0',
        'tsdown': '^0.21.9',
        'typescript': '^6.0.3',
      },
    })
  })

  it('writes npm bin metadata and invocation smoke script for standalone cli tools', () => {
    const packageJson = renderPackageJson({
      type: 'cli',
      name: makeProjectName('phase-cli-minimal'),
      language: 'typescript',
      git: false,
      linting: 'none',
      codeQuality: [],
      toolkit: 'none',
    })

    expect(Object.keys(packageJson)).toEqual([
      'name',
      'type',
      'version',
      'description',
      'license',
      'main',
      'types',
      'bin',
      'files',
      'engines',
      'scripts',
      'dependencies',
      'devDependencies',
    ])
    expect(packageJson).toMatchObject({
      name: 'phase-cli-minimal',
      type: 'module',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      bin: {
        'phase-cli-minimal': 'dist/index.js',
      },
      files: ['dist'],
      scripts: {
        'build': 'tsdown --config tsdown.config.ts && node scripts/ensure-shebang.mjs',
        'smoke:bin': 'pnpm build && dist/index.js --help',
        'typecheck': 'tsc --noEmit',
      },
      devDependencies: {
        '@types/node': '^25.6.0',
        'tsdown': '^0.21.9',
        'typescript': '^6.0.3',
      },
    })
  })

  it('writes Effect runtime dependencies only for Effect CLI tools', () => {
    const minimalPackageJson = renderPackageJson({
      type: 'cli',
      name: makeProjectName('phase-cli-minimal'),
      language: 'typescript',
      git: false,
      linting: 'none',
      codeQuality: [],
      toolkit: 'none',
    })
    const effectPackageJson = renderPackageJson({
      type: 'cli',
      name: makeProjectName('phase-cli-effect'),
      language: 'typescript',
      git: false,
      linting: 'none',
      codeQuality: [],
      toolkit: 'effect',
    })

    expect(minimalPackageJson.dependencies).not.toHaveProperty('@effect/cli')
    expect(effectPackageJson.dependencies).toMatchObject({
      '@effect/cli': '^0.75.1',
      '@effect/platform': '^0.96.0',
      '@effect/platform-node': '^0.106.0',
      '@effect/printer': '^0.49.0',
      '@effect/printer-ansi': '^0.49.0',
      'effect': '^3.21.1',
    })
  })

  it('writes TypeScript ESM build metadata for library packages', () => {
    const packageJson = renderPackageJson({
      type: 'library',
      name: makeProjectName('phase-library-minimal'),
      language: 'typescript',
      git: false,
      linting: 'none',
      codeQuality: [],
      runtime: 'neutral',
    })

    expect(packageJson).toMatchObject({
      name: 'phase-library-minimal',
      type: 'module',
      exports: {
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.js',
        },
      },
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      files: ['dist'],
      scripts: {
        build: 'tsdown --config tsdown.config.ts',
        typecheck: 'tsc --noEmit',
      },
      devDependencies: {
        tsdown: '^0.21.9',
        typescript: '^6.0.3',
      },
    })
  })
})
