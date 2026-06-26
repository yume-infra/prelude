import type { CapabilityId, JsonValue } from '../model'
import type { PackageCapabilityDefinition, PackageManifestEntries } from './types'
import { hasEffectHarnessProvider } from '../effect-harness-provider'
import {
  sourceSurface,
  tsdownConfigSurface,
  typeScriptConfigSurface,
} from './helpers'

const runtimeCapabilityIds = [
  'minimal-node-package',
  'react-app',
  'vue-app',
  'effect-package',
  'node-backend',
  'library',
  'cli-tool',
] as const satisfies readonly CapabilityId[]

function runtimeConflicts(capability: typeof runtimeCapabilityIds[number]) {
  return runtimeCapabilityIds.filter(candidate => candidate !== capability)
}

function effectPackageSource(packageName: string, hasProvider: boolean) {
  if (!hasProvider) {
    return 'export {}\n'
  }

  return `import { NodeRuntime } from '@effect/platform-node'
import { Console, Effect } from 'effect'

const program = Effect.gen(function* () {
  yield* Console.log(${JSON.stringify(`${packageName} ready`)})
})

NodeRuntime.runMain(program)
`
}

function effectPackageBuildScript(hasProvider: boolean) {
  return hasProvider
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
}): PackageManifestEntries {
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

export const packageRuntimeCapabilityDefinitions: readonly PackageCapabilityDefinition[] = [
  {
    id: 'minimal-node-package',
    scope: 'package',
    runtime: true,
    requirements: [],
    conflicts: runtimeConflicts('minimal-node-package'),
    logicalSurfaces: context => [
      sourceSurface(
        context.pkg.path === '.' ? 'root' : context.sourceScope,
        'minimal-node-package',
        'src/index.ts',
        'generated-user-file',
      ),
    ],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:minimal-node-package',
        entries: {
          name: context.packageName,
          type: 'module',
          version: '0.0.0',
          scripts: {
            build: 'tsc --noEmit',
          },
        },
      },
      {
        kind: 'generatedUserFile',
        surfaceId: context.pkg.path === '.'
          ? 'source:root/src/index.ts'
          : `source:${context.pkg.path}/src/index.ts`,
        owner: 'capability:minimal-node-package',
        path: context.scopedPath('src/index.ts'),
        operationId: 'write-root-source',
        operationOwner: 'capability:minimal-node-package',
        content: 'export {}\n',
      },
    ],
  },
  {
    id: 'effect-package',
    scope: 'package',
    runtime: true,
    requirements: [],
    conflicts: runtimeConflicts('effect-package'),
    logicalSurfaces: context => [
      sourceSurface(
        context.pkg.path === '.' ? 'root' : context.sourceScope,
        'effect-package',
        'src/index.ts',
        'generated-user-file',
      ),
      context.pkg.path === '.'
        ? {
            id: 'tsconfig:root',
            materializer: 'generated-user-file',
            owner: 'capability:effect-package',
          }
        : {
            id: `tsconfig:${context.packageManifestScope}`,
            materializer: 'generated-user-file',
            owner: 'capability:effect-package',
          },
    ],
    contribute: (context) => {
      const hasProvider = hasEffectHarnessProvider(context.graph)

      return [
        {
          kind: 'packageManifest',
          surfaceId: context.packageManifestSurfaceId,
          owner: 'capability:effect-package',
          entries: {
            name: context.packageName,
            type: 'module',
            version: '0.0.0',
            scripts: {
              build: effectPackageBuildScript(hasProvider),
            },
            devDependencies: {
              '@types/node': 'catalog:',
              'typescript': 'catalog:',
            },
          },
        },
        {
          kind: 'generatedUserFile',
          surfaceId: context.pkg.path === '.'
            ? 'source:root/src/index.ts'
            : `source:${context.pkg.path}/src/index.ts`,
          owner: 'capability:effect-package',
          path: context.scopedPath('src/index.ts'),
          operationId: 'write-root-source',
          operationOwner: 'capability:effect-package',
          content: effectPackageSource(context.packageName, hasProvider),
        },
        {
          kind: 'generatedUserFile',
          surfaceId: context.pkg.path === '.'
            ? 'tsconfig:root'
            : `tsconfig:${context.pkg.path}`,
          owner: 'capability:effect-package',
          path: context.scopedPath('tsconfig.json'),
          operationId: 'write-tsconfig',
          operationOwner: 'capability:effect-package',
          content: effectPackageTsconfig,
        },
      ]
    },
  },
  {
    id: 'node-backend',
    scope: 'package',
    runtime: true,
    requirements: [],
    conflicts: runtimeConflicts('node-backend'),
    logicalSurfaces: context => [
      sourceSurface(context.pkg.path === '.' ? 'root' : context.sourceScope, 'node-backend', 'src/index.ts', 'node-backend-source'),
      typeScriptConfigSurface(context.packageManifestScope),
      tsdownConfigSurface(context.packageManifestScope),
    ],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:node-backend',
        entries: distPackageManifestEntries(context.packageName, { startScript: true }),
      },
      {
        kind: 'generatedUserFile',
        surfaceId: context.pkg.path === '.'
          ? 'source:node-backend/src/index.ts'
          : `source:${context.pkg.path}/src/index.ts`,
        owner: 'capability:node-backend',
        path: context.scopedPath('src/index.ts'),
        operationId: 'write-node-backend-source',
        operationOwner: 'materializer:node-backend-source',
        content: nodeBackendSource(context.packageName),
      },
      {
        kind: 'typescriptConfig',
        surfaceId: context.scopedTypeScriptConfigSurfaceId,
        owner: 'capability:node-backend',
        value: typeScriptPackageTsconfig({ nodeTypes: true }),
      },
      {
        kind: 'tsdownConfig',
        surfaceId: context.scopedTsdownConfigSurfaceId,
        owner: 'capability:node-backend',
      },
    ],
  },
  {
    id: 'library',
    scope: 'package',
    runtime: true,
    requirements: [],
    conflicts: runtimeConflicts('library'),
    logicalSurfaces: context => [
      sourceSurface(context.pkg.path === '.' ? 'root' : context.sourceScope, 'library', 'src/index.ts', 'library-source'),
      typeScriptConfigSurface(context.packageManifestScope),
      tsdownConfigSurface(context.packageManifestScope),
    ],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:library',
        entries: distPackageManifestEntries(context.packageName, { startScript: false }),
      },
      {
        kind: 'generatedUserFile',
        surfaceId: context.pkg.path === '.'
          ? 'source:library/src/index.ts'
          : `source:${context.pkg.path}/src/index.ts`,
        owner: 'capability:library',
        path: context.scopedPath('src/index.ts'),
        operationId: 'write-library-source',
        operationOwner: 'materializer:library-source',
        content: librarySource(context.packageName),
      },
      {
        kind: 'typescriptConfig',
        surfaceId: context.scopedTypeScriptConfigSurfaceId,
        owner: 'capability:library',
        value: typeScriptPackageTsconfig({ nodeTypes: false }),
      },
      {
        kind: 'tsdownConfig',
        surfaceId: context.scopedTsdownConfigSurfaceId,
        owner: 'capability:library',
      },
    ],
  },
  {
    id: 'cli-tool',
    scope: 'package',
    runtime: true,
    requirements: [],
    conflicts: runtimeConflicts('cli-tool'),
    logicalSurfaces: context => [
      sourceSurface(context.pkg.path === '.' ? 'root' : context.sourceScope, 'cli-tool', 'src/index.ts', 'cli-tool-source'),
      sourceSurface(context.pkg.path === '.' ? 'root' : context.sourceScope, 'cli-tool', 'scripts/ensure-shebang.mjs', 'cli-tool-support'),
      typeScriptConfigSurface(context.packageManifestScope),
      tsdownConfigSurface(context.packageManifestScope),
    ],
    contribute: context => [
      {
        kind: 'packageManifest',
        surfaceId: context.packageManifestSurfaceId,
        owner: 'capability:cli-tool',
        entries: distPackageManifestEntries(context.packageName, {
          startScript: false,
          binName: context.packageName,
          buildSuffix: ' && node scripts/ensure-shebang.mjs',
          smokeBin: 'pnpm build && ./dist/index.js --help',
        }),
      },
      {
        kind: 'generatedUserFile',
        surfaceId: context.pkg.path === '.'
          ? 'source:cli-tool/src/index.ts'
          : `source:${context.pkg.path}/src/index.ts`,
        owner: 'capability:cli-tool',
        path: context.scopedPath('src/index.ts'),
        operationId: 'write-cli-tool-source',
        operationOwner: 'materializer:cli-tool-source',
        content: cliToolSource(context.packageName),
      },
      {
        kind: 'generatedUserFile',
        surfaceId: context.pkg.path === '.'
          ? 'cli-tool-support:scripts/ensure-shebang.mjs'
          : `source:${context.pkg.path}/scripts/ensure-shebang.mjs`,
        owner: 'capability:cli-tool',
        path: context.scopedPath('scripts/ensure-shebang.mjs'),
        operationId: 'write-cli-tool-ensure-shebang',
        operationOwner: 'materializer:cli-tool-support',
        content: cliEnsureShebangScript,
      },
      {
        kind: 'typescriptConfig',
        surfaceId: context.scopedTypeScriptConfigSurfaceId,
        owner: 'capability:cli-tool',
        value: typeScriptPackageTsconfig({ nodeTypes: true }),
      },
      {
        kind: 'tsdownConfig',
        surfaceId: context.scopedTsdownConfigSurfaceId,
        owner: 'capability:cli-tool',
      },
    ],
  },
]
