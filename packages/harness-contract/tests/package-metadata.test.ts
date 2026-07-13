import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, test } from '@effect/vitest'

const execFileAsync = promisify(execFile)
const workspaceRoot = join(import.meta.dirname, '../..')
const repositoryUrl = 'https://github.com/yume-infra/prelude.git'

describe('published package metadata', () => {
  test('packs both published packages with canonical repository metadata', async () => {
    const destination = await mkdtemp(join(tmpdir(), 'prelude-pack-metadata-'))
    try {
      for (const packageName of ['@sayoriqwq/prelude-contract', '@sayoriqwq/prelude']) {
        await execFileAsync('pnpm', ['--filter', packageName, 'pack', '--pack-destination', destination], { cwd: workspaceRoot })
      }

      const entries = await execFileAsync('find', [destination, '-name', '*.tgz', '-print'], { cwd: workspaceRoot })
      for (const tarball of entries.stdout.trim().split('\n')) {
        const unpacked = await mkdtemp(join(tmpdir(), 'prelude-pack-metadata-unpacked-'))
        try {
          await execFileAsync('tar', ['-xzf', tarball, '-C', unpacked])
          const manifest = JSON.parse(await readFile(join(unpacked, 'package/package.json'), 'utf8')) as { repository?: { type?: string, url?: string } }
          expect(manifest.repository).toEqual({ type: 'git', url: repositoryUrl })
        }
        finally {
          await rm(unpacked, { recursive: true, force: true })
        }
      }
    }
    finally {
      await rm(destination, { recursive: true, force: true })
    }
  }, 120_000)
})
