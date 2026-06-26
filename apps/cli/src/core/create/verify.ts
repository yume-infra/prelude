import type { CreateFs, ResolvedGraph, VerificationResult, WritePlan } from './model'
import * as path from 'node:path'
import { Effect } from 'effect'
import {
  effectHarnessVerificationRecord,
  hasEffectHarnessProvider,
} from './effect-harness-provider'

function requiredPathsFor(writePlan: WritePlan): readonly string[] {
  return [...new Set(writePlan.operations.map(operation => operation.path))]
}

function workspaceRootPaths(requiredPaths: readonly string[]) {
  return requiredPaths.filter(requiredPath =>
    requiredPath === 'package.json'
    || requiredPath === 'pnpm-workspace.yaml',
  )
}

function rootEngineeringPaths(requiredPaths: readonly string[]) {
  return requiredPaths.filter(requiredPath =>
    requiredPath === 'eslint.config.mjs'
    || requiredPath === 'knip.json',
  )
}

function singleRootPackagePaths(requiredPaths: readonly string[]) {
  return requiredPaths.filter(requiredPath =>
    requiredPath === 'package.json'
    || requiredPath === 'index.html'
    || requiredPath === 'src/main.tsx'
    || requiredPath === 'src/main.ts'
    || requiredPath === 'src/App.tsx'
    || requiredPath === 'src/App.vue'
    || requiredPath === 'src/index.ts'
    || requiredPath === 'scripts/ensure-shebang.mjs'
    || requiredPath === 'vite.config.ts'
    || requiredPath === 'tsconfig.json'
    || requiredPath === 'tsdown.config.ts'
    || requiredPath === 'src/styles.css'
    || requiredPath === 'src/styles.less',
  )
}

function orderedPresent(requiredPaths: readonly string[], orderedPaths: readonly string[]) {
  return orderedPaths.filter(requiredPath => requiredPaths.includes(requiredPath))
}

function workspacePackagePaths(requiredPaths: readonly string[]) {
  return requiredPaths.filter(requiredPath =>
    requiredPath.startsWith('apps/')
    || requiredPath.startsWith('libs/'),
  )
}

export function verifyCreateOutputs(
  fs: CreateFs,
  baseDir: string,
  graph: ResolvedGraph,
  writePlan: WritePlan,
): Effect.Effect<VerificationResult, never> {
  return Effect.gen(function* () {
    const requiredPaths = requiredPathsFor(writePlan)
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

    if (graph.topology === 'workspace') {
      return {
        records: [
          {
            id: 'workspace-root-files-present',
            status: 'passed',
            checkedPaths: workspaceRootPaths(requiredPaths),
          },
          {
            id: 'workspace-package-files-present',
            status: 'passed',
            checkedPaths: workspacePackagePaths(requiredPaths),
          },
          ...(hasRootEngineeringFiles
            ? [{
                id: 'root-engineering-files-present',
                status: 'passed' as const,
                checkedPaths: rootEngineeringPaths(requiredPaths),
              }]
            : []),
          ...providerRecords,
        ],
      }
    }

    if (graph.rootPackage.capabilities.includes('react-app')) {
      return {
        records: [
          {
            id: 'react-app-files-present',
            status: 'passed',
            checkedPaths: orderedPresent(singleRootPackagePaths(requiredPaths), [
              'package.json',
              'index.html',
              'src/main.tsx',
              'src/App.tsx',
              'vite.config.ts',
              'tsconfig.json',
              'src/styles.css',
              'src/styles.less',
            ]),
          },
          ...(hasRootEngineeringFiles
            ? [{
                id: 'root-engineering-files-present',
                status: 'passed' as const,
                checkedPaths: rootEngineeringPaths(requiredPaths),
              }]
            : []),
          ...providerRecords,
        ],
      }
    }

    if (graph.rootPackage.capabilities.includes('vue-app')) {
      return {
        records: [
          {
            id: 'vue-app-files-present',
            status: 'passed',
            checkedPaths: orderedPresent(singleRootPackagePaths(requiredPaths), [
              'package.json',
              'index.html',
              'src/main.ts',
              'src/App.vue',
              'vite.config.ts',
              'tsconfig.json',
              'src/styles.css',
              'src/styles.less',
            ]),
          },
          ...(hasRootEngineeringFiles
            ? [{
                id: 'root-engineering-files-present',
                status: 'passed' as const,
                checkedPaths: rootEngineeringPaths(requiredPaths),
              }]
            : []),
          ...providerRecords,
        ],
      }
    }

    if (graph.rootPackage.capabilities.includes('cli-tool')) {
      return {
        records: [
          {
            id: 'cli-tool-files-present',
            status: 'passed',
            checkedPaths: orderedPresent(singleRootPackagePaths(requiredPaths), [
              'package.json',
              'src/index.ts',
              'scripts/ensure-shebang.mjs',
              'tsconfig.json',
              'tsdown.config.ts',
            ]),
          },
          ...(hasRootEngineeringFiles
            ? [{
                id: 'root-engineering-files-present',
                status: 'passed' as const,
                checkedPaths: rootEngineeringPaths(requiredPaths),
              }]
            : []),
          ...providerRecords,
        ],
      }
    }

    if (graph.rootPackage.capabilities.includes('node-backend') || graph.rootPackage.capabilities.includes('library')) {
      return {
        records: [
          {
            id: 'node-package-files-present',
            status: 'passed',
            checkedPaths: orderedPresent(singleRootPackagePaths(requiredPaths), [
              'package.json',
              'src/index.ts',
              'tsconfig.json',
              'tsdown.config.ts',
            ]),
          },
          ...(hasRootEngineeringFiles
            ? [{
                id: 'root-engineering-files-present',
                status: 'passed' as const,
                checkedPaths: rootEngineeringPaths(requiredPaths),
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
          checkedPaths: orderedPresent(singleRootPackagePaths(requiredPaths), [
            'package.json',
            'src/index.ts',
            'tsconfig.json',
          ]),
        },
        ...(hasRootEngineeringFiles
          ? [{
              id: 'root-engineering-files-present',
              status: 'passed' as const,
              checkedPaths: rootEngineeringPaths(requiredPaths),
            }]
          : []),
        ...providerRecords,
      ],
    }
  })
}
