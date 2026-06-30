import type { CreateSpec } from '@/core/create'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { makePackageName } from '@/brand/package-name'
import { makeProjectName } from '@/brand/project-name'
import { makeTargetDir } from '@/brand/target-dir'
import { CliContextLive } from '@/core/cli-context'
import { runCreateRoute } from '@/core/create-route'
import { formatCanonicalCreateSpecJson } from '@/core/create-spec-input'
import { FsLive } from '@/core/services/fs'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
)

async function makeTempProjectDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'prelude-node-packages-'))
}

async function readJson<T = unknown>(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
}

const backendPackageSpec = {
  topology: 'single-package',
  package: {
    id: 'api',
    name: makePackageName('node-backend-fixture'),
    capabilities: ['node-backend'],
  },
  rootCapabilities: ['package-manager:pnpm'],
  providers: [],
  overrides: {},
} as const satisfies CreateSpec

const libraryPackageSpec = {
  topology: 'single-package',
  package: {
    id: 'lib',
    name: makePackageName('library-package-fixture'),
    capabilities: ['library'],
  },
  rootCapabilities: ['package-manager:pnpm'],
  providers: [],
  overrides: {},
} as const satisfies CreateSpec

function createFromPublicRoute(spec: CreateSpec, targetDir: string) {
  return runCreateRoute({
    preludeVersion: '0.0.0-test',
    targetDir: makeTargetDir(targetDir),
  }).pipe(
    Effect.provide(
      Layer.mergeAll(
        TestLayer,
        CliContextLive({
          args: {
            spec: formatCanonicalCreateSpecJson(spec),
            name: makeProjectName('ignored-node-package-target'),
            noInput: true,
          },
          isInteractive: false,
        }),
      ),
    ),
  )
}

async function assertDistPackageContract(targetDir: string, options: {
  readonly name: string
  readonly hasStartScript: boolean
}) {
  const packageJson = await readJson<{
    name: string
    type: string
    version: string
    packageManager: string
    main: string
    types: string
    exports: { '.': { import: string, types: string } }
    files: readonly string[]
    scripts: Record<string, string>
    devDependencies: Record<string, string>
  }>(path.join(targetDir, 'package.json'))

  assert.deepStrictEqual(packageJson, {
    name: options.name,
    type: 'module',
    version: '0.0.0',
    packageManager: 'pnpm@10.33.4',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    exports: {
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts',
      },
    },
    files: ['dist'],
    scripts: {
      build: 'tsdown --config tsdown.config.ts',
      typecheck: 'tsc --noEmit --project tsconfig.json',
      ...(options.hasStartScript ? { start: 'node dist/index.js' } : {}),
      prepack: 'pnpm build',
    },
    devDependencies: {
      ...(options.hasStartScript ? { '@types/node': 'catalog:' } : {}),
      tsdown: 'catalog:',
      typescript: 'catalog:',
    },
  })
}

