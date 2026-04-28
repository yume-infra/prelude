import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testsDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(testsDir, '../../..')
const workingDocsRoot = path.join(repoRoot, 'docs/working')

const docs = {
  workingRoadmap: path.join(workingDocsRoot, 'roadmap.md'),
  phase2Roadmap: path.join(workingDocsRoot, 'phase2/roadmap.md'),
  phase2Quality: path.join(workingDocsRoot, 'phase2/generated-scaffold-quality.md'),
  phase3Roadmap: path.join(workingDocsRoot, 'phase3/roadmap.md'),
  phase4Roadmap: path.join(workingDocsRoot, 'phase4/roadmap.md'),
} as const

function readTrackedWorkingDoc(filePath: string) {
  const relativePath = path.relative(repoRoot, filePath)

  expect(relativePath, 'contract test must only read tracked working docs').toMatch(/^docs\/working\//)
  expect(relativePath, 'contract test must not read ignored GSD artifacts').not.toContain('.gsd')
  expect(relativePath, 'contract test must not read generated example artifacts').not.toContain('apps/examples/.generated')
  expect(existsSync(filePath), `${relativePath} must exist`).toBe(true)

  return readFileSync(filePath, 'utf8')
}

function expectPhrases(label: string, content: string, phrases: readonly string[]) {
  for (const phrase of phrases) {
    expect(content, `${label} must include ${phrase}`).toContain(phrase)
  }
}

function expectDependsOn(content: string, milestoneId: string, dependencies: readonly string[]) {
  for (const dependency of dependencies) {
    expect(
      content,
      `${milestoneId} must document depends_on ${dependency}`,
    ).toMatch(new RegExp(`${milestoneId}[\\s\\S]{0,320}depends_on[\\s\\S]{0,120}${dependency}`))
  }
}

describe('phase documentation alignment', () => {
  it('routes working-doc readers to Phase 2, Phase 3, and Phase 4 entrypoints', () => {
    const workingRoadmap = readTrackedWorkingDoc(docs.workingRoadmap)

    expectPhrases('working roadmap', workingRoadmap, [
      './phase2/roadmap.md',
      './phase3/roadmap.md',
      './phase4/roadmap.md',
    ])

    expect(readTrackedWorkingDoc(docs.phase2Roadmap), 'Phase 2 roadmap must be reachable').toContain('Phase 2')
    expect(readTrackedWorkingDoc(docs.phase3Roadmap), 'Phase 3 roadmap must be reachable').toContain('Phase 3')
    expect(readTrackedWorkingDoc(docs.phase4Roadmap), 'Phase 4 roadmap must be reachable').toContain('Phase 4')
  })

  it('keeps Phase 2 handoff connected to smoke gates and the generated scaffold audit skill', () => {
    const phase2Roadmap = readTrackedWorkingDoc(docs.phase2Roadmap)
    const phase2Quality = readTrackedWorkingDoc(docs.phase2Quality)
    const phase2 = `${phase2Roadmap}\n${phase2Quality}`

    expectPhrases('Phase 2 handoff', phase2, [
      'M005',
      'S04',
      'S05',
      'generated-scaffold-audit',
      'smoke:generated',
      'smoke:examples',
      '--max-warnings=0',
    ])

    expect(phase2, 'minimal preset lint policy must remain build-only').toMatch(/minimal preset[\s\S]{0,160}build-only/i)
    expect(phase2, 'Tailwind/lightningcss warnings must not be described as lint warnings').toMatch(/Tailwind[\s\S]{0,80}lightningcss[\s\S]{0,160}(build\/dependency warning|build warning|dependency warning)/i)
    expect(phase2, 'React Router static imports must stay closed unless a real smoke failure appears').toMatch(/React Router[\s\S]{0,160}(smoke failure|已关闭策略边界)/i)
    expect(phase2, 'JSON ordering strategy must stay closed unless a real smoke failure appears').toMatch(/JSON[\s\S]{0,160}(smoke failure|已关闭策略边界)/i)
  })

  it('documents M006-M009 with durable dependency language and verification expectations', () => {
    const phase3 = readTrackedWorkingDoc(docs.phase3Roadmap)
    const phase4 = readTrackedWorkingDoc(docs.phase4Roadmap)
    const corpus = `${phase3}\n${phase4}`

    expectPhrases('Phase 3 and 4 corpus', corpus, [
      'M006',
      'Structured Package Manifest Contributions',
      'M007',
      'Plan Preview and Dry Run',
      'M008',
      'Command Output Diagnostics',
      'M009',
      'Post-Generate File Task Normalization',
      'depends_on',
      'Verification expectations',
    ])

    expectDependsOn(corpus, 'M006', ['M005'])
    expectDependsOn(corpus, 'M007', ['M006'])
    expectDependsOn(corpus, 'M008', ['M005'])
    expectDependsOn(corpus, 'M009', ['M006', 'M008'])
    expect(corpus, 'M007 must warn against scheduling before M006').toMatch(/M007[\s\S]{0,240}(M006 未完成|等待 M006|depends_on M006)/i)
    expect(corpus, 'M009 must remain blocked while its dependencies are incomplete').toMatch(/M009[\s\S]{0,240}(draft|blocking)/i)
  })

  it('states the approved /gsd parallel start scheduling contract', () => {
    const corpus = [
      readTrackedWorkingDoc(docs.phase2Roadmap),
      readTrackedWorkingDoc(docs.phase3Roadmap),
      readTrackedWorkingDoc(docs.phase4Roadmap),
    ].join('\n')

    expectPhrases('parallel scheduling guidance', corpus, [
      '/gsd parallel start',
      'M006',
      'M008',
      'M007',
      'M009',
    ])

    expect(corpus, 'M006 and M008 must be documented as safe to run concurrently after M005').toMatch(/M005[\s\S]{0,160}M006[\s\S]{0,120}M008[\s\S]{0,120}(并行|concurrent|parallel)/i)
    expect(corpus, 'M007 must wait for M006').toMatch(/M007[\s\S]{0,120}(等待|waits?|depends_on)[\s\S]{0,120}M006/i)
    expect(corpus, 'M009 must wait for M006 plus M008').toMatch(/M009[\s\S]{0,160}(M006[\s\S]{0,120}M008|M008[\s\S]{0,120}M006)/i)
  })
})
