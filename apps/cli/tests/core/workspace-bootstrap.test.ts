import type { ContributionTrace } from '../../src/core/ownership/model'
import type { JsonBuilder } from '../../src/core/services/planner'
import { describe, expect, it } from 'vitest'
import {
  applyWorkspaceBootstrapPackageJson,
  getWorkspaceBootstrapCommandSpecs,
  getWorkspaceBootstrapHookSpecs,
  getWorkspaceBootstrapPackageContributions,
  getWorkspaceBootstrapPostGenerateFileActions,
  getWorkspaceBootstrapPresetDefaults,
  resolveWorkspaceBootstrapInstallPolicy,
  shouldAskWorkspaceBootstrapCodeQuality,
  workspaceBootstrapPackageJsonMutation,
  workspaceBootstrapQuestionContracts,
} from '../../src/core/workspace-bootstrap'
import { reactPresetProjectConfig } from '../support/fixtures'

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
        sections: {
          devDependencies: {
            '@antfu/eslint-config': '^8.2.0',
            'eslint': '^10.2.1',
          },
          scripts: {
            'lint': 'eslint',
            'lint:fix': 'eslint --fix',
          },
        },
      },
      {
        ownership: workspaceBootstrapPackageJsonMutation,
        sections: {
          devDependencies: {
            husky: '^9.1.7',
          },
        },
      },
      {
        ownership: workspaceBootstrapPackageJsonMutation,
        sections: {
          devDependencies: {
            'lint-staged': '^16.4.0',
          },
        },
      },
      {
        ownership: workspaceBootstrapPackageJsonMutation,
        sections: {
          devDependencies: {
            '@commitlint/cli': '^20.5.0',
            '@commitlint/config-conventional': '^20.5.0',
          },
        },
      },
    ])
  })

  it('omits package contributions when workspace package policy is disabled', () => {
    expect(getWorkspaceBootstrapPackageContributions({
      git: false,
      linting: 'none',
      codeQuality: [],
    })).toEqual([])
  })

  it('applies package mutations with workspace ownership metadata', () => {
    const { draft, reducers } = applyWorkspacePackageMutations(reactPresetProjectConfig)

    expect(draft.devDependencies).toMatchObject({
      '@antfu/eslint-config': '^8.2.0',
      '@commitlint/cli': '^20.5.0',
      '@commitlint/config-conventional': '^20.5.0',
      'eslint': '^10.2.1',
      'husky': '^9.1.7',
      'lint-staged': '^16.4.0',
    })
    expect(draft.scripts).toMatchObject({
      'lint': 'eslint',
      'lint:fix': 'eslint --fix',
    })
    expect(draft.scripts).not.toHaveProperty('commit')
    expect(draft.scripts).not.toHaveProperty('commit:config')
    expect(reducers).toHaveLength(5)
    expect(reducers.map(reducer => reducer.ownership)).toEqual(
      Array.from({ length: 5 }).fill(workspaceBootstrapPackageJsonMutation),
    )
  })

  it('keeps disabled package mutations as no-op workspace policy reducers', () => {
    const { draft, reducers } = applyWorkspacePackageMutations({
      git: false,
      linting: 'none',
      codeQuality: [],
    })

    expect(draft.devDependencies).toEqual({})
    expect(draft.scripts).toEqual({})
    expect(reducers).toHaveLength(5)
    expect(reducers.map(reducer => reducer.ownership)).toEqual(
      Array.from({ length: 5 }).fill(workspaceBootstrapPackageJsonMutation),
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
})
