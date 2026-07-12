import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'

const cliRoot = join(import.meta.dirname, '..')
const skillsRoot = join(cliRoot, 'skills')
const skills = ['prelude-bootstrap', 'prelude-repair', 'prelude-upgrade'] as const

function skill(name: typeof skills[number]) {
  return Effect.promise(() => readFile(join(skillsRoot, name, 'SKILL.md'), 'utf8'))
}

describe('prelude-owned skills', () => {
  it.effect('uses the standard two-field frontmatter and ships every skill directory', () => Effect.gen(function* () {
    const manifest = JSON.parse(yield* Effect.promise(() => readFile(join(cliRoot, 'package.json'), 'utf8'))) as { files: string[] }
    expect(manifest.files).toContain('skills')

    for (const name of skills) {
      expect(yield* skill(name)).toMatch(new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---\\n`, 's'))
    }
  }))

  it.effect('keeps the required authorization and convergence gates explicit', () => Effect.gen(function* () {
    const bootstrap = yield* skill('prelude-bootstrap')
    const repair = yield* skill('prelude-repair')
    const upgrade = yield* skill('prelude-upgrade')
    const normalizedBootstrap = bootstrap.replaceAll(/\s+/g, ' ').toLowerCase()
    const normalizedRepair = repair.replaceAll(/\s+/g, ' ').toLowerCase()
    const normalizedUpgrade = upgrade.replaceAll(/\s+/g, ' ').toLowerCase()
    for (const source of [normalizedBootstrap, normalizedRepair, normalizedUpgrade]) {
      expect(source).toContain('capture stdout. exit status `0` or `2` is a plan result')
      expect(source).toContain('validate captured stdout against the selected prelude plan schema and version')
      expect(source).toContain('treat the command as failed only when stdout is not a valid plan document.')
      expect(source).toContain('before any real target mutation')
      expect(source).toContain('isolated temporary copy or session replica that preserves the same repo-relative package inputs')
      expect(source).toContain('`pnpm-lock.yaml`')
      expect(source).toContain('only after explicit user authorization')
    }
    expect(normalizedBootstrap).toContain('diffs for all three files together')
    expect(normalizedBootstrap).toContain('apply its exact three-file changes to the real target and run `pnpm install`')
    expect(normalizedBootstrap).toContain('do not run `prelude apply` and do not approve an execution hash.')
    expect(normalizedRepair).toContain('generate and show the complete candidate `package.json` and `pnpm-lock.yaml` diff')
    expect(normalizedRepair).toContain('apply that exact candidate and run `pnpm install` only after explicit user authorization.')
    expect(repair).toContain('Never edit a path, block, JSON value, keyed item, or tree declared as a\n   managed Output.')
    expect(repair).toContain('run `prelude plan --json` only')
    expect(normalizedUpgrade).toContain('keep plan snapshots only in temporary or session storage, never in the target.')
    expect(normalizedUpgrade).toContain('show the complete candidate `package.json` and `pnpm-lock.yaml` diff')
    expect(normalizedUpgrade).toContain('apply that exact candidate and run `pnpm install` only after explicit user authorization.')
    expect(normalizedUpgrade).toContain('cleanup requires separate explicit user authorization')
    expect(normalizedUpgrade).toContain('do not approve an execution hash.')
  }))

  it.effect('does not restore retired lifecycle or local-state surfaces', () => Effect.gen(function* () {
    const source = (yield* Effect.all(skills.map(skill))).join('\n')
    expect(source).not.toMatch(/prelude (?:create|init|remove)|receipt|manifest|provider|TUI/i)
    expect(source).toContain('never create\n   `Target/.prelude/`')
  }))
})
