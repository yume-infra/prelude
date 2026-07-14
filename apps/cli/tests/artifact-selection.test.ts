import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'

import { evaluateRequirementSelection, linkedSelectionPath, selectRootArtifact } from '../src/artifact-selection.js'
import { encodeJson } from '../src/json.js'

const manifest = encodeJson({ devDependencies: { '@synthetic/alpha': '1.2.3' } })
const registryLock = `lockfileVersion: '9.0'
importers:
  .:
    devDependencies:
      '@synthetic/alpha':
        specifier: 1.2.3
        version: 1.2.3(peer@2.0.0)
snapshots:
  '@synthetic/alpha@1.2.3(peer@2.0.0)': {}
`
const installedRegistryLock = registryLock.replace('specifier: 1.2.3\n', '')

describe('exact root Artifact selection', () => {
  it.effect('binds a registry selection including peer context to an opaque id', () => Effect.sync(() => {
    const selected = selectRootArtifact({ manifestSource: manifest, lockSource: registryLock, installedLockSource: installedRegistryLock, packageName: '@synthetic/alpha', installedManifestSource: encodeJson({ name: '@synthetic/alpha', version: '1.2.3' }) })
    expect(selected.packageVersion).toBe('1.2.3')
    expect(selected.resolutionId).toMatch(/^[a-f0-9]{64}$/)
    expect(selected.resolutionId).not.toContain('peer')
  }))

  it.effect('rejects stale installed lock peer and patch identities', () => Effect.sync(() => {
    const installed = encodeJson({ name: '@synthetic/alpha', version: '1.2.3' })
    expect(() => selectRootArtifact({ manifestSource: manifest, lockSource: registryLock, installedLockSource: installedRegistryLock.replace('peer@2.0.0', 'peer@3.0.0'), packageName: '@synthetic/alpha', installedManifestSource: installed })).toThrow(/installed lock/i)
    const patched = registryLock.replace('1.2.3(peer@2.0.0)', '1.2.3(patch_hash=abc)').replace('snapshots:\n', 'patchedDependencies:\n  \'@synthetic/alpha@1.2.3\': patches/alpha.patch\nsnapshots:\n')
    expect(() => selectRootArtifact({ manifestSource: manifest, lockSource: patched, installedLockSource: patched.replaceAll('abc', 'def').replace('specifier: 1.2.3\n', ''), packageName: '@synthetic/alpha', installedManifestSource: installed })).toThrow(/installed lock/i)
  }))

  it.effect('rejects dependencies, missing locks, and installed version mismatch', () => Effect.sync(() => {
    expect(() => selectRootArtifact({ manifestSource: encodeJson({ dependencies: { '@synthetic/alpha': '1.2.3' } }), lockSource: registryLock, installedLockSource: installedRegistryLock, packageName: '@synthetic/alpha', installedManifestSource: encodeJson({ name: '@synthetic/alpha', version: '1.2.3' }) })).toThrow(/devDependencies/)
    expect(() => selectRootArtifact({ manifestSource: manifest, lockSource: '', installedLockSource: installedRegistryLock, packageName: '@synthetic/alpha', installedManifestSource: encodeJson({ name: '@synthetic/alpha', version: '1.2.3' }) })).toThrow(/lockfile/)
    expect(() => selectRootArtifact({ manifestSource: manifest, lockSource: registryLock, installedLockSource: installedRegistryLock, packageName: '@synthetic/alpha', installedManifestSource: encodeJson({ name: '@synthetic/alpha', version: '1.2.4' }) })).toThrow(/installed/)
  }))

  it.effect('accepts exact file and workspace lock identities without coercing selectors', () => Effect.sync(() => {
    expect(evaluateRequirementSelection({ range: '^1.0.0', directSpecifier: '^1.0.0', lockSpecifier: '^1.0.0', lockVersion: '1.4.0(peer@2.0.0)', installedVersion: '1.4.0' }).satisfied).toBe(true)
    expect(evaluateRequirementSelection({ range: '^1.0.0', directSpecifier: '^1.0.0', lockSpecifier: '^1.0.0', lockVersion: '1.4.0(peer@2.0.0)', installedVersion: '1.4.1' }).satisfied).toBe(false)
    expect(evaluateRequirementSelection({ range: '^1.0.0', directSpecifier: 'workspace:*', lockVersion: 'link:packages/tool', installedVersion: '1.4.0' }).satisfied).toBe(true)
    expect(evaluateRequirementSelection({ range: '^1.0.0', directSpecifier: 'file:../packs/tool.tgz', lockVersion: 'file:../packs/tool.tgz', installedVersion: '1.3.0' }).satisfied).toBe(true)
    expect(evaluateRequirementSelection({ range: '^2.0.0', directSpecifier: 'file:../packs/tool.tgz', lockVersion: 'file:../packs/tool.tgz', installedVersion: '1.3.0' }).satisfied).toBe(false)
    expect(evaluateRequirementSelection({ packageName: '@typescript/native', installedName: 'typescript', range: 'npm:typescript@7.0.2', directSpecifier: 'npm:typescript@7.0.2', lockSpecifier: 'npm:typescript@7.0.2', lockVersion: 'typescript@7.0.2', installedVersion: '7.0.2' }).satisfied).toBe(true)
    expect(evaluateRequirementSelection({ packageName: 'typescript', installedName: '@typescript/typescript6', range: 'npm:@typescript/typescript6@6.0.2', directSpecifier: 'npm:@typescript/typescript6@6.0.2', lockSpecifier: 'npm:@typescript/typescript6@6.0.2', lockVersion: '@typescript/typescript6@6.0.2', installedVersion: '6.0.2' }).satisfied).toBe(true)
    expect(evaluateRequirementSelection({ packageName: '@typescript/native', installedName: 'typescript', range: 'npm:typescript@7.0.2', directSpecifier: 'catalog:', lockSpecifier: 'catalog:', lockVersion: 'typescript@7.0.2', installedLockVersion: 'typescript@7.0.2', installedVersion: '7.0.2', lockIdentityMatches: true }).satisfied).toBe(true)
    expect(linkedSelectionPath('link:packages/tool')).toBe('packages/tool')
    expect(linkedSelectionPath('file:../packs/tool.tgz')).toBeUndefined()
  }))

  it.effect('uses the leading pnpm 11 registry version rather than nested peer versions', () => Effect.sync(() => {
    expect(evaluateRequirementSelection({ range: '^9.0.0', directSpecifier: '^9.0.0', lockSpecifier: '^9.0.0', lockVersion: '9.1.0(@typescript-eslint/parser@8.50.0)(eslint@10.5.0(@types/node@25.9.3))(typescript@6.0.3)(vitest@4.1.9(@types/node@25.9.3))', installedVersion: '9.1.0' }).satisfied).toBe(true)
    expect(evaluateRequirementSelection({ range: '^4.1.8', directSpecifier: '^4.1.8', lockSpecifier: '^4.1.8', lockVersion: '4.1.9(@types/node@25.9.3)(vite@8.0.16(@types/node@25.9.3))', installedVersion: '4.1.9' }).satisfied).toBe(true)
  }))

  it.effect('preserves registry prerelease and build versions before patch and peer suffixes', () => Effect.sync(() => {
    const prereleaseManifest = encodeJson({ devDependencies: { '@synthetic/alpha': '^1.2.3-beta.1' } })
    const prereleaseLock = `lockfileVersion: '9.0'
importers:
  .:
    devDependencies:
      '@synthetic/alpha':
        specifier: ^1.2.3-beta.1
        version: 1.2.3-beta.1+build.7(patch_hash=abc)(peer@2.0.0)
`
    const installed = encodeJson({ name: '@synthetic/alpha', version: '1.2.3-beta.1+build.7' })
    expect(selectRootArtifact({ manifestSource: prereleaseManifest, lockSource: prereleaseLock, installedLockSource: prereleaseLock.replace('specifier: ^1.2.3-beta.1\n', ''), packageName: '@synthetic/alpha', installedManifestSource: installed }).packageVersion).toBe('1.2.3-beta.1+build.7')
  }))

  it.effect('hashes file selection context without leaking its path', () => Effect.sync(() => {
    const fileManifest = encodeJson({ devDependencies: { '@synthetic/alpha': 'file:../packs/alpha.tgz' } })
    const fileLock = `lockfileVersion: '9.0'
importers:
  .:
    devDependencies:
      '@synthetic/alpha':
        specifier: file:../packs/alpha.tgz
        version: file:../packs/alpha.tgz
packages:
  '@synthetic/alpha@file:../packs/alpha.tgz':
    resolution: { integrity: sha512-one }
`
    const first = selectRootArtifact({ manifestSource: fileManifest, lockSource: fileLock, installedLockSource: fileLock, packageName: '@synthetic/alpha', installedManifestSource: encodeJson({ name: '@synthetic/alpha', version: '1.0.0' }) })
    const secondLock = fileLock.replace('sha512-one', 'sha512-two')
    const second = selectRootArtifact({ manifestSource: fileManifest, lockSource: secondLock, installedLockSource: secondLock, packageName: '@synthetic/alpha', installedManifestSource: encodeJson({ name: '@synthetic/alpha', version: '1.0.0' }) })
    expect(first.resolutionId).not.toContain('packs')
    expect(second.resolutionId).not.toBe(first.resolutionId)
  }))

  it.effect('rejects workspace and file installed-lock selection mismatches', () => Effect.sync(() => {
    const installed = encodeJson({ name: '@synthetic/alpha', version: '1.0.0' })
    const workspaceManifest = encodeJson({ devDependencies: { '@synthetic/alpha': 'workspace:*' } })
    const workspaceLock = `lockfileVersion: '9.0'
importers:
  .:
    devDependencies:
      '@synthetic/alpha':
        specifier: workspace:*
        version: link:packages/alpha
`
    expect(() => selectRootArtifact({ manifestSource: workspaceManifest, lockSource: workspaceLock, installedLockSource: workspaceLock.replace('packages/alpha', 'packages/stale-alpha'), packageName: '@synthetic/alpha', installedManifestSource: installed })).toThrow(/installed lock/i)

    const fileManifest = encodeJson({ devDependencies: { '@synthetic/alpha': 'file:../packs/alpha.tgz' } })
    const fileLock = `lockfileVersion: '9.0'
importers:
  .:
    devDependencies:
      '@synthetic/alpha':
        specifier: file:../packs/alpha.tgz
        version: file:../packs/alpha.tgz
packages:
  '@synthetic/alpha@file:../packs/alpha.tgz':
    resolution: { integrity: sha512-current }
`
    expect(() => selectRootArtifact({ manifestSource: fileManifest, lockSource: fileLock, installedLockSource: fileLock.replace('sha512-current', 'sha512-stale'), packageName: '@synthetic/alpha', installedManifestSource: installed })).toThrow(/installed lock/i)
  }))
})
