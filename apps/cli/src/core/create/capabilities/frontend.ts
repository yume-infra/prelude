import type { JsonValue } from '../model'
import type { PackageCapabilityDefinition } from './types'
import {
  reactAppShellSurface,
  reactEntrySurface,
  reactStaticSurface,
  styleSheetSurface,
  typeScriptConfigSurface,
  viteConfigSurface,
  vueAppShellSurface,
  vueEntrySurface,
  vueStaticSurface,
} from './helpers'

function reactEntrySurfaceId(packageId: string) {
  return `react-app-entry:${packageId}` as const
}

function reactAppShellSurfaceId(packageId: string) {
  return `react-app-shell:${packageId}` as const
}

function vueStaticSurfaceId(packageId: string, path: string) {
  return `vue-app-static:${packageId}/${path}` as const
}

function vueAppShellSurfaceId(packageId: string) {
  return `vue-app-shell:${packageId}` as const
}

function vueEntrySurfaceId(packageId: string) {
  return `vue-app-entry:${packageId}` as const
}

function viteConfigSurfaceId(packageId: string) {
  return `vite-config:${packageId}` as const
}

function styleSheetSurfaceId(packageId: string, path: 'src/styles.css' | 'src/styles.less') {
  return `stylesheet:${packageId}/${path}` as const
}

function reactAppTsconfig(): Record<string, JsonValue> {
  return {
    compilerOptions: {
      target: 'ES2022',
      useDefineForClassFields: true,
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      isolatedModules: true,
      verbatimModuleSyntax: true,
      skipLibCheck: true,
      jsx: 'react-jsx',
      types: ['vite/client'],
    },
    include: ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts'],
  }
}

function vueAppTsconfig(): Record<string, JsonValue> {
  return {
    compilerOptions: {
      target: 'ES2022',
      useDefineForClassFields: true,
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      isolatedModules: true,
      verbatimModuleSyntax: true,
      skipLibCheck: true,
      types: ['vite/client'],
    },
    include: ['src/**/*.ts', 'src/**/*.vue', 'vite.config.ts'],
  }
}