describe('node backend and library package creation', () => {
  it('creates the backend package fixture from the public direct-spec entrypoint', async () => {
    const targetDir = await makeTempProjectDir()
    const result = await Effect.runPromise(createFromPublicRoute(backendPackageSpec, targetDir))

    if (result.kind !== 'created') {
      assert.fail(`expected create route to create, got ${result.kind}`)
    }

    assert.deepStrictEqual(result.result.writePlan.operations.map(operation => ({
      id: operation.id,
      owner: operation.owner,
      path: operation.path,
      authority: operation.authority,
    })), [
      {
        id: 'write-package-json',
        owner: 'materializer:package-json',
        path: 'package.json',
        authority: 'none',
      },
      {
        id: 'write-node-backend-source',
        owner: 'materializer:node-backend-source',
        path: 'src/index.ts',
        authority: 'none',
      },
      {
        id: 'write-tsconfig',
        owner: 'materializer:typescript-config',
        path: 'tsconfig.json',
        authority: 'none',
      },
      {
        id: 'write-tsdown-config',
        owner: 'materializer:tsdown-config',
        path: 'tsdown.config.ts',
        authority: 'none',
      },
    ])

    await assertDistPackageContract(targetDir, {
      name: 'node-backend-fixture',
      hasStartScript: true,
    })

    const source = await fs.readFile(path.join(targetDir, 'src/index.ts'), 'utf8')
    assert.match(source, /import \{ fileURLToPath \} from 'node:url'/u)
    assert.match(source, /export function healthCheck/u)
    assert.match(source, /const serviceName = "node-backend-fixture"/u)
    assert.match(source, /console\.log\(`\$\{check\.service\} ready`\)/u)

    const tsconfig = await readJson<Record<string, unknown>>(path.join(targetDir, 'tsconfig.json'))
    assert.deepStrictEqual(tsconfig, {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022'],
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        isolatedModules: true,
        verbatimModuleSyntax: true,
        skipLibCheck: true,
        types: ['node'],
      },
      include: ['src/**/*.ts'],
    })

    const tsdownConfig = await fs.readFile(path.join(targetDir, 'tsdown.config.ts'), 'utf8')
    assert.match(tsdownConfig, /dts: true/u)
    assert.match(tsdownConfig, /fixedExtension: false/u)

    const manifest = await readJson<{
      resolvedGraph: { packageCapabilities: unknown, logicalSurfaces: unknown, verification: unknown }
      maintainProviders: readonly unknown[]
      generatedUserSurfaces: readonly { path: string, creator: string, authority: string }[]
      verificationRecords: readonly unknown[]
    }>(path.join(targetDir, '.prelude/manifest.json'))

    assert.deepStrictEqual(manifest.resolvedGraph.packageCapabilities, {
      api: ['node-backend'],
    })
    assert.deepStrictEqual(manifest.resolvedGraph.verification, ['node-package-files-present'])
    assert.deepStrictEqual(manifest.maintainProviders, [])
    assert.deepStrictEqual(
      manifest.generatedUserSurfaces.map(surface => ({
        path: surface.path,
        creator: surface.creator,
        authority: surface.authority,
      })),
      [
        { path: 'package.json', creator: 'materializer:package-json', authority: 'none' },
        { path: 'src/index.ts', creator: 'materializer:node-backend-source', authority: 'none' },
        { path: 'tsconfig.json', creator: 'materializer:typescript-config', authority: 'none' },
        { path: 'tsdown.config.ts', creator: 'materializer:tsdown-config', authority: 'none' },
      ],
    )
    assert.deepStrictEqual(manifest.verificationRecords, [
      {
        id: 'node-package-files-present',
        status: 'passed',
        checkedPaths: ['package.json', 'src/index.ts', 'tsconfig.json', 'tsdown.config.ts'],
      },
    ])
  })

  it('creates the library package fixture from the public direct-spec entrypoint', async () => {
    const targetDir = await makeTempProjectDir()
    const result = await Effect.runPromise(createFromPublicRoute(libraryPackageSpec, targetDir))

    if (result.kind !== 'created') {
      assert.fail(`expected create route to create, got ${result.kind}`)
    }

    await assertDistPackageContract(targetDir, {
      name: 'library-package-fixture',
      hasStartScript: false,
    })

    const source = await fs.readFile(path.join(targetDir, 'src/index.ts'), 'utf8')
    assert.match(source, /export function createGreeting/u)
    assert.match(source, /library-package-fixture/u)

    const manifest = await readJson<{
      resolvedGraph: { packageCapabilities: unknown, verification: unknown }
      maintainProviders: readonly unknown[]
      generatedUserSurfaces: readonly { path: string, authority: string }[]
      verificationRecords: readonly unknown[]
    }>(path.join(targetDir, '.prelude/manifest.json'))

    assert.deepStrictEqual(manifest.resolvedGraph.packageCapabilities, {
      lib: ['library'],
    })
    assert.deepStrictEqual(manifest.resolvedGraph.verification, ['node-package-files-present'])
    assert.deepStrictEqual(manifest.maintainProviders, [])
    assert.deepStrictEqual(
      manifest.generatedUserSurfaces.map(surface => ({ path: surface.path, authority: surface.authority })),
      [
        { path: 'package.json', authority: 'none' },
        { path: 'src/index.ts', authority: 'none' },
        { path: 'tsconfig.json', authority: 'none' },
        { path: 'tsdown.config.ts', authority: 'none' },
      ],
    )
    assert.deepStrictEqual(manifest.verificationRecords, [
      {
        id: 'node-package-files-present',
        status: 'passed',
        checkedPaths: ['package.json', 'src/index.ts', 'tsconfig.json', 'tsdown.config.ts'],
      },
    ])
  })
})
