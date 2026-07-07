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

function createFromPublicRoute(spec: CreateSpec, targetDir: string) {
  return runCreateRoute({
    preludeVersion: '0.0.0-test',
    targetDir: makeTargetDir(targetDir),
  }).pipe(
    Effect.provideService(CliContext, CliContext.of({
      args: {
        spec: formatCanonicalCreateSpecJson(spec),
        name: makeProjectName('ignored-cli-tool-target'),
        noInput: true,
      },
      isInteractive: false,
    })),
  )
}

describe('cli tool package creation', () => {
  it.layer(TestLayer)((it) => {
    it.effect('creates a TypeScript ESM CLI package from the public direct-spec entrypoint', () => Effect.gen(function* () {
      const targetDir = yield* makeTempProjectDir('prelude-cli-tool-')
      const result = yield* createFromPublicRoute(cliToolSpec, targetDir)

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

      const packageJson = yield* readJson<{
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
      }>(pathJoinSync(targetDir, 'package.json'))

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

      const source = yield* readFileString(pathJoinSync(targetDir, 'src/index.ts'))
      assert.match(source, /^#!\/usr\/bin\/env node/u)
      assert.match(source, /const commandName = "cli-tool-fixture"/u)
      assert.match(source, /export function main/u)
      assert.match(source, /Usage: cli-tool-fixture/u)

      const ensureShebang = yield* readFileString(pathJoinSync(targetDir, 'scripts/ensure-shebang.mjs'))
      assert.match(ensureShebang, /dist\/index\.js/u)
      assert.match(ensureShebang, /chmod\(binPath, 0o755\)/u)

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

      assert.deepStrictEqual(result.result.resolvedGraph.packageCapabilities, {
        cli: ['cli-tool'],
      })
      assert.deepStrictEqual(result.result.resolvedGraph.verification, ['cli-tool-files-present'])
      assert.deepStrictEqual(result.result.verification.records, [
        {
          id: 'cli-tool-files-present',
          status: 'passed',
          checkedPaths: ['package.json', 'src/index.ts', 'scripts/ensure-shebang.mjs', 'tsconfig.json', 'tsdown.config.ts'],
        },
      ])
      yield* assertPathDoesNotExist(pathJoinSync(targetDir, '.prelude/manifest.json'))
    }))
  })
})
