import type { Preset } from '@/schema/preset'
import { select } from '@clack/prompts'

export async function askPreset() {
  return await select<Preset>({
    message: 'Choose a preset combination:',
    options: [
      { value: 'standalone-react-minimal', label: 'Standalone React Minimal - Vite, TypeScript, Less' },
      { value: 'standalone-react-full', label: 'Standalone React Full - Vite, TypeScript, Less, Tailwind, React Router, Jotai, Git, ESLint' },
      { value: 'standalone-vue-minimal', label: 'Standalone Vue Minimal - Vite, TypeScript, Less' },
      { value: 'standalone-vue-full', label: 'Standalone Vue Full - Vite, TypeScript, Less, Tailwind, Vue Router, Pinia, Git, ESLint' },
      { value: 'workspace-root-minimal', label: 'Workspace Root Minimal - pnpm workspace root' },
      { value: 'workspace-cli-library', label: 'Workspace CLI Library - Effect CLI app and shared core library' },
      { value: 'workspace-fullstack-react', label: 'Workspace Fullstack React - React app, Node API, shared library' },
      { value: 'workspace-fullstack-vue', label: 'Workspace Fullstack Vue - Vue app, Node API, shared library' },
      { value: 'standalone-library-minimal', label: 'Standalone Library Minimal - TypeScript, ESM, neutral runtime' },
      { value: 'standalone-library-node', label: 'Standalone Library Node - TypeScript, ESM, Node runtime' },
      { value: 'standalone-backend-minimal', label: 'Standalone Backend Minimal - TypeScript, ESM, tsdown' },
      { value: 'standalone-backend-full', label: 'Standalone Backend Full - TypeScript, ESM, tsdown, Git, ESLint' },
      { value: 'standalone-cli-minimal', label: 'Standalone CLI Minimal - TypeScript, ESM, tsdown, bin' },
      { value: 'standalone-cli-effect', label: 'Standalone CLI Effect - TypeScript, ESM, tsdown, @effect/cli' },
      { value: 'standalone-cli-full', label: 'Standalone CLI Full - Effect CLI, Git, ESLint' },
    ],
  })
}
