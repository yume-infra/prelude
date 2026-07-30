import { NodeServices } from '@effect/platform-node'
import { describe, expect, layer } from '@effect/vitest'
import { Effect, FileSystem, Path } from 'effect'

const normativeDocuments = new Map([
  ['docs/README.md', 'active'],
  ['docs/CONTEXT.md', 'active'],
  ['docs/v2-harness-convergence-contract.md', 'active'],
  ['docs/adr/0018-control-handoff-separates-orchestration-from-target-adaptation.md', 'accepted'],
])

const classifiedReferences = new Map([
  ['docs/harness-convergence-goal.md', ['rationale', 'reference']],
  ['docs/multi-harness-convergence-architecture.md', ['rationale', 'reference']],
  ['docs/harness-module-contract.md', ['rationale', 'reference']],
  ['docs/harness-integration-lifecycle.md', ['rationale', 'reference']],
  ['docs/prelude-rebuild-plan.md', ['implementation-plan', 'completed']],
  ['docs/architecture-review.md', ['rationale', 'reference']],
  ['docs/architecture-handoff.md', ['history', 'historical']],
] as const)

function frontmatter(source: string): ReadonlyMap<string, string> {
  const closing = source.indexOf('\n---\n', 4)
  if (!source.startsWith('---\n') || closing < 0)
    return new Map()
  return new Map(source.slice(4, closing).split('\n').map((line) => {
    const separator = line.indexOf(':')
    return [line.slice(0, separator), line.slice(separator + 1).trim()]
  }))
}

describe('active documentation authority', () => {
  layer(NodeServices.layer)((it) => {
    it.effect('keeps one minimal normative V2 reading set in docs and AGENTS', () => Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = path.resolve(import.meta.dirname, '../../..')
      const agents = yield* fs.readFileString(path.join(root, 'AGENTS.md'))
      const index = yield* fs.readFileString(path.join(root, 'docs/README.md'))
      const required = agents.slice(agents.indexOf('Start with:'), agents.indexOf('Everything under'))

      for (const document of normativeDocuments.keys()) {
        expect(required).toContain(document)
        expect(index).toContain(`\`${document.replace('docs/', '')}\``)
      }
      for (const document of classifiedReferences.keys())
        expect(required).not.toContain(document)
      for (const document of classifiedReferences.keys())
        expect(index).toContain(`\`${document.replace('docs/', '')}\``)
      expect(index).toContain('Minimum Normative V2 Reading Set')
      expect(index).toContain('Consistency Checklist')
    }))

    it.effect('classifies every current or reference architecture document', () => Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = path.resolve(import.meta.dirname, '../../..')
      const expectedTopLevel = [
        ...normativeDocuments.keys(),
        ...classifiedReferences.keys(),
      ].filter(document => !document.startsWith('docs/adr/')).sort()
      const actualTopLevel = (yield* fs.readDirectory(path.join(root, 'docs')))
        .filter(entry => entry.endsWith('.md'))
        .map(entry => `docs/${entry}`)
        .sort()
      expect(actualTopLevel).toEqual(expectedTopLevel)

      for (const [document, status] of normativeDocuments) {
        const metadata = frontmatter(yield* fs.readFileString(path.join(root, document)))
        expect(metadata.get('classification'), document).toBe('normative-current')
        expect(metadata.get('status'), document).toBe(status)
      }
      for (const [document, [classification, status]] of classifiedReferences) {
        const source = yield* fs.readFileString(path.join(root, document))
        const metadata = frontmatter(source)
        expect(metadata.get('classification'), document).toBe(classification)
        expect(metadata.get('status'), document).toBe(status)
        expect(source, `${document} must link its current replacement`).toContain('v2-harness-convergence-contract.md')
      }

      const adrRoot = path.join(root, 'docs/adr')
      for (const entry of yield* fs.readDirectory(adrRoot)) {
        if (!entry.endsWith('.md'))
          continue
        const document = `docs/adr/${entry}`
        const metadata = frontmatter(yield* fs.readFileString(path.join(adrRoot, entry)))
        expect(metadata.get('classification'), document).toBe(entry.startsWith('0018-') ? 'normative-current' : 'rationale')
      }
    }))

    it.effect('keeps the closed Gate 1 description single-Harness and locally consistent', () => Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const root = path.resolve(import.meta.dirname, '../../..')
      const index = yield* fs.readFileString(path.join(root, 'docs/README.md'))
      const gate = index.slice(index.indexOf('## V2 Gate Baseline'), index.indexOf('## Explicit Absences'))

      expect(gate).toContain('Prelude and Effect Harness Artifacts')
      expect(gate).not.toContain('Psychogram Artifacts')
      expect(gate).not.toContain('two read-only Harness Module plans')
    }))
  })
})
