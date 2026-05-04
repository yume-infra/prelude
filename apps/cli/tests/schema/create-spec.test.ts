import { Effect, Exit } from 'effect'
import { describe, expect, it } from 'vitest'
import { makePackageName } from '../../src/brand/package-name'
import {
  decodeCreateSpec,
  decodeGenerationPackageSpec,
  makePackageId,
  projectConfigToCreateSpec,
} from '../../src/schema/create-spec'
import { decodeProjectConfig } from '../../src/schema/project-config'
import { reactProjectConfig, vueProjectConfig } from '../support/fixtures'

const frontendPackageInput = {
  id: 'web',
  name: 'web',
  kind: 'frontend-app',
  frontend: {
    framework: 'react',
    buildTool: 'vite',
    cssPreprocessor: 'less',
    cssFramework: 'tailwind',
  },
}

describe('create spec schema contract', () => {
  it('infers browser runtime for frontend app packages', async () => {
    const decoded = await Effect.runPromise(decodeGenerationPackageSpec(frontendPackageInput))

    expect(decoded).toEqual({
      id: makePackageId('web'),
      name: makePackageName('web'),
      kind: 'frontend-app',
      runtime: 'browser',
      internalDependencies: [],
      frontend: {
        framework: 'react',
        buildTool: 'vite',
        cssPreprocessor: 'less',
        cssFramework: 'tailwind',
      },
    })
  })

  it('rejects frontend packages with node runtime', async () => {
    const exit = await Effect.runPromiseExit(
      decodeGenerationPackageSpec({
        ...frontendPackageInput,
        runtime: 'node',
      }),
    )

    expect(Exit.isFailure(exit)).toBe(true)
  })

  it('infers node runtime for backend, worker, and cli package kinds', async () => {
    const backend = await Effect.runPromise(decodeGenerationPackageSpec({
      id: 'api',
      name: 'api',
      kind: 'backend-app',
      backend: {
        framework: 'none',
      },
    }))
    const worker = await Effect.runPromise(decodeGenerationPackageSpec({
      id: 'jobs',
      name: 'jobs',
      kind: 'worker-app',
      worker: {
        toolkit: 'none',
      },
    }))
    const cli = await Effect.runPromise(decodeGenerationPackageSpec({
      id: 'tooling',
      name: 'tooling',
      kind: 'cli-tool',
      cli: {
        toolkit: 'none',
      },
    }))

    expect(backend.runtime).toBe('node')
    expect(worker.runtime).toBe('node')
    expect(cli.runtime).toBe('node')
  })

  it('allows neutral or node runtime for library packages and rejects browser runtime', async () => {
    const neutralLibrary = await Effect.runPromise(decodeGenerationPackageSpec({
      id: 'shared',
      name: 'shared',
      kind: 'library-package',
      library: {
        toolkit: 'none',
      },
    }))
    const nodeLibrary = await Effect.runPromise(decodeGenerationPackageSpec({
      id: 'node-shared',
      name: 'node-shared',
      kind: 'library-package',
      runtime: 'node',
      library: {
        toolkit: 'none',
      },
    }))
    const browserLibraryExit = await Effect.runPromiseExit(decodeGenerationPackageSpec({
      id: 'browser-shared',
      name: 'browser-shared',
      kind: 'library-package',
      runtime: 'browser',
      library: {
        toolkit: 'none',
      },
    }))

    expect(neutralLibrary.runtime).toBe('neutral')
    expect(nodeLibrary.runtime).toBe('node')
    expect(Exit.isFailure(browserLibraryExit)).toBe(true)
  })

  it('keeps workspace internal dependency links addressable by package id or package name', async () => {
    const decoded = await Effect.runPromise(decodeCreateSpec({
      shape: 'workspace',
      packages: [
        frontendPackageInput,
        {
          id: 'shared',
          name: '@demo/shared',
          kind: 'library-package',
          library: {
            toolkit: 'none',
          },
          internalDependencies: [
            {
              target: {
                by: 'id',
                id: 'web',
              },
            },
            {
              target: {
                by: 'name',
                name: 'web',
              },
              alias: '@demo/web',
            },
          ],
        },
      ],
    }))

    expect(decoded.shape).toBe('workspace')
    if (decoded.shape === 'workspace') {
      const sharedPackage = decoded.packages[1]
      expect(sharedPackage?.internalDependencies).toEqual([
        {
          target: {
            by: 'id',
            id: makePackageId('web'),
          },
        },
        {
          target: {
            by: 'name',
            name: makePackageName('web'),
          },
          alias: makePackageName('@demo/web'),
        },
      ])
    }
  })

  it.each([
    ['React', reactProjectConfig],
    ['Vue', vueProjectConfig],
  ])('adapts existing %s project config into a standalone frontend create spec', async (_label, fixture) => {
    const decodedProjectConfig = await Effect.runPromise(decodeProjectConfig(fixture))
    const createSpec = projectConfigToCreateSpec(decodedProjectConfig)

    expect(decodedProjectConfig).toEqual(fixture)
    expect(createSpec).toEqual({
      shape: 'standalone',
      package: {
        id: makePackageId(fixture.name),
        name: makePackageName(fixture.name),
        kind: 'frontend-app',
        runtime: 'browser',
        internalDependencies: [],
        frontend: {
          framework: fixture.type,
          buildTool: fixture.buildTool,
          cssPreprocessor: fixture.cssPreprocessor,
          cssFramework: fixture.cssFramework,
        },
      },
    })
  })
})
