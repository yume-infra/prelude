import type { CreateFs, VerificationResult } from './model'
import * as path from 'node:path'
import { Effect } from 'effect'

export function verifyMinimalCreate(fs: CreateFs, baseDir: string): Effect.Effect<VerificationResult, never> {
  return Effect.gen(function* () {
    const packageJsonExists = yield* fs.exists(path.join(baseDir, 'package.json')).pipe(Effect.orElseSucceed(() => false))
    const sourceExists = yield* fs.exists(path.join(baseDir, 'src/index.ts')).pipe(Effect.orElseSucceed(() => false))

    if (!packageJsonExists || !sourceExists) {
      return yield* Effect.die(new Error('Minimal create verification failed'))
    }

    return {
      records: [
        {
          id: 'minimal-create-files-present',
          status: 'passed',
          checkedPaths: ['package.json', 'src/index.ts'],
        },
      ],
    }
  })
}
