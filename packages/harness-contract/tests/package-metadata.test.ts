import { fileURLToPath } from 'node:url'

import { NodeServices } from '@effect/platform-node'
import { describe, expect, layer } from '@effect/vitest'
import { Data, Effect, FileSystem, Path, Schema, Stream } from 'effect'
import { ChildProcess } from 'effect/unstable/process'

const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url))
const repositoryUrl = 'https://github.com/yume-infra/prelude.git'
const PackageManifestSchema = Schema.Struct({
  repository: Schema.optionalKey(Schema.Struct({
    type: Schema.optionalKey(Schema.String),
    url: Schema.optionalKey(Schema.String),
  })),
})

class CommandError extends Data.TaggedError('@sayoriqwq/prelude-contract/tests/package-metadata.test/CommandError')<{
  readonly message: string
}> {}

function run(command: string, arguments_: ReadonlyArray<string>, cwd: string) {
  return Effect.scoped(Effect.gen(function* () {
    const handle = yield* ChildProcess.make(command, arguments_, { cwd, stdout: 'pipe', stderr: 'pipe' })
    const [stdout, stderr, exitCode] = yield* Effect.all([
      Stream.runFold(Stream.decodeText(handle.stdout), () => '', (text, chunk) => text + chunk),
      Stream.runFold(Stream.decodeText(handle.stderr), () => '', (text, chunk) => text + chunk),
      handle.exitCode,
    ])
    if (exitCode !== 0)
      return yield* new CommandError({ message: `${command} ${arguments_.join(' ')} failed:\n${stderr || stdout}` })
    return stdout.trim()
  }))
}

describe('published package metadata', () => {
  layer(NodeServices.layer)((it) => {
    it.effect('packs both published packages with canonical repository metadata', () =>
      Effect.scoped(Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        const path = yield* Path.Path
        const destination = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-pack-metadata-' })

        for (const packageName of ['@sayoriqwq/prelude-contract', '@sayoriqwq/prelude'])
          yield* run('pnpm', ['--filter', packageName, 'pack', '--pack-destination', destination], workspaceRoot)

        const tarballs = (yield* fs.readDirectory(destination)).filter(entry => entry.endsWith('.tgz'))
        for (const tarball of tarballs) {
          const unpacked = yield* fs.makeTempDirectoryScoped({ prefix: 'prelude-pack-metadata-unpacked-' })
          yield* run('tar', ['-xzf', path.join(destination, tarball), '-C', unpacked], workspaceRoot)
          const manifestSource = yield* fs.readFileString(path.join(unpacked, 'package/package.json'))
          const manifest = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(PackageManifestSchema))(manifestSource)
          expect(manifest.repository).toEqual({ type: 'git', url: repositoryUrl })
        }
      })), 120_000)
  })
})
