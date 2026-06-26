import type { CapabilityContribution, JsonValue, ResolvedGraph, ResolvedPackage } from './model'
import { effectHarnessContributions, hasEffectHarnessProvider } from './effect-harness-provider'

function reactAppShellSurfaceId(packageId: string) {
  return `react-app-shell:${packageId}` as const
}

function reactEntrySurfaceId(packageId: string) {
  return `react-app-entry:${packageId}` as const
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

function verifyScriptFor(graph: ResolvedGraph): string | undefined {
  const commands = ['pnpm build']

  if (graph.rootCapabilities.includes('linting')) {
    commands.push('pnpm lint')
  }

  if (graph.rootCapabilities.includes('knip')) {
    commands.push('pnpm knip')
  }

  return commands.length > 1 ? commands.join(' && ') : undefined
}

function effectPackageSource(graph: ResolvedGraph) {
  if (!hasEffectHarnessProvider(graph)) {
    return 'export {}\n'
  }

  return `import { NodeRuntime } from '@effect/platform-node'
import { Console, Effect } from 'effect'

const main = Effect.fn('main')(function* () {
  yield* Console.log(${JSON.stringify(`${graph.rootPackage.name} ready`)})
})

NodeRuntime.runMain(main())
`
}

function effectPackageBuildScript(graph: ResolvedGraph) {
  return hasEffectHarnessProvider(graph)
    ? 'tsgo --noEmit --project tsconfig.json'
    : 'tsc --noEmit --project tsconfig.json'
}

const effectPackageTsconfig = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
`

function distPackageManifestEntries(packageName: string, options: {
  readonly startScript: boolean
  readonly binName?: string
  readonly buildSuffix?: string
  readonly smokeBin?: string
}): Record<string, JsonValue> {
  const buildScript = `tsdown --config tsdown.config.ts${options.buildSuffix ?? ''}`

  return {
    name: packageName,
    type: 'module',
    version: '0.0.0',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    exports: {
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts',
      },
    },
    files: ['dist'],
    ...(options.binName === undefined
      ? {}
      : {
          bin: {
            [options.binName]: 'dist/index.js',
          },
        }),
    scripts: {
      build: buildScript,
      typecheck: 'tsc --noEmit --project tsconfig.json',
      ...(options.startScript ? { start: 'node dist/index.js' } : {}),
      ...(options.smokeBin === undefined ? {} : { 'smoke:bin': options.smokeBin }),
      prepack: 'pnpm build',
    },
    devDependencies: {
      ...(options.startScript || options.binName !== undefined ? { '@types/node': 'catalog:' } : {}),
      tsdown: 'catalog:',
      typescript: 'catalog:',
    },
  }
}

function typeScriptPackageTsconfig(options: { readonly nodeTypes: boolean }): Record<string, JsonValue> {
  return {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022'],
      module: options.nodeTypes ? 'NodeNext' : 'ESNext',
      moduleResolution: options.nodeTypes ? 'NodeNext' : 'Bundler',
      strict: true,
      isolatedModules: true,
      verbatimModuleSyntax: true,
      skipLibCheck: true,
      ...(options.nodeTypes ? { types: ['node'] } : {}),
    },
    include: ['src/**/*.ts'],
  }
}

function nodeBackendSource(packageName: string) {
  return `import { fileURLToPath } from 'node:url'

const serviceName = ${JSON.stringify(packageName)}

export interface HealthCheck {
  readonly status: 'ok'
  readonly service: string
}

export function healthCheck(): HealthCheck {
  return {
    status: 'ok',
    service: serviceName,
  }
}

export function start() {
  const check = healthCheck()
  console.log(\`\${check.service} ready\`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start()
}
`
}

function librarySource(packageName: string) {
  return `const packageName = ${JSON.stringify(packageName)}

export interface Greeting {
  readonly message: string
}

export function createGreeting(name = 'world'): Greeting {
  return {
    message: \`\${packageName}: hello \${name}\`,
  }
}
`
}

function cliToolSource(packageName: string) {
  const helpText = JSON.stringify(`Usage: ${packageName} [--help]`)

  return `#!/usr/bin/env node
import { fileURLToPath } from 'node:url'

const commandName = ${JSON.stringify(packageName)}

function printHelp() {
  console.log(${helpText})
}

export function main(argv = process.argv.slice(2)) {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp()
    return
  }

  console.log(\`\${commandName} ready\`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
`
}

const cliEnsureShebangScript = `import { chmod, readFile, writeFile } from 'node:fs/promises'

const binPath = new URL('../dist/index.js', import.meta.url)
const shebang = '#!/usr/bin/env node'
const content = await readFile(binPath, 'utf8')
const contentWithoutExistingShebang = content.replace(/^#![^\\n]*(?:\\n|$)/u, '')
const nextContent = content.startsWith(\`\${shebang}\\n\`)
  ? content
  : \`\${shebang}\\n\${contentWithoutExistingShebang}\`

if (nextContent !== content) {
  await writeFile(binPath, nextContent)
}

await chmod(binPath, 0o755)
`

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

function knipRootConfig(): Record<string, JsonValue> {
  return {
    $schema: 'https://unpkg.com/knip@6/schema.json',
  }
}

function scopedPath(pkg: ResolvedPackage, filePath: string) {
  return pkg.path === '.' ? filePath : `${pkg.path}/${filePath}`
}

function packageManifestSurfaceId(pkg: ResolvedPackage) {
  return pkg.path === '.' ? 'package-manifest:root' : `package-manifest:${pkg.path}` as const
}

function packageSurfaceScope(pkg: ResolvedPackage) {
  return pkg.path === '.' ? pkg.id : pkg.path
}

function scopedTypeScriptConfigSurfaceId(pkg: ResolvedPackage) {
  return pkg.path === '.' ? 'typescript-config:root' : `typescript-config:${pkg.path}`
}

function scopedTsdownConfigSurfaceId(pkg: ResolvedPackage) {
  return pkg.path === '.' ? 'tsdown-config:root' : `tsdown-config:${pkg.path}`
}

function workspaceGlobs(packages: readonly ResolvedPackage[]) {
  const globs: string[] = []

  for (const pkg of packages) {
    const [directory] = pkg.path.split('/')
    if (directory && pkg.path !== '.') {
      const glob = `${directory}/*`
      if (!globs.includes(glob)) {
        globs.push(glob)
      }
    }
  }

  return globs
}

function workspaceRootPackageEntries(graph: ResolvedGraph): Record<string, JsonValue> {
  const scripts: Record<string, JsonValue> = {
    build: 'pnpm -r --if-present build',
    typecheck: 'pnpm -r --if-present typecheck',
  }
  const verifyScript = verifyScriptFor(graph)

  if (verifyScript) {
    scripts.verify = verifyScript
  }

  return {
    private: true,
    scripts,
  }
}

function workspaceRootContributions(graph: ResolvedGraph): CapabilityContribution[] {
  const contributions: CapabilityContribution[] = [
    {
      kind: 'packageManifest',
      surfaceId: 'package-manifest:root',
      owner: 'topology:workspace',
      entries: workspaceRootPackageEntries(graph),
    },
    {
      kind: 'workspaceManifest',
      surfaceId: 'workspace-manifest:root',
      owner: 'topology:workspace',
      globs: workspaceGlobs(graph.packages),
    },
  ]

  for (const capability of graph.rootCapabilities) {
    switch (capability) {
      case 'package-manager:pnpm':
        contributions.push({
          kind: 'packageManifest',
          surfaceId: 'package-manifest:root',
          owner: 'capability:package-manager:pnpm',
          entries: {
            packageManager: 'pnpm@10.33.4',
          },
        })
        break
      case 'linting':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:linting',
            entries: {
              scripts: {
                lint: 'eslint .',
              },
              devDependencies: {
                '@antfu/eslint-config': 'catalog:',
                'eslint': 'catalog:',
                'typescript': 'catalog:',
              },
            },
          },
          {
            kind: 'eslintRoot',
            surfaceId: 'eslint-root',
            owner: 'capability:linting',
          },
        )
        break
      case 'knip':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:knip',
            entries: {
              scripts: {
                knip: 'knip',
              },
              devDependencies: {
                knip: 'catalog:',
              },
            },
          },
          {
            kind: 'knipRoot',
            surfaceId: 'knip-root',
            owner: 'capability:knip',
            config: knipRootConfig(),
          },
        )
        break
      case 'dependency-update:taze':
        contributions.push({
          kind: 'packageManifest',
          surfaceId: 'package-manifest:root',
          owner: 'capability:dependency-update:taze',
          entries: {
            scripts: {
              'deps:check': 'taze -r',
            },
            devDependencies: {
              taze: 'catalog:',
            },
          },
        })
    }
  }

  return contributions
}

