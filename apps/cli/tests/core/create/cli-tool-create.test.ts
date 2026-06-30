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

const cliToolSpec = {
  topology: 'single-package',
  package: {
    id: 'cli',
    name: makePackageName('cli-tool-fixture'),
    capabilities: ['cli-tool'],
  },
  rootCapabilities: ['package-manager:pnpm'],
  providers: [],
  overrides: {},
} as const satisfies CreateSpec

async function makeTempProjectDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'prelude-cli-tool-'))
}

async function readJson<T = unknown>(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
}

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
            name: makeProjectName('ignored-cli-tool-target'),
            noInput: true,
          },
          isInteractive: false,
        }),
      ),
    ),
  )
}

describe('cli tool package creation', () => {
  it('creates a TypeScript ESM CLI package from the public direct-spec entrypoint', async () => {
    const targetDir = await makeTempProjectDir()
    const result = await Effect.runPromise(createFromPublicRoute(cliToolSpec, targetDir))

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
        id: 'write-cli-tool-source',
        owner: 'materializer:cli-tool-source',
        path: 'src/index.ts',
        authority: 'none',
      },
      {
        id: 'write-cli-tool-ensure-shebang',
        owner: 'materializer:cli-tool-support',
        path: 'scripts/ensure-shebang.mjs',
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

    const packageJson = await readJson<{
      name: string
      type: string
      version: string
      packageManager: string
      main: string
      types: string
      exports: { '.': { import: string, types: string } }
      files: readonly string[]
      bin: Record<string, string>
      scripts: Record<string, string>
      devDependencies: Record<string, string>
    }>(path.join(targetDir, 'package.json'))

    assert.deepStrictEqual(packageJson, {
      name: 'cli-tool-fixture',
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
      bin: {
        'cli-tool-fixture': 'dist/index.js',
      },
      scripts: {
        'build': 'tsdown --config tsdown.config.ts && node scripts/ensure-shebang.mjs',
        'typecheck': 'tsc --noEmit --project tsconfig.json',
        'smoke:bin': 'pnpm build && ./dist/index.js --help',
        'prepack': 'pnpm build',
      },
      devDependencies: {
        '@types/node': 'catalog:',
        'tsdown': 'catalog:',
        'typescript': 'catalog:',
      },
    })

    const source = await fs.readFile(path.join(targetDir, 'src/index.ts'), 'utf8')
    assert.match(source, /^#!\/usr\/bin\/env node/u)
    assert.match(source, /const commandName = "cli-tool-fixture"/u)
    assert.match(source, /export function main/u)
    assert.match(source, /Usage: cli-tool-fixture/u)

    const ensureShebang = await fs.readFile(path.join(targetDir, 'scripts/ensure-shebang.mjs'), 'utf8')
    assert.match(ensureShebang, /dist\/index\.js/u)
    assert.match(ensureShebang, /chmod\(binPath, 0o755\)/u)

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

    const manifest = await readJson<{
      resolvedGraph: { packageCapabilities: unknown, verification: unknown }
      maintainProviders: readonly unknown[]
      generatedUserSurfaces: readonly { path: string, creator: string, authority: string }[]
      verificationRecords: readonly unknown[]
    }>(path.join(targetDir, '.prelude/manifest.json'))

    assert.deepStrictEqual(manifest.resolvedGraph.packageCapabilities, {
      cli: ['cli-tool'],
    })
    assert.deepStrictEqual(manifest.resolvedGraph.verification, ['cli-tool-files-present'])
    assert.deepStrictEqual(manifest.maintainProviders, [])
    assert.deepStrictEqual(
      manifest.generatedUserSurfaces.map(surface => ({
        path: surface.path,
        creator: surface.creator,
        authority: surface.authority,
      })),
      [
        { path: 'package.json', creator: 'materializer:package-json', authority: 'none' },
        { path: 'src/index.ts', creator: 'materializer:cli-tool-source', authority: 'none' },
        { path: 'scripts/ensure-shebang.mjs', creator: 'materializer:cli-tool-support', authority: 'none' },
        { path: 'tsconfig.json', creator: 'materializer:typescript-config', authority: 'none' },
        { path: 'tsdown.config.ts', creator: 'materializer:tsdown-config', authority: 'none' },
      ],
    )
    assert.deepStrictEqual(manifest.verificationRecords, [
      {
        id: 'cli-tool-files-present',
        status: 'passed',
        checkedPaths: ['package.json', 'src/index.ts', 'scripts/ensure-shebang.mjs', 'tsconfig.json', 'tsdown.config.ts'],
      },
    ])
  })
})
