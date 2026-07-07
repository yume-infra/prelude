import type { CreateSpec } from '@/core/create'
import { NodeServices } from '@effect/platform-node'
import { assert, describe, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { makePackageName } from '@/brand/package-name'
import { makeProjectName } from '@/brand/project-name'
import { makeTargetDir } from '@/brand/target-dir'
import { CliContext } from '@/core/cli-context'
import { runCreateRoute } from '@/core/create-route'
import { formatCanonicalCreateSpecJson } from '@/core/create-spec-input'
import { FsLive } from '@/core/services/fs'
import { assertPathDoesNotExist, makeTempProjectDir, pathJoinSync, readFileString, readJson } from '../../support/effect-files'
import { EffectHarnessDiscoveryTestLayer } from '../../support/effect-harness-discovery'

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(EffectHarnessDiscoveryTestLayer),
)

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
    Effect.provideService(CliContext, CliContext.of({
      args: {
        spec: formatCanonicalCreateSpecJson(spec),
        name: makeProjectName('ignored-node-package-target'),
        noInput: true,
      },
      isInteractive: false,
    })),
  )
}

function assertDistPackageContract(targetDir: string, options: {
  readonly name: string
  readonly hasStartScript: boolean
}) {
  return Effect.gen(function* () {
    const packageJson = yield* readJson<{
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
    }>(pathJoinSync(targetDir, 'package.json'))

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
  })
}

describe('node backend and library package creation', () => {
  it.layer(TestLayer)((it) => {
    it.effect('creates the backend package fixture from the public direct-spec entrypoint', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-node-packages-')
      const result = yield* createFromPublicRoute(backendPackageSpec, targetDir)

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

      yield* assertDistPackageContract(targetDir, {
        name: 'node-backend-fixture',
        hasStartScript: true,
      })

      const source = yield* readFileString(pathJoinSync(targetDir, 'src/index.ts'))
      assert.match(source, /import \{ fileURLToPath \} from 'node:url'/u)
      assert.match(source, /export function healthCheck/u)
      assert.match(source, /const serviceName = "node-backend-fixture"/u)
      assert.match(source, /console\.log\(`\$\{check\.service\} ready`\)/u)

      const tsconfig = yield* readJson<Record<string, unknown>>(pathJoinSync(targetDir, 'tsconfig.json'))
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

      const tsdownConfig = yield* readFileString(pathJoinSync(targetDir, 'tsdown.config.ts'))
      assert.match(tsdownConfig, /dts: true/u)
      assert.match(tsdownConfig, /fixedExtension: false/u)

      assert.deepStrictEqual(result.result.resolvedGraph.packageCapabilities, {
        api: ['node-backend'],
      })
      assert.deepStrictEqual(result.result.resolvedGraph.verification, ['node-package-files-present'])
      assert.deepStrictEqual(result.result.verification.records, [
        {
          id: 'node-package-files-present',
          status: 'passed',
          checkedPaths: ['package.json', 'src/index.ts', 'tsconfig.json', 'tsdown.config.ts'],
        },
      ])
      yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
    }))

    it.effect('creates the library package fixture from the public direct-spec entrypoint', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-node-packages-')
      const result = yield* createFromPublicRoute(libraryPackageSpec, targetDir)

      if (result.kind !== 'created') {
        assert.fail(`expected create route to create, got ${result.kind}`)
      }

      yield* assertDistPackageContract(targetDir, {
        name: 'library-package-fixture',
        hasStartScript: false,
      })

      const source = yield* readFileString(pathJoinSync(targetDir, 'src/index.ts'))
      assert.match(source, /export function createGreeting/u)
      assert.match(source, /library-package-fixture/u)

      assert.deepStrictEqual(result.result.resolvedGraph.packageCapabilities, {
        lib: ['library'],
      })
      assert.deepStrictEqual(result.result.resolvedGraph.verification, ['node-package-files-present'])
      assert.deepStrictEqual(result.result.verification.records, [
        {
          id: 'node-package-files-present',
          status: 'passed',
          checkedPaths: ['package.json', 'src/index.ts', 'tsconfig.json', 'tsdown.config.ts'],
        },
      ])
      yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
    }))
  })
})