const frontendRuntimeDefinitions: readonly PackageCapabilityDefinition[] = [
  {
    id: 'react-app',
    scope: 'package',
    runtime: true,
    requirements: [],
    conflicts: ['minimal-node-package', 'vue-app', 'effect-package', 'node-backend', 'library', 'cli-tool'],
    logicalSurfaces: context => [
      reactStaticSurface(context.sourceScope, 'index.html'),
      reactEntrySurface(context.sourceScope),
      reactAppShellSurface(context.sourceScope),
      viteConfigSurface(context.sourceScope, 'capability:react-app'),
      typeScriptConfigSurface(context.packageManifestScope),
    ],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:react-app',
        entries: {
          name: context.packageName,
          type: 'module',
          version: '0.0.0',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {
            'react': '^19.2.6',
            'react-dom': '^19.2.6',
          },
          devDependencies: {
            '@vitejs/plugin-react': '^6.0.1',
            '@types/react': '^19.2.14',
            '@types/react-dom': '^19.2.3',
            'typescript': 'catalog:',
            'vite': '^8.0.9',
          },
        },
      },
      {
        kind: 'generatedUserFile',
        surfaceId: `react-app-static:${context.packageId}/index.html`,
        owner: 'capability:react-app',
        path: context.scopedPath('index.html'),
        operationId: 'write-react-index-html',
        operationOwner: 'materializer:react-app-static',
        content: `<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
`,
      },
      {
        kind: 'frontendEntry',
        surfaceId: reactEntrySurfaceId(context.packageId),
        owner: 'capability:react-app',
        path: context.scopedPath('src/main.tsx'),
        framework: 'react',
        imports: [],
        declarations: [],
        appUse: [],
        styleImports: [],
      },
      {
        kind: 'viteConfig',
        surfaceId: viteConfigSurfaceId(context.packageId),
        owner: 'capability:react-app',
        path: context.scopedPath('vite.config.ts'),
        imports: ['import react from \'@vitejs/plugin-react\''],
        plugins: ['react()'],
      },
      {
        kind: 'typescriptConfig',
        surfaceId: context.scopedTypeScriptConfigSurfaceId,
        owner: 'capability:react-app',
        value: reactAppTsconfig(),
      },
      {
        kind: 'reactAppShell',
        surfaceId: reactAppShellSurfaceId(context.packageId),
        owner: 'capability:react-app',
        path: context.scopedPath('src/App.tsx'),
        imports: [],
        moduleDeclarations: [],
        componentDeclarations: [],
        content: [
          `      <h1>${context.packageName}</h1>`,
          '      <p>React app ready.</p>',
        ],
        mainClassNameTokens: [],
        routing: [],
      },
    ],
  },
  {
    id: 'vue-app',
    scope: 'package',
    runtime: true,
    requirements: [],
    conflicts: ['minimal-node-package', 'react-app', 'effect-package', 'node-backend', 'library', 'cli-tool'],
    logicalSurfaces: context => [
      vueStaticSurface(context.sourceScope, 'index.html'),
      vueEntrySurface(context.sourceScope),
      vueAppShellSurface(context.sourceScope),
      viteConfigSurface(context.sourceScope, 'capability:vue-app'),
      typeScriptConfigSurface(context.packageManifestScope),
    ],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:vue-app',
        entries: {
          name: context.packageName,
          type: 'module',
          version: '0.0.0',
          scripts: {
            dev: 'vite',
            build: 'vite build',
            preview: 'vite preview',
          },
          dependencies: {
            vue: '^3.5.39',
          },
          devDependencies: {
            '@vitejs/plugin-vue': '^6.0.7',
            'typescript': 'catalog:',
            'vite': '^8.0.9',
          },
        },
      },
      {
        kind: 'generatedUserFile',
        surfaceId: vueStaticSurfaceId(context.packageId, 'index.html'),
        owner: 'capability:vue-app',
        path: context.scopedPath('index.html'),
        operationId: 'write-vue-index-html',
        operationOwner: 'materializer:vue-app-static',
        content: `<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
`,
      },
      {
        kind: 'frontendEntry',
        surfaceId: vueEntrySurfaceId(context.packageId),
        owner: 'capability:vue-app',
        path: context.scopedPath('src/main.ts'),
        framework: 'vue',
        imports: [],
        declarations: [],
        appUse: [],
        styleImports: [],
      },
      {
        kind: 'vueAppShell',
        surfaceId: vueAppShellSurfaceId(context.packageId),
        owner: 'capability:vue-app',
        path: context.scopedPath('src/App.vue'),
        scriptImports: [],
        scriptSetup: [`const appName = ${JSON.stringify(context.packageName)}`],
        templateContent: [
          '    <h1>{{ appName }}</h1>',
          '    <p>Vue app ready.</p>',
        ],
        mainClassNameTokens: [],
        routing: [],
      },
      {
        kind: 'viteConfig',
        surfaceId: viteConfigSurfaceId(context.packageId),
        owner: 'capability:vue-app',
        path: context.scopedPath('vite.config.ts'),
        imports: ['import vue from \'@vitejs/plugin-vue\''],
        plugins: ['vue()'],
      },
      {
        kind: 'typescriptConfig',
        surfaceId: context.scopedTypeScriptConfigSurfaceId,
        owner: 'capability:vue-app',
        value: vueAppTsconfig(),
      },
    ],
  },
]