function workspaceInternalDependencyEntries(pkg: ResolvedPackage): Record<string, JsonValue> | undefined {
  if (!pkg.internalDependencies || pkg.internalDependencies.length === 0) {
    return undefined
  }

  return {
    dependencies: Object.fromEntries(
      pkg.internalDependencies.map(dependency => [dependency.dependencyName, dependency.range]),
    ),
  }
}

function collectWorkspacePackageContributions(graph: ResolvedGraph, pkg: ResolvedPackage): CapabilityContribution[] {
  const contributions: CapabilityContribution[] = []
  const packageId = packageSurfaceScope(pkg)
  const packageName = pkg.name
  const manifestSurfaceId = packageManifestSurfaceId(pkg)
  const internalDependencyEntries = workspaceInternalDependencyEntries(pkg)

  if (internalDependencyEntries) {
    contributions.push({
      kind: 'packageManifest',
      surfaceId: manifestSurfaceId,
      owner: 'resolver:workspace-dependencies',
      entries: internalDependencyEntries,
    })
  }

  for (const capability of pkg.capabilities) {
    switch (capability) {
      case 'minimal-node-package':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:minimal-node-package',
            entries: {
              name: packageName,
              type: 'module',
              version: '0.0.0',
              scripts: {
                build: 'tsc --noEmit',
              },
            },
          },
          {
            kind: 'generatedUserFile',
            surfaceId: `source:${pkg.path}/src/index.ts`,
            owner: 'capability:minimal-node-package',
            path: scopedPath(pkg, 'src/index.ts'),
            content: 'export {}\n',
          },
        )
        break
      case 'effect-package':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:effect-package',
            entries: {
              name: packageName,
              type: 'module',
              version: '0.0.0',
              scripts: {
                build: effectPackageBuildScript(graph),
              },
              devDependencies: {
                '@types/node': 'catalog:',
                'typescript': 'catalog:',
              },
            },
          },
          {
            kind: 'generatedUserFile',
            surfaceId: `source:${pkg.path}/src/index.ts`,
            owner: 'capability:effect-package',
            path: scopedPath(pkg, 'src/index.ts'),
            content: 'export {}\n',
          },
          {
            kind: 'generatedUserFile',
            surfaceId: `tsconfig:${pkg.path}`,
            owner: 'capability:effect-package',
            path: scopedPath(pkg, 'tsconfig.json'),
            content: effectPackageTsconfig,
          },
        )
        break
      case 'node-backend':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:node-backend',
            entries: distPackageManifestEntries(packageName, { startScript: true }),
          },
          {
            kind: 'generatedUserFile',
            surfaceId: `source:${pkg.path}/src/index.ts`,
            owner: 'capability:node-backend',
            path: scopedPath(pkg, 'src/index.ts'),
            content: nodeBackendSource(packageName),
          },
          {
            kind: 'typescriptConfig',
            surfaceId: scopedTypeScriptConfigSurfaceId(pkg),
            owner: 'capability:node-backend',
            value: typeScriptPackageTsconfig({ nodeTypes: true }),
          },
          {
            kind: 'tsdownConfig',
            surfaceId: scopedTsdownConfigSurfaceId(pkg),
            owner: 'capability:node-backend',
          },
        )
        break
      case 'library':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:library',
            entries: distPackageManifestEntries(packageName, { startScript: false }),
          },
          {
            kind: 'generatedUserFile',
            surfaceId: `source:${pkg.path}/src/index.ts`,
            owner: 'capability:library',
            path: scopedPath(pkg, 'src/index.ts'),
            content: librarySource(packageName),
          },
          {
            kind: 'typescriptConfig',
            surfaceId: scopedTypeScriptConfigSurfaceId(pkg),
            owner: 'capability:library',
            value: typeScriptPackageTsconfig({ nodeTypes: false }),
          },
          {
            kind: 'tsdownConfig',
            surfaceId: scopedTsdownConfigSurfaceId(pkg),
            owner: 'capability:library',
          },
        )
        break
      case 'cli-tool':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:cli-tool',
            entries: distPackageManifestEntries(packageName, {
              startScript: false,
              binName: packageName,
              buildSuffix: ' && node scripts/ensure-shebang.mjs',
              smokeBin: 'pnpm build && ./dist/index.js --help',
            }),
          },
          {
            kind: 'generatedUserFile',
            surfaceId: `source:${pkg.path}/src/index.ts`,
            owner: 'capability:cli-tool',
            path: scopedPath(pkg, 'src/index.ts'),
            content: cliToolSource(packageName),
          },
          {
            kind: 'generatedUserFile',
            surfaceId: `source:${pkg.path}/scripts/ensure-shebang.mjs`,
            owner: 'capability:cli-tool',
            path: scopedPath(pkg, 'scripts/ensure-shebang.mjs'),
            content: cliEnsureShebangScript,
          },
          {
            kind: 'typescriptConfig',
            surfaceId: scopedTypeScriptConfigSurfaceId(pkg),
            owner: 'capability:cli-tool',
            value: typeScriptPackageTsconfig({ nodeTypes: true }),
          },
          {
            kind: 'tsdownConfig',
            surfaceId: scopedTsdownConfigSurfaceId(pkg),
            owner: 'capability:cli-tool',
          },
        )
        break
      case 'react-app':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:react-app',
            entries: {
              name: packageName,
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
            surfaceId: `react-app-static:${packageId}/index.html`,
            owner: 'capability:react-app',
            path: scopedPath(pkg, 'index.html'),
            content: `<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
`,
          },
          {
            kind: 'frontendEntry',
            surfaceId: reactEntrySurfaceId(packageId),
            owner: 'capability:react-app',
            path: scopedPath(pkg, 'src/main.tsx'),
            framework: 'react',
            imports: [],
            declarations: [],
            appUse: [],
            styleImports: [],
          },
          {
            kind: 'viteConfig',
            surfaceId: viteConfigSurfaceId(packageId),
            owner: 'capability:react-app',
            path: scopedPath(pkg, 'vite.config.ts'),
            imports: ['import react from \'@vitejs/plugin-react\''],
            plugins: ['react()'],
          },
          {
            kind: 'typescriptConfig',
            surfaceId: scopedTypeScriptConfigSurfaceId(pkg),
            owner: 'capability:react-app',
            value: reactAppTsconfig(),
          },
          {
            kind: 'reactAppShell',
            surfaceId: reactAppShellSurfaceId(packageId),
            owner: 'capability:react-app',
            path: scopedPath(pkg, 'src/App.tsx'),
            imports: [],
            moduleDeclarations: [],
            componentDeclarations: [],
            content: [
              `      <h1>${packageName}</h1>`,
              '      <p>React app ready.</p>',
            ],
            mainClassNameTokens: [],
            routing: [],
          },
        )
        break
      case 'vue-app':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:vue-app',
            entries: {
              name: packageName,
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
            surfaceId: vueStaticSurfaceId(packageId, 'index.html'),
            owner: 'capability:vue-app',
            path: scopedPath(pkg, 'index.html'),
            content: `<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
`,
          },
          {
            kind: 'frontendEntry',
            surfaceId: vueEntrySurfaceId(packageId),
            owner: 'capability:vue-app',
            path: scopedPath(pkg, 'src/main.ts'),
            framework: 'vue',
            imports: [],
            declarations: [],
            appUse: [],
            styleImports: [],
          },
          {
            kind: 'vueAppShell',
            surfaceId: vueAppShellSurfaceId(packageId),
            owner: 'capability:vue-app',
            path: scopedPath(pkg, 'src/App.vue'),
            scriptImports: [],
            scriptSetup: [`const appName = ${JSON.stringify(packageName)}`],
            templateContent: [
              '    <h1>{{ appName }}</h1>',
              '    <p>Vue app ready.</p>',
            ],
            mainClassNameTokens: [],
            routing: [],
          },
          {
            kind: 'viteConfig',
            surfaceId: viteConfigSurfaceId(packageId),
            owner: 'capability:vue-app',
            path: scopedPath(pkg, 'vite.config.ts'),
            imports: ['import vue from \'@vitejs/plugin-vue\''],
            plugins: ['vue()'],
          },
          {
            kind: 'typescriptConfig',
            surfaceId: scopedTypeScriptConfigSurfaceId(pkg),
            owner: 'capability:vue-app',
            value: vueAppTsconfig(),
          },
        )
        break
      case 'react-counter':
        contributions.push({
          kind: 'reactAppShell',
          surfaceId: reactAppShellSurfaceId(packageId),
          owner: 'capability:react-counter',
          path: scopedPath(pkg, 'src/App.tsx'),
          imports: ['import { useState } from \'react\''],
          moduleDeclarations: [],
          componentDeclarations: ['  const [count, setCount] = useState(0)'],
          content: [
            `      <h1>${packageName}</h1>`,
            '      <button type="button" onClick={() => setCount(value => value + 1)}>',
            '        Count: {count}',
            '      </button>',
          ],
          mainClassNameTokens: [],
          routing: [],
        })
        break
      case 'router:react-router':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:router:react-router',
            entries: {
              dependencies: {
                'react-router': '^8.0.1',
              },
            },
          },
          {
            kind: 'reactAppShell',
            surfaceId: reactAppShellSurfaceId(packageId),
            owner: 'capability:router:react-router',
            path: scopedPath(pkg, 'src/App.tsx'),
            imports: ['import { BrowserRouter, Link, Route, Routes } from \'react-router\''],
            moduleDeclarations: [],
            componentDeclarations: [],
            content: [],
            mainClassNameTokens: [],
            routing: ['react-router'],
          },
        )
        break
      case 'router:vue-router':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:router:vue-router',
            entries: {
              dependencies: {
                'vue-router': '^5.1.0',
              },
            },
          },
          {
            kind: 'frontendEntry',
            surfaceId: vueEntrySurfaceId(packageId),
            owner: 'capability:router:vue-router',
            path: scopedPath(pkg, 'src/main.ts'),
            imports: ['import { createRouter, createWebHistory } from \'vue-router\''],
            declarations: [
              `const HomeView = { template: ${JSON.stringify(`<section><h1>${packageName}</h1><p>Vue router ready.</p></section>`)} }`,
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
            surfaceId: vueAppShellSurfaceId(packageId),
            owner: 'capability:router:vue-router',
            path: scopedPath(pkg, 'src/App.vue'),
            scriptImports: [],
            scriptSetup: [],
            templateContent: [
              '    <nav><RouterLink to="/">Home</RouterLink></nav>',
              '    <RouterView />',
            ],
            mainClassNameTokens: [],
            routing: ['vue-router'],
          },
        )
        break
      case 'state:jotai':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:state:jotai',
            entries: {
              dependencies: {
                jotai: '^2.20.1',
              },
            },
          },
          {
            kind: 'reactAppShell',
            surfaceId: reactAppShellSurfaceId(packageId),
            owner: 'capability:state:jotai',
            path: scopedPath(pkg, 'src/App.tsx'),
            imports: ['import { atom, useAtom } from \'jotai\''],
            moduleDeclarations: ['const readyCountAtom = atom(0)'],
            componentDeclarations: ['  const [readyCount, setReadyCount] = useAtom(readyCountAtom)'],
            content: [
              `      <h1>${packageName}</h1>`,
              '      <button type="button" onClick={() => setReadyCount(value => value + 1)}>',
              '        Jotai count: {readyCount}',
              '      </button>',
            ],
            mainClassNameTokens: [],
            routing: [],
          },
        )
        break
      case 'state:pinia':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:state:pinia',
            entries: {
              dependencies: {
                pinia: '^3.0.4',
              },
            },
          },
          {
            kind: 'frontendEntry',
            surfaceId: vueEntrySurfaceId(packageId),
            owner: 'capability:state:pinia',
            path: scopedPath(pkg, 'src/main.ts'),
            imports: ['import { createPinia } from \'pinia\''],
            declarations: ['const pinia = createPinia()'],
            appUse: ['pinia'],
            styleImports: [],
          },
          {
            kind: 'vueAppShell',
            surfaceId: vueAppShellSurfaceId(packageId),
            owner: 'capability:state:pinia',
            path: scopedPath(pkg, 'src/App.vue'),
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
        )
        break
      case 'css:less':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:css:less',
            entries: {
              devDependencies: {
                less: '^4.6.7',
              },
            },
          },
          {
            kind: 'frontendEntry',
            surfaceId: pkg.capabilities.includes('vue-app')
              ? vueEntrySurfaceId(packageId)
              : reactEntrySurfaceId(packageId),
            owner: 'capability:css:less',
            path: scopedPath(pkg, pkg.capabilities.includes('vue-app') ? 'src/main.ts' : 'src/main.tsx'),
            imports: [],
            declarations: [],
            appUse: [],
            styleImports: ['./styles.less'],
          },
          {
            kind: 'styleSheet',
            surfaceId: styleSheetSurfaceId(packageId, 'src/styles.less'),
            owner: 'capability:css:less',
            path: scopedPath(pkg, 'src/styles.less'),
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
        )
        break
      case 'css:tailwind':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: manifestSurfaceId,
            owner: 'capability:css:tailwind',
            entries: {
              devDependencies: {
                '@tailwindcss/vite': '^4.3.1',
                'tailwindcss': '^4.3.1',
              },
            },
          },
          {
            kind: 'viteConfig',
            surfaceId: viteConfigSurfaceId(packageId),
            owner: 'capability:css:tailwind',
            path: scopedPath(pkg, 'vite.config.ts'),
            imports: ['import tailwindcss from \'@tailwindcss/vite\''],
            plugins: ['tailwindcss()'],
          },
          {
            kind: 'frontendEntry',
            surfaceId: pkg.capabilities.includes('vue-app')
              ? vueEntrySurfaceId(packageId)
              : reactEntrySurfaceId(packageId),
            owner: 'capability:css:tailwind',
            path: scopedPath(pkg, pkg.capabilities.includes('vue-app') ? 'src/main.ts' : 'src/main.tsx'),
            imports: [],
            declarations: [],
            appUse: [],
            styleImports: ['./styles.css'],
          },
          {
            kind: 'styleSheet',
            surfaceId: styleSheetSurfaceId(packageId, 'src/styles.css'),
            owner: 'capability:css:tailwind',
            path: scopedPath(pkg, 'src/styles.css'),
            content: [
              '@import "tailwindcss";',
            ],
          },
          pkg.capabilities.includes('vue-app')
            ? {
                kind: 'vueAppShell',
                surfaceId: vueAppShellSurfaceId(packageId),
                owner: 'capability:css:tailwind',
                path: scopedPath(pkg, 'src/App.vue'),
                scriptImports: [],
                scriptSetup: [],
                templateContent: [],
                mainClassNameTokens: [
                  'min-h-screen',
                  'grid',
                  'place-content-center',
                  'gap-4',
                  'bg-slate-50',
                  'text-slate-900',
                ],
                routing: [],
              }
            : {
                kind: 'reactAppShell',
                surfaceId: reactAppShellSurfaceId(packageId),
                owner: 'capability:css:tailwind',
                path: scopedPath(pkg, 'src/App.tsx'),
                imports: [],
                moduleDeclarations: [],
                componentDeclarations: [],
                content: [],
                mainClassNameTokens: [
                  'min-h-screen',
                  'grid',
                  'place-content-center',
                  'gap-4',
                  'bg-slate-50',
                  'text-slate-900',
                ],
                routing: [],
              },
        )
        break
    }
  }

  return contributions
}

