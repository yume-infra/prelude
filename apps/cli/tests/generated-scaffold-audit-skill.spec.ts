import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const testsDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(testsDir, '../../..')
const skillRoot = path.join(repoRoot, '.agents/skills/generated-scaffold-audit')
const skillPath = path.join(skillRoot, 'SKILL.md')
const workflowRoute = 'workflows/audit-generated-output.md'
const workflowPath = path.join(skillRoot, workflowRoute)
const referenceRoutes = [
  'references/classification-vocabulary.md',
  'references/create-yume-generated-quality.md',
] as const
const templateRoute = 'templates/audit-report.md'
const generatedQualityDocPath = path.join(repoRoot, 'docs/working/phase2/generated-scaffold-quality.md')

function readProjectFile(filePath: string) {
  expect(existsSync(filePath), `${path.relative(repoRoot, filePath)} must exist`).toBe(true)

  return readFileSync(filePath, 'utf8')
}

function splitFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n(?<frontmatter>[\s\S]*?)\n---\n(?<body>[\s\S]*)$/)

  expect(match?.groups, 'SKILL.md must start with YAML frontmatter').toBeTruthy()

  return match!.groups as { frontmatter: string, body: string }
}

function expectXmlTags(label: string, content: string, tags: readonly string[]) {
  for (const tag of tags) {
    expect(content, `${label} must include <${tag}>`).toContain(`<${tag}>`)
    expect(content, `${label} must close </${tag}>`).toContain(`</${tag}>`)
  }
}

function expectPhrases(label: string, content: string, phrases: readonly string[]) {
  for (const phrase of phrases) {
    expect(content, `${label} must include ${phrase}`).toContain(phrase)
  }
}

describe('generated scaffold audit skill', () => {
  it('is a project-local skill with valid metadata and XML body structure', () => {
    const skill = readProjectFile(skillPath)
    const { frontmatter, body } = splitFrontmatter(skill)

    expect(frontmatter).toMatch(/^name: generated-scaffold-audit$/m)
    expect(frontmatter).toMatch(/^description: .+$/m)
    expect(frontmatter, 'description must include third-person trigger guidance').toContain('Use when')
    expect(frontmatter, 'description must not use first-person phrasing').not.toMatch(/\bI\b|\bmy\b|\bwe\b|\bour\b/i)
    expect(frontmatter, 'description must not use second-person phrasing').not.toMatch(/\byou\b|\byour\b/i)
    expect(body, 'SKILL.md body must not use markdown headings').not.toMatch(/^#{1,6}\s/m)
    expectXmlTags('SKILL.md', body, ['objective', 'quick_start', 'routing', 'reference_index', 'template_index', 'success_criteria'])
  })

  it('routes agents to the generated-output audit workflow file', () => {
    const skill = readProjectFile(skillPath)

    expect(skill, 'SKILL.md must route to the generated scaffold audit workflow').toContain(workflowRoute)
    expect(existsSync(workflowPath), `${workflowRoute} must exist next to SKILL.md`).toBe(true)
  })

  it('keeps the routed workflow as a concise XML-structured shell', () => {
    const workflow = readProjectFile(workflowPath)

    expect(workflow, 'workflow body must not use markdown headings').not.toMatch(/^#{1,6}\s/m)
    expectXmlTags('audit-generated-output.md', workflow, ['required_reading', 'process', 'success_criteria'])
  })

  it('ships reusable references and an audit report template', () => {
    const skill = readProjectFile(skillPath)
    const workflow = readProjectFile(workflowPath)

    for (const route of referenceRoutes) {
      const referencePath = path.join(skillRoot, route)
      const reference = readProjectFile(referencePath)

      expect(reference, `${route} must use XML reference structure`).toMatch(/^<overview>/)
      expect(reference, `${route} must avoid markdown headings`).not.toMatch(/^#{1,6}\s/m)
      expect(skill, `SKILL.md must index ${route}`).toContain(path.basename(route))
      expect(workflow, `workflow must load ${route}`).toContain(route)
    }

    const template = readProjectFile(path.join(skillRoot, templateRoute))

    expect(skill, 'SKILL.md must index the report template').toContain(templateRoute)
    expect(workflow, 'workflow must instruct agents to use the report template').toContain(templateRoute)
    expectPhrases('audit report template', template, [
      'Command Evidence',
      'Sanitized Output Excerpts',
      'Issue Classification',
      'Source Map and Durable Ownership',
      'Negative-Test and Ambiguity Handling',
      'Requirement and Decision Coverage',
      'ignored generated project directories',
    ])
  })

  it('preserves generated scaffold audit vocabulary and boundaries', () => {
    const corpus = [
      readProjectFile(skillPath),
      readProjectFile(workflowPath),
      ...referenceRoutes.map(route => readProjectFile(path.join(skillRoot, route))),
      readProjectFile(path.join(skillRoot, templateRoute)),
    ].join('\n')

    expectPhrases('skill corpus', corpus, [
      'real create-yume React and Vue scaffold output',
      'template whitespace',
      'unused imports / dead code',
      'framework lint semantics',
      'generated config policy',
      'dependency/build warning',
      'editor-only diagnostics',
      'templates, partials, JSON/config mutation, package policy, lint strategy, or dependency/build-warning owners',
      'Tailwind/lightningcss',
      'build warnings separate from lint failures',
      'minimal presets remain build-only',
      'lint --max-warnings=0',
      'eslint --fix',
    ])
  })

  it('documents the phase handoff to the project-local skill', () => {
    const doc = readProjectFile(generatedQualityDocPath)

    expect(doc, 'Phase 2 quality doc must point future agents to the reusable skill').toContain('.agents/skills/generated-scaffold-audit/SKILL.md')
    expect(doc, 'Phase 2 quality doc must tell agents not to recreate the audit process').toContain('不应重新发明审计流程')
  })
})
