import type { ContributionTrace } from '../../src/core/ownership/model'
import type { JsonBuilder } from '../../src/core/services/planner'
import { describe, expect, it } from 'vitest'
import {
  formatPackageManagerCommand,
  getPackageManagerField,
  packageManagerAddDevCommand,
  packageManagerExecCommand,
  packageManagerInstallCommand,
} from '../../src/core/package-manager'
import {
  applyWorkspaceBootstrapPackageJson,
  getWorkspaceBootstrapCommandSpecs,
  getWorkspaceBootstrapHookSpecs,
  getWorkspaceBootstrapPackageContributions,
  getWorkspaceBootstrapPostGenerateFileActions,
  getWorkspaceBootstrapPresetDefaults,
  getWorkspaceRootPackageContributions,
  getWorkspaceRootScripts,
  resolveWorkspaceBootstrapInstallPolicy,
  shouldAskWorkspaceBootstrapCodeQuality,
  workspaceBootstrapPackageJsonMutation,
  workspaceBootstrapQuestionContracts,
  workspaceRootPackageGlobs,
} from '../../src/core/workspace-bootstrap'
import {
  reactMinimalPresetProjectConfig,
  reactPresetProjectConfig,
  workspaceMixedProjectConfig,
  workspaceRootProjectConfig,
} from '../support/fixtures'

function applyWorkspacePackageMutations(config: Parameters<typeof applyWorkspaceBootstrapPackageJson>[1]) {
  const reducers: Array<{
    readonly reducer: (draft: Record<string, unknown>) => void
    readonly ownership: ContributionTrace | undefined
  }> = []

  const builder: JsonBuilder = {
    readExisting() {
      return builder
    },
    sortKeys() {
      return builder
    },
    base() {
      return builder
    },
    merge(_patch, ownership) {
      reducers.push({
        reducer: draft => Object.assign(draft, typeof _patch === 'function' ? _patch(draft) : _patch),
        ownership,
      })
      return builder
    },
    modify(fn, ownership) {
      reducers.push({ reducer: fn, ownership })
      return builder
    },
    finalize() {
      return builder
    },
  }

  applyWorkspaceBootstrapPackageJson(builder, config)

  const draft: Record<string, unknown> = {
    scripts: {},
    devDependencies: {},
  }

  for (const { reducer } of reducers) {
    reducer(draft)
  }

  return { draft, reducers }
}

