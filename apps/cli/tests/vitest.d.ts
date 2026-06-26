declare module 'vitest' {
  export const assert: typeof import('node:assert/strict')
  export const beforeEach: any
  export const describe: any
  export const expect: any
  export const it: any
  export const vi: any
}
