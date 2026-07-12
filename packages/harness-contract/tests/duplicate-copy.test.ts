import { copyFile, cp, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { describe, expect, test } from '@effect/vitest'

import { validModulePlanFixture } from '../src/conformance.js'

type ContractModule = typeof import('../src/index.js')

const packageRoot = fileURLToPath(new URL('..', import.meta.url))

async function installContractCopy(nodeModules: string, name: string): Promise<URL> {
  const copyRoot = join(nodeModules, name)
  await mkdir(copyRoot, { recursive: true })
  await cp(join(packageRoot, 'dist'), join(copyRoot, 'dist'), { recursive: true })
  await copyFile(join(packageRoot, 'package.json'), join(copyRoot, 'package.json'))
  return pathToFileURL(join(copyRoot, 'dist/index.js'))
}

describe('duplicate installed package copies', () => {
  test('passes plain encoded data from one physical Contract copy to another', async () => {
    const fixtureRoot = await mkdtemp(join(packageRoot, '.contract-copies-'))

    try {
      const nodeModules = join(fixtureRoot, 'node_modules')
      const copyAUrl = await installContractCopy(nodeModules, 'contract-copy-a')
      const copyBUrl = await installContractCopy(nodeModules, 'contract-copy-b')
      const copyA = await import(copyAUrl.href) as ContractModule
      const copyB = await import(copyBUrl.href) as ContractModule

      const decodedByA = copyA.decodeModulePlan(validModulePlanFixture)
      const encodedByA = copyA.encodeModulePlan(decodedByA)
      const json = JSON.stringify(encodedByA)
      const transferredValue: unknown = JSON.parse(json)
      const decodedByB = copyB.decodeModulePlan(transferredValue)

      expect(copyB.encodeModulePlan(decodedByB)).toEqual(encodedByA)
      expect(Object.getPrototypeOf(decodedByB)).toBe(Object.prototype)
    }
    finally {
      await rm(fixtureRoot, { force: true, recursive: true })
    }
  })
})
