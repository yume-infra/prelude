# create-yume

## 0.2.3

### Patch Changes

- Publish the generated Husky lifecycle fix so lint-enabled generated projects keep hook installation working, keep `husky` visible to Knip, and avoid no-`.git` pack noise.

## 0.2.2

### Patch Changes

- Make generated dist-backed packages safer to publish by emitting ESM exports, running `pnpm build` before pack, avoiding Husky-generated prepare scripts, and removing redundant Knip dist ignores.

## 0.2.1

### Patch Changes

- Add maintainer-facing AI workflow infrastructure for release readiness, docs/spec sync, template source-map fixes, preset expansion planning, and skill improvement.

  This also records the existing skill audit and dogfood release-validation improvements so maintainers can trace the workflow changes included in this patch release.

## 0.2.0

### Minor Changes

- 1386cf3: Expand generated project support and release gates with Node, CLI, library, and pnpm workspace scaffold coverage, generated Knip/Taze maintenance tooling, persistent generated smoke output, and stricter release verification.

## 0.1.0

### Minor Changes

- 67138e4: Prepare the first 0.1.0 release with the current React/Vue scaffolding workflow, execution constraints, and documentation boundaries.
