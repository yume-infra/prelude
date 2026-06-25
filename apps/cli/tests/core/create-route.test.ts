import assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { NodeContext, NodeFileSystem } from '@effect/platform-node'
import { Effect, Layer } from 'effect'
import { beforeEach, describe, it, vi } from 'vitest'
import { makeProjectName } from '@/brand/project-name'
import { makeTargetDir } from '@/brand/target-dir'
import { CliContextLive } from '@/core/cli-context'
import { runCreateRoute } from '@/core/create-route'
import { loadCreateSpecFromInput } from '@/core/create-spec-input'
import { FsLive } from '@/core/services/fs'

const prompts = vi.hoisted(() => ({
  isCancel: vi.fn(),
  multiselect: vi.fn(),
  select: vi.fn(),
  text: vi.fn(),
}))

vi.mock('@clack/prompts', () => ({
  isCancel: prompts.isCancel,
  multiselect: prompts.multiselect,
  select: prompts.select,
  text: prompts.text,
}))

const TestLayer = FsLive.pipe(
  Layer.provideMerge(NodeFileSystem.layer),
  Layer.provideMerge(NodeContext.layer),
)

async function makeTempProjectDir() {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'prelude-create-route-'))
}

async function readJson<T = unknown>(filePath: string) {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
}

describe('canonical create CLI route', () => {
  beforeEach(() => {
    prompts.isCancel.mockReset()
    prompts.multiselect.mockReset()
    prompts.select.mockReset()
    prompts.text.mockReset()
    prompts.isCancel.mockReturnValue(false)
  })

  it('creates from direct canonical --spec through the CreateSpec pipeline', async () => {
    const targetDir = await makeTempProjectDir()
    const spec = {
      topology: 'single-package',
      package: {
        id: 'app',
        name: 'direct-spec-app',
        capabilities: ['minimal-node-package'],
      },
      rootCapabilities: [],
      providers: [],
      overrides: {},
    }

    await Effect.runPromise(
      runCreateRoute({
        preludeVersion: '0.0.0-test',
        targetDir: makeTargetDir(targetDir),
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            TestLayer,
            CliContextLive({
              args: {
                spec: JSON.stringify(spec),
                name: makeProjectName('ignored-target-name'),
                noInput: true,
              },
              isInteractive: false,
            }),
          ),
        ),
      ),
    )

    const manifest = await readJson<{
      createSpec: unknown
      resolvedGraph: { packageCapabilities: unknown }
    }>(path.join(targetDir, '.prelude/manifest.json'))

    assert.deepEqual(manifest.createSpec, spec)
    assert.deepEqual(manifest.resolvedGraph.packageCapabilities, {
      app: ['minimal-node-package'],
    })
  })

  it('uses the prompted project name as the target directory for guided creation', async () => {
    const originalCwd = process.cwd()
    const parentDir = await makeTempProjectDir()
    prompts.text.mockResolvedValue('guided-spec-app')
    prompts.select.mockResolvedValue('single-package')
    prompts.multiselect
      .mockResolvedValueOnce(['minimal-node-package'])
      .mockResolvedValueOnce([])

    try {
      process.chdir(parentDir)

      await Effect.runPromise(
        runCreateRoute({
          preludeVersion: '0.0.0-test',
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              TestLayer,
              CliContextLive({
                args: {},
                isInteractive: true,
              }),
            ),
          ),
        ),
      )

      const manifest = await readJson<{
        createSpec: {
          package: { name: string }
        }
      }>(path.join(parentDir, 'guided-spec-app/.prelude/manifest.json'))

      assert.equal(manifest.createSpec.package.name, 'guided-spec-app')
    }
    finally {
      process.chdir(originalCwd)
    }
  })

  it('prints the canonical --spec without creating files', async () => {
    const targetDir = await makeTempProjectDir()
    const spec = {
      topology: 'single-package',
      package: {
        id: 'app',
        name: 'printed-spec-app',
        capabilities: ['minimal-node-package'],
      },
      rootCapabilities: [],
      providers: [],
      overrides: {},
    }
    const lines: string[] = []
    const originalLog = console.log

    try {
      console.log = (line?: unknown) => {
        lines.push(String(line))
      }

      const result = await Effect.runPromise(
        runCreateRoute({
          preludeVersion: '0.0.0-test',
          targetDir: makeTargetDir(targetDir),
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              TestLayer,
              CliContextLive({
                args: {
                  spec: JSON.stringify(spec),
                  printSpec: true,
                  noInput: true,
                },
                isInteractive: false,
              }),
            ),
          ),
        ),
      )

      assert.equal(result.kind, 'printed-spec')
      assert.deepEqual(JSON.parse(lines.join('\n')), spec)
      await assert.rejects(fs.access(path.join(targetDir, '.prelude/manifest.json')))
    }
    finally {
      console.log = originalLog
    }
  })

  it('rejects legacy structured spec shapes instead of adapting them', async () => {
    const result = await Effect.runPromise(
      Effect.either(loadCreateSpecFromInput(JSON.stringify({
        shape: 'standalone',
        package: {
          id: 'app',
          name: 'old-spec-app',
          kind: 'backend-app',
        },
      }))),
    )

    assert.equal(result._tag, 'Left')
    if (result._tag === 'Left') {
      assert.equal(result.left._tag, 'SchemaContractError')
      assert.match(result.left.message, /CanonicalCreateSpec/)
    }
  })

  it('rejects preset input as a removed active API', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        runCreateRoute({
          preludeVersion: '0.0.0-test',
          targetDir: makeTargetDir(await makeTempProjectDir()),
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              TestLayer,
              CliContextLive({
                args: {
                  preset: 'react-full',
                  name: makeProjectName('removed-preset-app'),
                },
                isInteractive: false,
              }),
            ),
          ),
        ),
      ),
    )

    assert.equal(result._tag, 'Left')
    if (result._tag === 'Left') {
      assert.equal(result.left._tag, 'SchemaContractError')
      assert.match(result.left.message, /--preset has been removed/)
    }
  })

  it('rejects dry-run instead of invoking a legacy preview path', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        runCreateRoute({
          preludeVersion: '0.0.0-test',
          targetDir: makeTargetDir(await makeTempProjectDir()),
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              TestLayer,
              CliContextLive({
                args: {
                  spec: JSON.stringify({
                    topology: 'single-package',
                    package: {
                      id: 'app',
                      name: 'dry-run-app',
                      capabilities: ['minimal-node-package'],
                    },
                    rootCapabilities: [],
                    providers: [],
                    overrides: {},
                  }),
                  dryRun: true,
                  noInput: true,
                },
                isInteractive: false,
              }),
            ),
          ),
        ),
      ),
    )

    assert.equal(result._tag, 'Left')
    if (result._tag === 'Left') {
      assert.equal(result.left._tag, 'SchemaContractError')
      assert.match(result.left.message, /--dry-run has been removed/)
    }
  })
})