const frontendFeatureDefinitions: readonly PackageCapabilityDefinition[] = [
  {
    id: 'react-counter',
    scope: 'package',
    runtime: false,
    requirements: [{ allOf: ['react-app'], message: packageId => `react-counter requires react-app for ${packageId}` }],
    conflicts: [],
    logicalSurfaces: () => [],
    contribute: context => [{
      kind: 'reactAppShell',
      surfaceId: reactAppShellSurfaceId(context.packageId),
      owner: 'capability:react-counter',
      path: context.scopedPath('src/App.tsx'),
      imports: ['import { useState } from \'react\''],
      moduleDeclarations: [],
      componentDeclarations: ['  const [count, setCount] = useState(0)'],
      content: [
        `      <h1>${context.packageName}</h1>`,
        '      <button type="button" onClick={() => setCount(value => value + 1)}>',
        '        Count: {count}',
        '      </button>',
      ],
      mainClassNameTokens: [],
      routing: [],
    }],
  },
  {
    id: 'router:react-router',
    scope: 'package',
    runtime: false,
    requirements: [{ allOf: ['react-app'], message: packageId => `router:react-router requires react-app for ${packageId}` }],
    conflicts: [],
    logicalSurfaces: () => [],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:router:react-router',
        entries: { dependencies: { 'react-router': '^8.0.1' } },
      },
      {
        kind: 'reactAppShell',
        surfaceId: reactAppShellSurfaceId(context.packageId),
        owner: 'capability:router:react-router',
        path: context.scopedPath('src/App.tsx'),
        imports: ['import { BrowserRouter, Link, Route, Routes } from \'react-router\''],
        moduleDeclarations: [],
        componentDeclarations: [],
        content: [],
        mainClassNameTokens: [],
        routing: ['react-router'],
      },
    ],
  },
  {
    id: 'router:vue-router',
    scope: 'package',
    runtime: false,
    requirements: [{ allOf: ['vue-app'], message: packageId => `router:vue-router requires vue-app for ${packageId}` }],
    conflicts: [],
    logicalSurfaces: () => [],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:router:vue-router',
        entries: { dependencies: { 'vue-router': '^5.1.0' } },
      },
      {
        kind: 'frontendEntry',
        surfaceId: vueEntrySurfaceId(context.packageId),
        owner: 'capability:router:vue-router',
        path: context.scopedPath('src/main.ts'),
        imports: ['import { createRouter, createWebHistory } from \'vue-router\''],
        declarations: [
          `const HomeView = { template: ${JSON.stringify(`<section><h1>${context.packageName}</h1><p>Vue router ready.</p></section>`)} }`,
          `const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: HomeView }],
})`,
        ],
        appUse: ['router'],
        styleImports: [],
      },
      {
        kind: 'vueAppShell',
        surfaceId: vueAppShellSurfaceId(context.packageId),
        owner: 'capability:router:vue-router',
        path: context.scopedPath('src/App.vue'),
        scriptImports: [],
        scriptSetup: [],
        templateContent: ['    <nav><RouterLink to="/">Home</RouterLink></nav>', '    <RouterView />'],
        mainClassNameTokens: [],
        routing: ['vue-router'],
      },
    ],
  },
  {
    id: 'state:jotai',
    scope: 'package',
    runtime: false,
    requirements: [{ allOf: ['react-app'], message: packageId => `state:jotai requires react-app for ${packageId}` }],
    conflicts: [],
    logicalSurfaces: () => [],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:state:jotai',
        entries: { dependencies: { jotai: '^2.20.1' } },
      },
      {
        kind: 'reactAppShell',
        surfaceId: reactAppShellSurfaceId(context.packageId),
        owner: 'capability:state:jotai',
        path: context.scopedPath('src/App.tsx'),
        imports: ['import { atom, useAtom } from \'jotai\''],
        moduleDeclarations: ['const readyCountAtom = atom(0)'],
        componentDeclarations: ['  const [readyCount, setReadyCount] = useAtom(readyCountAtom)'],
        content: [
          `      <h1>${context.packageName}</h1>`,
          '      <button type="button" onClick={() => setReadyCount(value => value + 1)}>',
          '        Jotai count: {readyCount}',
          '      </button>',
        ],
        mainClassNameTokens: [],
        routing: [],
      },
    ],
  },
  {
    id: 'state:pinia',
    scope: 'package',
    runtime: false,
    requirements: [{ allOf: ['vue-app'], message: packageId => `state:pinia requires vue-app for ${packageId}` }],
    conflicts: [],
    logicalSurfaces: () => [],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:state:pinia',
        entries: { dependencies: { pinia: '^3.0.4' } },
      },
      {
        kind: 'frontendEntry',
        surfaceId: vueEntrySurfaceId(context.packageId),
        owner: 'capability:state:pinia',
        path: context.scopedPath('src/main.ts'),
        imports: ['import { createPinia } from \'pinia\''],
        declarations: ['const pinia = createPinia()'],
        appUse: ['pinia'],
        styleImports: [],
      },
      {
        kind: 'vueAppShell',
        surfaceId: vueAppShellSurfaceId(context.packageId),
        owner: 'capability:state:pinia',
        path: context.scopedPath('src/App.vue'),
        scriptImports: ['import { defineStore, storeToRefs } from \'pinia\''],
        scriptSetup: [
          'const useCounterStore = defineStore(\'counter\', {',
          '  state: () => ({ count: 0 }),',
          '  actions: {',
          '    increment() {',
          '      this.count += 1',
          '    },',
          '  },',
          '})',
          'const counter = useCounterStore()',
          'const { count } = storeToRefs(counter)',
        ],
        templateContent: [
          '    <button type="button" @click="counter.increment()">',
          '      Pinia count: {{ count }}',
          '    </button>',
        ],
        mainClassNameTokens: [],
        routing: [],
      },
    ],
  },
]

