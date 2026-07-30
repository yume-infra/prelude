import { NodeServices } from '@effect/platform-node'
import { describe, expect, layer } from '@effect/vitest'
import { Effect, FileSystem, Path } from 'effect'

import { decodeJson } from '../src/json.js'

const documentedGateSurfaces = [
  'README.md',
  'docs/v2-harness-convergence-contract.md',
  'docs/architecture-handoff.md',
]

describe('packed Effect acceptance interface', () => {
  layer(NodeServices.layer)((it) => {
    it.effect('keeps the Prelude package command as an explicitly phased internal runner', () => Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const workspaceRoot = path.resolve(import.meta.dirname, '../../..')
      const packageManifest = decodeJson(yield* fs.readFileString(path.join(workspaceRoot, 'package.json'))) as {
        readonly scripts: Readonly<Record<string, string>>
      }
      const phaseRunner = yield* fs.readFileString(
        path.join(workspaceRoot, 'apps/cli/tests/acceptance/packed-effect-gate.ts'),
      )

      expect(packageManifest.scripts['acceptance:packed-effect']).toContain('packed-effect-gate.ts')
      expect(phaseRunner).toContain('Config.string(\'PRELUDE_GATE_PHASE\')')
      expect(phaseRunner).toContain('must be explicitly set to prepare or apply')
    }))

    it.effect('routes every documented Gate surface to the explicit cross-repository PREPARE/APPLY lifecycle', () => Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const workspaceRoot = path.resolve(import.meta.dirname, '../../..')

      for (const relativePath of documentedGateSurfaces) {
        const source = yield* fs.readFileString(path.join(workspaceRoot, relativePath))
        expect(source, relativePath).toContain('CROSS_REPO_PHASE=prepare')
        expect(source, relativePath).toContain('CROSS_REPO_PHASE=apply')
        expect(source, relativePath).toContain('internal phase runner')
        expect(source, relativePath).not.toMatch(/`pnpm acceptance:packed-effect` (?:exercises|installs|for isolated)/u)
      }
    }))
  })
})