export function collectCapabilityContributions(graph: ResolvedGraph): readonly CapabilityContribution[] {
  if (graph.topology === 'workspace') {
    return [
      ...workspaceRootContributions(graph),
      ...graph.packages.flatMap(pkg => collectWorkspacePackageContributions(graph, pkg)),
    ]
  }

  const contributions: CapabilityContribution[] = []
  const packageId = graph.rootPackage.id
  const packageName = graph.rootPackage.name

  for (const capability of graph.rootPackage.capabilities) {
    switch (capability) {
      case 'minimal-node-package':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:minimal-node-package',
            entries: {
              name: graph.rootPackage.name,
              type: 'module',
              version: '0.0.0',
              scripts: {
                build: 'tsc --noEmit',
              },
            },
          },
          {
            kind: 'generatedUserFile',
            surfaceId: 'source:root/src/index.ts',
            owner: 'capability:minimal-node-package',
            path: 'src/index.ts',
            content: 'export {}\n',
          },
        )
        break
      case 'effect-package':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:effect-package',
            entries: {
              name: graph.rootPackage.name,
              type: 'module',
              version: '0.0.0',
              scripts: {
                build: effectPackageBuildScript(graph),
              },
              devDependencies: {
                '@types/node': 'catalog:',
                'typescript': 'catalog:',
              },
            },
          },
          {
            kind: 'generatedUserFile',
            surfaceId: 'source:root/src/index.ts',
            owner: 'capability:effect-package',
            path: 'src/index.ts',
            content: effectPackageSource(graph),
          },
          {
            kind: 'generatedUserFile',
            surfaceId: 'tsconfig:root',
            owner: 'capability:effect-package',
            path: 'tsconfig.json',
            content: effectPackageTsconfig,
          },
        )
        break
      case 'node-backend':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:node-backend',
            entries: distPackageManifestEntries(packageName, { startScript: true }),
          },
          {
            kind: 'generatedUserFile',
            surfaceId: 'source:node-backend/src/index.ts',
            owner: 'capability:node-backend',
            path: 'src/index.ts',
            content: nodeBackendSource(packageName),
          },
          {
            kind: 'typescriptConfig',
            surfaceId: 'typescript-config:root',
            owner: 'capability:node-backend',
            value: typeScriptPackageTsconfig({ nodeTypes: true }),
          },
          {
            kind: 'tsdownConfig',
            surfaceId: 'tsdown-config:root',
            owner: 'capability:node-backend',
          },
        )
        break
      case 'library':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:library',
            entries: distPackageManifestEntries(packageName, { startScript: false }),
          },
          {
            kind: 'generatedUserFile',
            surfaceId: 'source:library/src/index.ts',
            owner: 'capability:library',
            path: 'src/index.ts',
            content: librarySource(packageName),
          },
          {
            kind: 'typescriptConfig',
            surfaceId: 'typescript-config:root',
            owner: 'capability:library',
            value: typeScriptPackageTsconfig({ nodeTypes: false }),
          },
          {
            kind: 'tsdownConfig',
            surfaceId: 'tsdown-config:root',
            owner: 'capability:library',
          },
        )
        break
      case 'cli-tool':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:cli-tool',
            entries: distPackageManifestEntries(packageName, {
              startScript: false,
              binName: packageName,
              buildSuffix: ' && node scripts/ensure-shebang.mjs',
              smokeBin: 'pnpm build && ./dist/index.js --help',
            }),
          },
          {
            kind: 'generatedUserFile',
            surfaceId: 'source:cli-tool/src/index.ts',
            owner: 'capability:cli-tool',
            path: 'src/index.ts',
            content: cliToolSource(packageName),
          },
          {
            kind: 'generatedUserFile',
            surfaceId: 'cli-tool-support:scripts/ensure-shebang.mjs',
            owner: 'capability:cli-tool',
            path: 'scripts/ensure-shebang.mjs',
            content: cliEnsureShebangScript,
          },
          {
            kind: 'typescriptConfig',
            surfaceId: 'typescript-config:root',
            owner: 'capability:cli-tool',
            value: typeScriptPackageTsconfig({ nodeTypes: true }),
          },
          {
            kind: 'tsdownConfig',
            surfaceId: 'tsdown-config:root',
            owner: 'capability:cli-tool',
          },
        )
        break
      case 'react-app':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:react-app',
            entries: {
              name: packageName,
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
            surfaceId: `react-app-static:${packageId}/index.html`,
            owner: 'capability:react-app',
            path: 'index.html',
            content: `<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
`,
          },
          {
            kind: 'frontendEntry',
            surfaceId: reactEntrySurfaceId(packageId),
            owner: 'capability:react-app',
            path: 'src/main.tsx',
            framework: 'react',
            imports: [],
            declarations: [],
            appUse: [],
            styleImports: [],
          },
          {
            kind: 'viteConfig',
            surfaceId: viteConfigSurfaceId(packageId),
            owner: 'capability:react-app',
            path: 'vite.config.ts',
            imports: ['import react from \'@vitejs/plugin-react\''],
            plugins: ['react()'],
          },
          {
            kind: 'typescriptConfig',
            surfaceId: 'typescript-config:root',
            owner: 'capability:react-app',
            value: reactAppTsconfig(),
          },
          {
            kind: 'reactAppShell',
            surfaceId: reactAppShellSurfaceId(packageId),
            owner: 'capability:react-app',
            path: 'src/App.tsx',
            imports: [],
            moduleDeclarations: [],
            componentDeclarations: [],
            content: [
              `      <h1>${packageName}</h1>`,
              '      <p>React app ready.</p>',
            ],
            mainClassNameTokens: [],
            routing: [],
          },
        )
        break
      case 'vue-app':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:vue-app',
            entries: {
              name: packageName,
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
            surfaceId: vueStaticSurfaceId(packageId, 'index.html'),
            owner: 'capability:vue-app',
            path: 'index.html',
            content: `<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
`,
          },
          {
            kind: 'frontendEntry',
            surfaceId: vueEntrySurfaceId(packageId),
            owner: 'capability:vue-app',
            path: 'src/main.ts',
            framework: 'vue',
            imports: [],
            declarations: [],
            appUse: [],
            styleImports: [],
          },
          {
            kind: 'vueAppShell',
            surfaceId: vueAppShellSurfaceId(packageId),
            owner: 'capability:vue-app',
            path: 'src/App.vue',
            scriptImports: [],
            scriptSetup: [`const appName = ${JSON.stringify(packageName)}`],
            templateContent: [
              '    <h1>{{ appName }}</h1>',
              '    <p>Vue app ready.</p>',
            ],
            mainClassNameTokens: [],
            routing: [],
          },
          {
            kind: 'viteConfig',
            surfaceId: viteConfigSurfaceId(packageId),
            owner: 'capability:vue-app',
            path: 'vite.config.ts',
            imports: ['import vue from \'@vitejs/plugin-vue\''],
            plugins: ['vue()'],
          },
          {
            kind: 'typescriptConfig',
            surfaceId: 'typescript-config:root',
            owner: 'capability:vue-app',
            value: vueAppTsconfig(),
          },
        )
        break
      case 'react-counter':
        contributions.push({
          kind: 'reactAppShell',
          surfaceId: reactAppShellSurfaceId(packageId),
          owner: 'capability:react-counter',
          path: 'src/App.tsx',
          imports: ['import { useState } from \'react\''],
          moduleDeclarations: [],
          componentDeclarations: ['  const [count, setCount] = useState(0)'],
          content: [
            `      <h1>${packageName}</h1>`,
            '      <button type="button" onClick={() => setCount(value => value + 1)}>',
            '        Count: {count}',
            '      </button>',
          ],
          mainClassNameTokens: [],
          routing: [],
        })
        break
      case 'router:react-router':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:router:react-router',
            entries: {
              dependencies: {
                'react-router': '^8.0.1',
              },
            },
          },
          {
            kind: 'reactAppShell',
            surfaceId: reactAppShellSurfaceId(packageId),
            owner: 'capability:router:react-router',
            path: 'src/App.tsx',
            imports: ['import { BrowserRouter, Link, Route, Routes } from \'react-router\''],
            moduleDeclarations: [],
            componentDeclarations: [],
            content: [],
            mainClassNameTokens: [],
            routing: ['react-router'],
          },
        )
        break
      case 'router:vue-router':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:router:vue-router',
            entries: {
              dependencies: {
                'vue-router': '^5.1.0',
              },
            },
          },
          {
            kind: 'frontendEntry',
            surfaceId: vueEntrySurfaceId(packageId),
            owner: 'capability:router:vue-router',
            path: 'src/main.ts',
            imports: ['import { createRouter, createWebHistory } from \'vue-router\''],
            declarations: [
              `const HomeView = { template: ${JSON.stringify(`<section><h1>${packageName}</h1><p>Vue router ready.</p></section>`)} }`,
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
            surfaceId: vueAppShellSurfaceId(packageId),
            owner: 'capability:router:vue-router',
            path: 'src/App.vue',
            scriptImports: [],
            scriptSetup: [],
            templateContent: [
              '    <nav><RouterLink to="/">Home</RouterLink></nav>',
              '    <RouterView />',
            ],
            mainClassNameTokens: [],
            routing: ['vue-router'],
          },
        )
        break
      case 'state:jotai':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:state:jotai',
            entries: {
              dependencies: {
                jotai: '^2.20.1',
              },
            },
          },
          {
            kind: 'reactAppShell',
            surfaceId: reactAppShellSurfaceId(packageId),
            owner: 'capability:state:jotai',
            path: 'src/App.tsx',
            imports: ['import { atom, useAtom } from \'jotai\''],
            moduleDeclarations: ['const readyCountAtom = atom(0)'],
            componentDeclarations: ['  const [readyCount, setReadyCount] = useAtom(readyCountAtom)'],
            content: [
              `      <h1>${packageName}</h1>`,
              '      <button type="button" onClick={() => setReadyCount(value => value + 1)}>',
              '        Jotai count: {readyCount}',
              '      </button>',
            ],
            mainClassNameTokens: [],
            routing: [],
          },
        )
        break
      case 'state:pinia':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:state:pinia',
            entries: {
              dependencies: {
                pinia: '^3.0.4',
              },
            },
          },
          {
            kind: 'frontendEntry',
            surfaceId: vueEntrySurfaceId(packageId),
            owner: 'capability:state:pinia',
            path: 'src/main.ts',
            imports: ['import { createPinia } from \'pinia\''],
            declarations: ['const pinia = createPinia()'],
            appUse: ['pinia'],
            styleImports: [],
          },
          {
            kind: 'vueAppShell',
            surfaceId: vueAppShellSurfaceId(packageId),
            owner: 'capability:state:pinia',
            path: 'src/App.vue',
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
        )
        break
      case 'css:less':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:css:less',
            entries: {
              devDependencies: {
                less: '^4.6.7',
              },
            },
          },
          {
            kind: 'frontendEntry',
            surfaceId: graph.rootPackage.capabilities.includes('vue-app')
              ? vueEntrySurfaceId(packageId)
              : reactEntrySurfaceId(packageId),
            owner: 'capability:css:less',
            path: graph.rootPackage.capabilities.includes('vue-app') ? 'src/main.ts' : 'src/main.tsx',
            imports: [],
            declarations: [],
            appUse: [],
            styleImports: ['./styles.less'],
          },
          {
            kind: 'styleSheet',
            surfaceId: styleSheetSurfaceId(packageId, 'src/styles.less'),
            owner: 'capability:css:less',
            path: 'src/styles.less',
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
        )
        break
      case 'css:tailwind':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:css:tailwind',
            entries: {
              devDependencies: {
                '@tailwindcss/vite': '^4.3.1',
                'tailwindcss': '^4.3.1',
              },
            },
          },
          {
            kind: 'viteConfig',
            surfaceId: viteConfigSurfaceId(packageId),
            owner: 'capability:css:tailwind',
            path: 'vite.config.ts',
            imports: ['import tailwindcss from \'@tailwindcss/vite\''],
            plugins: ['tailwindcss()'],
          },
          {
            kind: 'frontendEntry',
            surfaceId: graph.rootPackage.capabilities.includes('vue-app')
              ? vueEntrySurfaceId(packageId)
              : reactEntrySurfaceId(packageId),
            owner: 'capability:css:tailwind',
            path: graph.rootPackage.capabilities.includes('vue-app') ? 'src/main.ts' : 'src/main.tsx',
            imports: [],
            declarations: [],
            appUse: [],
            styleImports: ['./styles.css'],
          },
          {
            kind: 'styleSheet',
            surfaceId: styleSheetSurfaceId(packageId, 'src/styles.css'),
            owner: 'capability:css:tailwind',
            path: 'src/styles.css',
            content: [
              '@import "tailwindcss";',
            ],
          },
          graph.rootPackage.capabilities.includes('vue-app')
            ? {
                kind: 'vueAppShell',
                surfaceId: vueAppShellSurfaceId(packageId),
                owner: 'capability:css:tailwind',
                path: 'src/App.vue',
                scriptImports: [],
                scriptSetup: [],
                templateContent: [],
                mainClassNameTokens: [
                  'min-h-screen',
                  'grid',
                  'place-content-center',
                  'gap-4',
                  'bg-slate-50',
                  'text-slate-900',
                ],
                routing: [],
              }
            : {
                kind: 'reactAppShell',
                surfaceId: reactAppShellSurfaceId(packageId),
                owner: 'capability:css:tailwind',
                path: 'src/App.tsx',
                imports: [],
                moduleDeclarations: [],
                componentDeclarations: [],
                content: [],
                mainClassNameTokens: [
                  'min-h-screen',
                  'grid',
                  'place-content-center',
                  'gap-4',
                  'bg-slate-50',
                  'text-slate-900',
                ],
                routing: [],
              },
        )
        break
    }
  }

  for (const capability of graph.rootCapabilities) {
    switch (capability) {
      case 'package-manager:pnpm':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:package-manager:pnpm',
            entries: {
              packageManager: 'pnpm@10.33.4',
            },
          },
        )
        break
      case 'linting':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:linting',
            entries: {
              scripts: {
                lint: 'eslint .',
              },
              devDependencies: {
                '@antfu/eslint-config': 'catalog:',
                'eslint': 'catalog:',
                'typescript': 'catalog:',
              },
            },
          },
          {
            kind: 'eslintRoot',
            surfaceId: 'eslint-root',
            owner: 'capability:linting',
          },
        )
        break
      case 'knip':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:knip',
            entries: {
              scripts: {
                knip: 'knip',
              },
              devDependencies: {
                knip: 'catalog:',
              },
            },
          },
          {
            kind: 'knipRoot',
            surfaceId: 'knip-root',
            owner: 'capability:knip',
            config: knipRootConfig(),
          },
        )
        break
      case 'dependency-update:taze':
        contributions.push(
          {
            kind: 'packageManifest',
            surfaceId: 'package-manifest:root',
            owner: 'capability:dependency-update:taze',
            entries: {
              scripts: {
                'deps:check': 'taze -r',
              },
              devDependencies: {
                taze: 'catalog:',
              },
            },
          },
        )
    }
  }

  const verifyScript = verifyScriptFor(graph)
  if (verifyScript) {
    contributions.push({
      kind: 'packageManifest',
      surfaceId: 'package-manifest:root',
      owner: 'resolver:verification',
      entries: {
        scripts: {
          verify: verifyScript,
        },
      },
    })
  }

  if (hasEffectHarnessProvider(graph)) {
    contributions.push(...effectHarnessContributions(graph))
  }

  return contributions
}