describe('workspace/bootstrap contract', () => {
  it('keeps code-quality prompts gated by git and linting choices', () => {
    expect(shouldAskWorkspaceBootstrapCodeQuality({
      git: true,
      linting: 'antfu-eslint',
    })).toBe(true)

    expect(shouldAskWorkspaceBootstrapCodeQuality({
      git: false,
      linting: 'antfu-eslint',
    })).toBe(false)

    expect(shouldAskWorkspaceBootstrapCodeQuality({
      git: true,
      linting: 'none',
    })).toBe(false)
  })

  it('keeps preset defaults in one shared contract', () => {
    expect(getWorkspaceBootstrapPresetDefaults(true)).toEqual({
      linting: 'antfu-eslint',
      codeQuality: ['lint-staged', 'commitlint'],
    })

    expect(getWorkspaceBootstrapPresetDefaults(false)).toEqual({
      linting: 'antfu-eslint',
      codeQuality: [],
    })
  })

  it('encodes install policy centrally', () => {
    expect(resolveWorkspaceBootstrapInstallPolicy({
      cliInstallArg: true,
      isInteractive: false,
    })).toBe(true)

    expect(resolveWorkspaceBootstrapInstallPolicy({
      cliInstallArg: false,
      isInteractive: true,
    })).toBe(false)

    expect(resolveWorkspaceBootstrapInstallPolicy({
      cliInstallArg: undefined,
      isInteractive: true,
    })).toBe('prompt')

    expect(resolveWorkspaceBootstrapInstallPolicy({
      cliInstallArg: undefined,
      isInteractive: false,
    })).toBe(false)
  })

  it('exposes package contributions with workspace ownership metadata', () => {
    const contributions = getWorkspaceBootstrapPackageContributions(reactPresetProjectConfig)

    expect(contributions).toEqual([
      {
        ownership: workspaceBootstrapPackageJsonMutation,
        targetScope: 'root',
        sections: {
          devDependencies: {
            '@antfu/eslint-config': '^8.2.0',
            'eslint': '^10.3.0',
          },
          scripts: {
            'lint': 'eslint',
            'lint:fix': 'eslint --fix',
          },
        },
      },
      {
        ownership: workspaceBootstrapPackageJsonMutation,
        targetScope: 'root',
        sections: {
          devDependencies: {
            knip: '^6.12.0',
            taze: '^19.11.0',
          },
          scripts: {
            'deps:check': 'taze',
            'deps:check:all': 'taze --all',
            'deps:fresh': 'taze minor -w -i --maturity-period 7',
            'knip': 'knip',
            'verify': 'pnpm build && pnpm lint && pnpm knip',
          },
        },
      },
      {
        ownership: workspaceBootstrapPackageJsonMutation,
        targetScope: 'root',
        sections: {
          devDependencies: {
            husky: '^9.1.7',
          },
        },
      },
      {
        ownership: workspaceBootstrapPackageJsonMutation,
        targetScope: 'root',
        sections: {
          devDependencies: {
            'lint-staged': '^17.0.2',
          },
        },
      },
      {
        ownership: workspaceBootstrapPackageJsonMutation,
        targetScope: 'root',
        sections: {
          devDependencies: {
            '@commitlint/cli': '^20.5.3',
            '@commitlint/config-conventional': '^20.5.3',
          },
        },
      },
    ])
  })

  it('keeps Knip package contributions when optional workspace package policy is disabled', () => {
    expect(getWorkspaceBootstrapPackageContributions(reactMinimalPresetProjectConfig)).toEqual([
      {
        ownership: workspaceBootstrapPackageJsonMutation,
        targetScope: 'root',
        sections: {
          devDependencies: {
            knip: '^6.12.0',
            taze: '^19.11.0',
          },
          scripts: {
            'deps:check': 'taze',
            'deps:check:all': 'taze --all',
            'deps:fresh': 'taze minor -w -i --maturity-period 7',
            'knip': 'knip',
            'verify': 'pnpm build && pnpm knip',
          },
        },
      },
    ])
  })

  it('applies package mutations with workspace ownership metadata', () => {
    const { draft, reducers } = applyWorkspacePackageMutations(reactPresetProjectConfig)

    expect(draft.devDependencies).toMatchObject({
      '@antfu/eslint-config': '^8.2.0',
      '@commitlint/cli': '^20.5.3',
      '@commitlint/config-conventional': '^20.5.3',
      'eslint': '^10.3.0',
      'husky': '^9.1.7',
      'knip': '^6.12.0',
      'lint-staged': '^17.0.2',
      'taze': '^19.11.0',
    })
    expect(draft.scripts).toMatchObject({
      'deps:check': 'taze',
      'deps:check:all': 'taze --all',
      'deps:fresh': 'taze minor -w -i --maturity-period 7',
      'knip': 'knip',
      'lint': 'eslint',
      'lint:fix': 'eslint --fix',
      'verify': 'pnpm build && pnpm lint && pnpm knip',
    })
    expect(draft.scripts).not.toHaveProperty('commit')
    expect(draft.scripts).not.toHaveProperty('commit:config')
    expect(reducers).toHaveLength(7)
    expect(reducers.map(reducer => reducer.ownership)).toEqual(
      Array.from({ length: 7 }).fill(workspaceBootstrapPackageJsonMutation),
    )
  })

  it('keeps default Knip package mutations when optional workspace policy is disabled', () => {
    const { draft, reducers } = applyWorkspacePackageMutations(reactMinimalPresetProjectConfig)

    expect(draft.devDependencies).toEqual({
      knip: '^6.12.0',
      taze: '^19.11.0',
    })
    expect(draft.scripts).toEqual({
      'deps:check': 'taze',
      'deps:check:all': 'taze --all',
      'deps:fresh': 'taze minor -w -i --maturity-period 7',
      'knip': 'knip',
      'verify': 'pnpm build && pnpm knip',
    })
    expect(reducers).toHaveLength(7)
    expect(reducers.map(reducer => reducer.ownership)).toEqual(
      Array.from({ length: 7 }).fill(workspaceBootstrapPackageJsonMutation),
    )
  })

  it('keeps Husky hook writes structured as post-generate file actions', () => {
    expect(getWorkspaceBootstrapHookSpecs(reactPresetProjectConfig)).toEqual([
      {
        path: '.husky/pre-commit',
        content: 'pnpm lint-staged\n',
        executable: false,
      },
      {
        path: '.husky/commit-msg',
        content: 'pnpm exec commitlint --edit "$1"\n',
        executable: true,
      },
    ])

    expect(getWorkspaceBootstrapPostGenerateFileActions(reactPresetProjectConfig)).toEqual([
      {
        kind: 'write-file',
        path: '.husky/pre-commit',
        content: 'pnpm lint-staged\n',
        phase: 'after-post-generate-commands',
        ownership: {
          owner: 'workspace-bootstrap',
          unit: 'post-generate-file',
        },
        executable: false,
      },
      {
        kind: 'write-file',
        path: '.husky/commit-msg',
        content: 'pnpm exec commitlint --edit "$1"\n',
        phase: 'after-post-generate-commands',
        ownership: {
          owner: 'workspace-bootstrap',
          unit: 'post-generate-file',
        },
        executable: true,
      },
    ])

    expect(
      getWorkspaceBootstrapCommandSpecs(reactPresetProjectConfig, true)
        .filter(spec => spec.command === 'sh' || spec.command === 'node')
        .map(spec => spec.args.join(' ')),
    ).toEqual([])
  })

  it('keeps command policy in one workspace/bootstrap contract', () => {
    expect(getWorkspaceBootstrapCommandSpecs(reactPresetProjectConfig, true)).toEqual([
      { command: 'pnpm', args: ['install'] },
      { command: 'git', args: ['init'] },
      { command: 'pnpm', args: ['exec', 'husky', 'init'] },
    ])

    expect(getWorkspaceBootstrapCommandSpecs(reactPresetProjectConfig, false)).toEqual([
      { command: 'git', args: ['init'] },
      { command: 'pnpm', args: ['add', '-D', 'husky'] },
      { command: 'pnpm', args: ['exec', 'husky', 'init'] },
    ])

    expect(getWorkspaceBootstrapCommandSpecs({
      ...reactPresetProjectConfig,
      git: false,
      codeQuality: [],
    }, false)).toEqual([])

    expect(workspaceBootstrapQuestionContracts.codeQuality.options.map(option => option.value)).toEqual([
      'lint-staged',
      'commitlint',
    ])
  })

  it('centralizes pnpm package-manager command and manifest policy', () => {
    expect(getPackageManagerField()).toBe('pnpm@10.33.4')
    expect(formatPackageManagerCommand(packageManagerInstallCommand())).toBe('pnpm install')
    expect(formatPackageManagerCommand(packageManagerAddDevCommand('husky'))).toBe('pnpm add -D husky')
    expect(formatPackageManagerCommand(packageManagerExecCommand('husky', 'init'))).toBe('pnpm exec husky init')
  })

  it('exposes root-owned workspace package manifest policy', () => {
    expect(workspaceRootPackageGlobs).toEqual(['apps/*', 'libs/*'])
    expect(getWorkspaceRootPackageContributions({
      name: reactPresetProjectConfig.name,
      type: 'workspace-root',
      language: 'typescript',
      git: false,
      linting: 'none',
      codeQuality: [],
      packageManager: 'pnpm',
      packages: [],
    })).toEqual([
      {
        ownership: workspaceBootstrapPackageJsonMutation,
        targetScope: 'root',
        fields: {
          private: true,
          packageManager: 'pnpm@10.33.4',
          description: 'A pnpm workspace root generated by create-yume',
        },
        sections: {
          scripts: {
            'deps:check': 'taze -r',
            'deps:check:all': 'taze -r --all',
            'deps:fresh': 'taze minor -r -w -i --maturity-period 7',
            'knip': 'knip',
            'verify': 'pnpm knip',
          },
          devDependencies: {
            knip: '^6.12.0',
            taze: '^19.11.0',
            turbo: '^2.9.9',
          },
          engines: {
            node: '>=22.22.1',
          },
        },
      },
    ])
  })

  it('derives workspace root orchestration scripts from emitted child package scripts', () => {
    expect(getWorkspaceRootScripts({ packages: [] })).toEqual({})
    expect(getWorkspaceRootScripts(workspaceMixedProjectConfig)).toEqual({
      build: 'turbo run build',
      dev: 'turbo run dev',
      typecheck: 'turbo run typecheck',
    })

    const contributions = getWorkspaceRootPackageContributions(workspaceMixedProjectConfig)
    const scripts = Object.assign(
      {},
      ...contributions.map(contribution => contribution.sections?.scripts ?? {}),
    )

    expect(scripts).toEqual({
      'build': 'turbo run build',
      'deps:check': 'taze -r',
      'deps:check:all': 'taze -r --all',
      'deps:fresh': 'taze minor -r -w -i --maturity-period 7',
      'dev': 'turbo run dev',
      'knip': 'knip',
      'typecheck': 'turbo run typecheck',
      'verify': 'pnpm build && pnpm typecheck && pnpm knip',
    })
    expect(scripts).not.toHaveProperty('clean')
    expect(scripts).not.toHaveProperty('lint')
    expect(scripts).not.toHaveProperty('test')
  })

  it('keeps workspace root lint tooling out of root scripts until package lint tasks exist', () => {
    const contributions = getWorkspaceRootPackageContributions(workspaceRootProjectConfig)
    const scriptEntries = contributions.flatMap(contribution =>
      Object.entries(contribution.sections?.scripts ?? {}),
    )
    const devDependencyKeys = contributions.flatMap(contribution =>
      Object.keys(contribution.sections?.devDependencies ?? {}),
    )

    expect(scriptEntries.filter(([key]) => key === 'lint')).toEqual([])
    expect(scriptEntries).not.toContainEqual(['lint', 'eslint'])
    expect(scriptEntries).not.toContainEqual(['lint:fix', 'eslint --fix'])
    expect(devDependencyKeys).toEqual(expect.arrayContaining([
      'turbo',
      'husky',
      'knip',
      'lint-staged',
      'taze',
      '@commitlint/cli',
      '@commitlint/config-conventional',
    ]))
    expect(devDependencyKeys).not.toContain('@antfu/eslint-config')
    expect(devDependencyKeys).not.toContain('eslint')
  })
})
