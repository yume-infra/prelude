import { fileURLToPath, pathToFileURL } from 'node:url'

import { NodeServices } from '@effect/platform-node'
import { describe, expect, layer } from '@effect/vitest'
import { Effect, FileSystem, Path } from 'effect'

import { validModulePlanFixture } from '../src/conformance.js'

type ContractModule = typeof import('../src/index.js')

const packageRoot = fileURLToPath(new URL('..', import.meta.url))

function installContractCopy(nodeModules: string, name: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const copyRoot = path.join(nodeModules, name)
    yield* fs.makeDirectory(copyRoot, { recursive: true })
    yield* fs.copy(path.join(packageRoot, 'dist'), path.join(copyRoot, 'dist'), { overwrite: true })
    yield* fs.copyFile(path.join(packageRoot, 'package.json'), path.join(copyRoot, 'package.json'))
    return pathToFileURL(path.join(copyRoot, 'dist/index.js'))
  })
}

describe('duplicate installed package copies', () => {
  layer(NodeServices.layer)((it) => {
    it.effect('passes plain encoded data from one physical Contract copy to another', () =>
      Effect.scoped(Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
        const fixtureRoot = yield* fs.makeTempDirectoryScoped({ directory: packageRoot, prefix: '.contract-copies-' })
        const nodeModules = path.join(fixtureRoot, 'node_modules')
        const copyAUrl = yield* installContractCopy(nodeModules, 'contract-copy-a')
        const copyBUrl = yield* installContractCopy(nodeModules, 'contract-copy-b')
        const copyA = yield* Effect.promise(() => import(copyAUrl.href) as Promise<ContractModule>)
        const copyB = yield* Effect.promise(() => import(copyBUrl.href) as Promise<ContractModule>)

        const decodedByA = copyA.decodeModulePlan(validModulePlanFixture)
        const encodedByA = copyA.encodeModulePlan(decodedByA)
        const transferredValue: unknown = structuredClone(encodedByA)
        const decodedByB = copyB.decodeModulePlan(transferredValue)

        expect(copyB.encodeModulePlan(decodedByB)).toEqual(encodedByA)
        expect(Object.getPrototypeOf(decodedByB)).toBe(Object.prototype)
      })))
  })
})
