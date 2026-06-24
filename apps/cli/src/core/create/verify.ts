import type { CreateFs, ResolvedGraph, VerificationResult } from './model'
import * as path from 'node:path'
import { Effect } from 'effect'

function requiredPathsFor(graph: ResolvedGraph): readonly string[] {
  return graph.logicalSurfaces.flatMap((surface) => {
    switch (surface.id) {
      case 'package-manifest:root':
        return ['package.json']
      case 'eslint-root':
        return ['eslint.config.mjs']
      case 'knip-root':
        return ['knip.json']
      case 'source:root/src/index.ts':
        return ['src/index.ts']
      default:
        return []
    }
  })
}

export function verifyCreateOutputs(fs: CreateFs, baseDir: string, graph: ResolvedGraph): Effect.Effect<VerificationResult, never> {
  return Effect.gen(function* () {
    const requiredPaths = requiredPathsFor(graph)
    const missingPaths: string[] = []

    for (const requiredPath of requiredPaths) {
      const exists = yield* fs.exists(path.join(baseDir, requiredPath)).pipe(Effect.orElseSucceed(() => false))
      if (!exists) {
        missingPaths.push(requiredPath)
      }
    }

    if (missingPaths.length > 0) {
      return yield* Effect.die(new Error(`Create output verification failed for missing paths: ${missingPaths.join(', ')}`))
    }

    return {
      records: [
        {
          id: 'minimal-create-files-present',
          status: 'passed',
          checkedPaths: requiredPaths.filter(requiredPath => requiredPath === 'package.json' || requiredPath === 'src/index.ts'),
        },
        ...(graph.rootCapabilities.length > 0
          ? [{
              id: 'root-engineering-files-present',
              status: 'passed' as const,
              checkedPaths: requiredPaths.filter(requiredPath => requiredPath !== 'package.json' && requiredPath !== 'src/index.ts'),
            }]
          : []),
      ],
    }
  })
}
