import type { CreateFs, ResolvedGraph, VerificationResult } from './model'
import * as path from 'node:path'
import { Effect } from 'effect'
import {
  effectHarnessProviderPath,
  effectHarnessVerificationRecord,
  hasEffectHarnessProvider,
} from './effect-harness-provider'

function requiredPathsFor(graph: ResolvedGraph): readonly string[] {
  const paths = graph.logicalSurfaces.flatMap((surface) => {
    switch (surface.id) {
      case 'package-manifest:root':
        return ['package.json']
      case 'eslint-root':
        return ['eslint.config.mjs']
      case 'knip-root':
        return ['knip.json']
      case 'source:root/src/index.ts':
        return ['src/index.ts']
      case 'provider:effect-harness':
        return [effectHarnessProviderPath]
      default:
        if (surface.id.startsWith('package-manifest:')) {
          return ['package.json']
        }
        if (surface.id.includes('/index.html')) {
          return ['index.html']
        }
        if (surface.id.includes('/src/main.tsx')) {
          return ['src/main.tsx']
        }
        if (surface.id.startsWith('react-app-shell:')) {
          return ['src/App.tsx']
        }
        return []
    }
  })

  return [...new Set(paths)]
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

    const providerRecords = hasEffectHarnessProvider(graph) ? [effectHarnessVerificationRecord()] : []
    const hasRootEngineeringFiles = graph.rootCapabilities.includes('linting') || graph.rootCapabilities.includes('knip')

    if (graph.rootPackage.capabilities.includes('react-app')) {
      return {
        records: [
          {
            id: 'react-app-files-present',
            status: 'passed',
            checkedPaths: requiredPaths.filter(requiredPath =>
              requiredPath === 'package.json'
              || requiredPath === 'index.html'
              || requiredPath === 'src/main.tsx'
              || requiredPath === 'src/App.tsx'),
          },
          ...(hasRootEngineeringFiles
            ? [{
                id: 'root-engineering-files-present',
                status: 'passed' as const,
                checkedPaths: requiredPaths.filter(requiredPath =>
                  requiredPath === 'eslint.config.mjs'
                  || requiredPath === 'knip.json'),
              }]
            : []),
          ...providerRecords,
        ],
      }
    }

    return {
      records: [
        {
          id: 'minimal-create-files-present',
          status: 'passed',
          checkedPaths: requiredPaths.filter(requiredPath => requiredPath === 'package.json' || requiredPath === 'src/index.ts'),
        },
        ...(hasRootEngineeringFiles
          ? [{
              id: 'root-engineering-files-present',
              status: 'passed' as const,
              checkedPaths: requiredPaths.filter(requiredPath => requiredPath !== 'package.json' && requiredPath !== 'src/index.ts'),
            }]
          : []),
        ...providerRecords,
      ],
    }
  })
}