const cssCapabilityDefinitions: readonly PackageCapabilityDefinition[] = [
  {
    id: 'css:less',
    scope: 'package',
    runtime: false,
    requirements: [{ anyOf: ['react-app', 'vue-app'], message: packageId => `css:less requires react-app or vue-app for ${packageId}` }],
    conflicts: [],
    logicalSurfaces: context => [styleSheetSurface(context.sourceScope, 'src/styles.less', 'capability:css:less')],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:css:less',
        entries: { devDependencies: { less: '^4.6.7' } },
      },
      {
        kind: 'frontendEntry',
        surfaceId: context.pkg.capabilities.includes('vue-app') ? vueEntrySurfaceId(context.packageId) : reactEntrySurfaceId(context.packageId),
        owner: 'capability:css:less',
        path: context.scopedPath(context.pkg.capabilities.includes('vue-app') ? 'src/main.ts' : 'src/main.tsx'),
        imports: [],
        declarations: [],
        appUse: [],
        styleImports: ['./styles.less'],
      },
      {
        kind: 'styleSheet',
        surfaceId: styleSheetSurfaceId(context.packageId, 'src/styles.less'),
        owner: 'capability:css:less',
        path: context.scopedPath('src/styles.less'),
        content: [
          '@surface-bg: #f8fafc;',
          '@surface-text: #1f2937;',
          '',
          ':root {',
          '  color: @surface-text;',
          '  background: @surface-bg;',
          '}',
          '',
          'body {',
          '  margin: 0;',
          '}',
        ],
      },
    ],
  },
  {
    id: 'css:tailwind',
    scope: 'package',
    runtime: false,
    requirements: [{ anyOf: ['react-app', 'vue-app'], message: packageId => `css:tailwind requires react-app or vue-app for ${packageId}` }],
    conflicts: [],
    logicalSurfaces: context => [styleSheetSurface(context.sourceScope, 'src/styles.css', 'capability:css:tailwind')],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:css:tailwind',
        entries: { devDependencies: { '@tailwindcss/vite': '^4.3.1', 'tailwindcss': '^4.3.1' } },
      },
      {
        kind: 'viteConfig',
        surfaceId: viteConfigSurfaceId(context.packageId),
        owner: 'capability:css:tailwind',
        path: context.scopedPath('vite.config.ts'),
        imports: ['import tailwindcss from \'@tailwindcss/vite\''],
        plugins: ['tailwindcss()'],
      },
      {
        kind: 'frontendEntry',
        surfaceId: context.pkg.capabilities.includes('vue-app') ? vueEntrySurfaceId(context.packageId) : reactEntrySurfaceId(context.packageId),
        owner: 'capability:css:tailwind',
        path: context.scopedPath(context.pkg.capabilities.includes('vue-app') ? 'src/main.ts' : 'src/main.tsx'),
        imports: [],
        declarations: [],
        appUse: [],
        styleImports: ['./styles.css'],
      },
      {
        kind: 'styleSheet',
        surfaceId: styleSheetSurfaceId(context.packageId, 'src/styles.css'),
        owner: 'capability:css:tailwind',
        path: context.scopedPath('src/styles.css'),
        content: ['@import "tailwindcss";'],
      },
      context.pkg.capabilities.includes('vue-app')
        ? {
            kind: 'vueAppShell',
            surfaceId: vueAppShellSurfaceId(context.packageId),
            owner: 'capability:css:tailwind',
            path: context.scopedPath('src/App.vue'),
            scriptImports: [],
            scriptSetup: [],
            templateContent: [],
            mainClassNameTokens: ['min-h-screen', 'grid', 'place-content-center', 'gap-4', 'bg-slate-50', 'text-slate-900'],
            routing: [],
          }
        : {
            kind: 'reactAppShell',
            surfaceId: reactAppShellSurfaceId(context.packageId),
            owner: 'capability:css:tailwind',
            path: context.scopedPath('src/App.tsx'),
            imports: [],
            moduleDeclarations: [],
            componentDeclarations: [],
            content: [],
            mainClassNameTokens: ['min-h-screen', 'grid', 'place-content-center', 'gap-4', 'bg-slate-50', 'text-slate-900'],
            routing: [],
          },
    ],
  },
]

export const frontendCapabilityDefinitions: readonly PackageCapabilityDefinition[] = [
  ...frontendRuntimeDefinitions,
  ...frontendFeatureDefinitions,
  ...cssCapabilityDefinitions,
]
