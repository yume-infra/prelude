# Generated Scaffold Audit Baseline

## 读者与目标

本文面向继续执行 Phase 2 生成项目质量修复的维护者和 agent。

读完后，读者应能完成一件事：基于真实生成项目的 `build` / `lint --max-warnings=0` 证据，判断当前 React / Vue scaffold 的失败类型，并把后续修复分流到 `S02`、`S03`、`S04` 或 `S05`。

## 审计范围

本次审计只覆盖当前已支持的 React / Vue preset：

- 临时 preset matrix：`react-minimal`、`react-full`、`vue-minimal`、`vue-full`。
- linked example smoke：`react-full-linked`、`vue-full-linked`。

审计原则：

- 先运行真实生成项目，再记录证据；本任务不修模板，也不手动 patch 生成物。
- `build` 与 `lint --max-warnings=0` 分开记录。
- `lint` 不使用 `--fix`；auto-fix 只能作为后续修复参考，不能成为 durable remediation。
- 临时生成项目已删除；linked example 生成项目位于 ignored workspace，不要求作为 tracked 输出保留。
- 输出摘录已做路径脱敏：仓库根写作 `<repo>`，临时 matrix 写作 `<tmp-matrix>`，用户 home 写作 `<home>`。

## 命令环境摘要

- 时间：2026-04-28 18:09–18:13 GMT+8。
- 仓库命令入口：`pnpm --filter create-yume build`。
- 生成入口：`node apps/cli/dist/index.js --preset <preset> --name <name> --no-install --no-git`。
- 临时项目安装：`pnpm install --ignore-scripts`。
- 临时项目验证：`pnpm build`，然后 `pnpm lint --max-warnings=0`。
- linked example 路径：先运行 `pnpm --filter create-yume smoke:examples`，再分别在生成项目中运行 `pnpm lint --max-warnings=0`。
- 超时边界：生成 120s，安装 300s，build/lint 180s，linked smoke 600s；本次没有 timeout。

## 命令状态总表

| Target | Generate / source command | Install | Build | Lint (`--max-warnings=0`) | 结论 |
|---|---:|---:|---:|---:|---|
| CLI entrypoint | `pnpm --filter create-yume build` | n/a | ✅ exit 0, 447ms | n/a | 当前 CLI dist 可用于审计。 |
| `react-minimal` | ✅ exit 0, 1010ms | ✅ exit 0, 38881ms | ✅ exit 0, 392ms | ❌ exit 254, 133ms | 生成项目没有 `lint` script；属于 generated config policy / package policy gap。 |
| `react-full` | ✅ exit 0, 890ms | ✅ exit 0, 9526ms | ✅ exit 0, 525ms；有 Tailwind/lightningcss warning | ❌ exit 1, 1986ms；53 errors | build 可用但 lint 不干净。 |
| `vue-minimal` | ✅ exit 0, 837ms | ✅ exit 0, 34061ms | ✅ exit 0, 562ms | ❌ exit 254, 144ms | 生成项目没有 `lint` script；属于 generated config policy / package policy gap。 |
| `vue-full` | ✅ exit 0, 885ms | ✅ exit 0, 21370ms | ✅ exit 0, 623ms；有 Tailwind/lightningcss warning | ❌ exit 1, 2047ms；49 errors / 12 warnings | build 可用但 lint 不干净。 |
| `react-full-linked` | `pnpm --filter create-yume smoke:examples` ✅ exit 0, 65897ms | smoke 内执行 | smoke 内 build ✅ | ❌ exit 1, 1741ms；52 errors | linked smoke 当前只证明 build，通过后 lint 仍失败。 |
| `vue-full-linked` | `pnpm --filter create-yume smoke:examples` ✅ exit 0, 65897ms | smoke 内执行 | smoke 内 build ✅ | ❌ exit 1, 1137ms；48 errors / 12 warnings | linked smoke 当前只证明 build，通过后 lint 仍失败。 |

Exit-code meaning：

- `0`：命令完成且工具认为通过。
- `1`：生成项目内 `eslint --max-warnings=0` 发现 errors 或 warnings。
- `254`：`pnpm lint --max-warnings=0` 找不到 `lint` script；不是源文件 lint 失败，而是 generated package policy 缺口。

## 高信号运行时证据

### CLI build

```text
> create-yume@0.0.1 build <repo>/apps/cli
> tsdown --config tsdown.config.ts

entry: src/index.ts
Granting execute permission to dist/index.js
dist/index.js  40.28 kB │ gzip: 12.08 kB
Build complete in 43ms
```

### `react-minimal`

Build 通过：

```text
> audit-react-minimal@0.0.0 build <tmp-matrix>/audit-react-minimal
> vite build

transforming...✓ 18 modules transformed.
dist/index.html                   0.47 kB │ gzip:  0.29 kB
dist/assets/index-DF8aenLs.css    0.87 kB │ gzip:  0.41 kB
dist/assets/index-DHmeruVU.js   191.17 kB │ gzip: 60.19 kB
✓ built in 101ms
```

Lint 失败：

```text
undefined
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "lint" not found
```

分类：`generated config policy`。最小 preset 生成物没有 `lint` script，因此无法满足统一的 audit gate。下游归属建议：`S03` 判断最小 preset 是否应携带 lint policy；`S04` 若提升 smoke gate，需要先处理缺失 script 的边界。

### `vue-minimal`

Build 通过：

```text
> audit-vue-minimal@0.0.0 build <tmp-matrix>/audit-vue-minimal
> vite build

transforming...✓ 20 modules transformed.
dist/index.html                  0.46 kB │ gzip:  0.30 kB
dist/assets/index-BNfv0vOF.css   0.62 kB │ gzip:  0.31 kB
dist/assets/index-9J32sFKN.js   60.50 kB │ gzip: 23.97 kB
✓ built in 158ms
```

Lint 失败：

```text
undefined
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "lint" not found
```

分类：`generated config policy`。与 `react-minimal` 同类，属于 package policy gap，而不是某个生成文件的 lint rule violation。

### `react-full`

Build 通过，但 Tailwind/lightningcss 输出 warning：

```text
[lightningcss minify] Unknown at rule: @theme
1  |  @layer theme, base, components, utilities;
2  |  @layer theme {
3  |    @theme default {
   |          ^

[lightningcss minify] Unknown at rule: @tailwind
796 |  }
797 |  @layer utilities {
798 |    @tailwind utilities;
    |             ^
```

Lint 失败摘要：

```text
<tmp-matrix>/audit-react-full/.vscode/settings.json
  50:2  error  Newline required at end of file but not found  style/eol-last

<tmp-matrix>/audit-react-full/README.md
  1:4  error  Newline required at end of file but not found  style/eol-last

<tmp-matrix>/audit-react-full/eslint.config.mjs
  4:1   error  Expected indentation of 2 spaces but found 6  style/indent
  4:8   error  Trailing spaces not allowed                   style/no-trailing-spaces
  6:21  error  Missing trailing comma                        style/comma-dangle

<tmp-matrix>/audit-react-full/package.json
   2:3  error  Expected object keys to be in specified order. 'dependencies' should be after 'version'     jsonc/sort-keys
  13:3  error  Expected object keys to be in specified order. 'description' should be after 'version'      jsonc/sort-keys

<tmp-matrix>/audit-react-full/src/routes/router.tsx
  error  Fast refresh only works when a file only exports components  react-refresh/only-export-components

<tmp-matrix>/audit-react-full/src/stores/counter.ts
  1:1  error  Expected 1 empty line after import statement not followed by another import  import/newline-after-import

<tmp-matrix>/audit-react-full/tsconfig.app.json
  error  Expected object keys to be in specified order  jsonc/sort-keys

<tmp-matrix>/audit-react-full/vite.config.ts
   2:1   error  Expected "@vitejs/plugin-react" to come before "vite"               perfectionist/sort-imports
   3:1   error  Expected "@tailwindcss/vite" to come before "@vitejs/plugin-react"  perfectionist/sort-imports
   8:1   error  Trailing spaces not allowed                                         style/no-trailing-spaces
  10:20  error  Missing trailing comma                                              style/comma-dangle

✖ 53 problems (53 errors, 0 warnings)
50 errors and 0 warnings potentially fixable with the `--fix` option.
```

初步分类：

| Finding | Affected generated files | Classification | Likely source owner | Downstream | Fix type |
|---|---|---|---|---|---|
| EOF / indentation / trailing spaces / comma style | `.vscode/settings.json`, `README.md`, `eslint.config.mjs`, `vite.config.ts` | `template whitespace` | static asset copy / fragment render / text mutation | `S02` | mechanical |
| Import and newline order | `vite.config.ts`, `src/stores/counter.ts` | `template whitespace` / generated code style | fragment render | `S02` | mechanical |
| JSON key ordering | `package.json`, `tsconfig*.json` | `generated config policy` | JSON mutation / config fragment policy | `S03` | rethink-required unless policy is to sort generated JSON |
| React Refresh component-export semantics | router module | `framework lint semantics` | React router capability owner | `S03` | rethink-required |
| Tailwind/lightningcss warnings during build | generated Tailwind CSS through Vite build | dependency/build warning | Tailwind/Vite build policy | `S03` | rethink-required |

### `vue-full`

Build 通过，但 Tailwind/lightningcss 输出 warning：

```text
[lightningcss minify] Unknown at rule: @theme
24 |  @layer theme, base, components, utilities;
25 |  @layer theme {
26 |    @theme default {
   |          ^

[lightningcss minify] Unknown at rule: @tailwind
819 |  }
820 |  @layer utilities {
821 |    @tailwind utilities;
    |             ^
```

Lint 失败摘要：

```text
<tmp-matrix>/audit-vue-full/.vscode/settings.json
  50:2  error  Newline required at end of file but not found  style/eol-last

<tmp-matrix>/audit-vue-full/README.md
  1:4  error  Newline required at end of file but not found  style/eol-last

<tmp-matrix>/audit-vue-full/eslint.config.mjs
  4:1  error  Expected indentation of 2 spaces but found 6  style/indent
  4:8  error  Trailing spaces not allowed                   style/no-trailing-spaces
  7:8  error  Missing trailing comma                        style/comma-dangle

<tmp-matrix>/audit-vue-full/package.json
  error  Expected object keys to be in specified order  jsonc/sort-keys

<tmp-matrix>/audit-vue-full/src/App.vue
  warning  Expected 1 line break after opening tag (`<RouterLink>`)  vue/singleline-html-element-content-newline

<tmp-matrix>/audit-vue-full/src/stores/counter.ts
   1:15  error  Expected "computed" to come before "ref"  perfectionist/sort-named-imports
   2:1   error  Expected "pinia" to come before "vue"     perfectionist/sort-imports
  21:14  error  Missing trailing comma                    style/comma-dangle

<tmp-matrix>/audit-vue-full/src/views/About.vue
   2:8   error  'Counter' is defined but never used       unused-imports/no-unused-imports
  14:27  error  A line break is required after '<style>'  vue/block-tag-newline

<tmp-matrix>/audit-vue-full/src/views/Home.vue
   7:1   error    Expected indentation of 4 spaces but found 2 spaces                  vue/html-indent
   8:1   error    Expected indentation of 6 spaces but found 2 spaces                  vue/html-indent
  11:9   error    Expected 1 line break before '</template>', but 2 line breaks found  vue/block-tag-newline
  12:1   error    Trailing spaces not allowed                                          style/no-trailing-spaces
  15:27  error    A line break is required after '<style>'                             vue/block-tag-newline

<tmp-matrix>/audit-vue-full/tsconfig*.json
  error  Expected object keys to be in specified order  jsonc/sort-keys

<tmp-matrix>/audit-vue-full/vite.config.ts
   2:1   error  Expected "@vitejs/plugin-vue" to come before "vite"               perfectionist/sort-imports
   3:1   error  Expected "@tailwindcss/vite" to come before "@vitejs/plugin-vue"  perfectionist/sort-imports
   9:1   error  Trailing spaces not allowed                                       style/no-trailing-spaces
  10:20  error  Missing trailing comma                                            style/comma-dangle

✖ 61 problems (49 errors, 12 warnings)
49 errors and 12 warnings potentially fixable with the `--fix` option.
```

初步分类：

| Finding | Affected generated files | Classification | Likely source owner | Downstream | Fix type |
|---|---|---|---|---|---|
| EOF / indentation / trailing spaces / comma style | `.vscode/settings.json`, `README.md`, `eslint.config.mjs`, `vite.config.ts`, Vue SFCs | `template whitespace` | static asset copy / fragment render | `S02` | mechanical |
| Import ordering and named import ordering | `vite.config.ts`, `src/stores/counter.ts` | `template whitespace` / generated code style | fragment render | `S02` | mechanical |
| Unused import | `src/views/About.vue` imports `Counter` but does not use it | `unused imports / dead code` | Vue view fragment | `S02` | mechanical |
| Vue template line-break semantics | `src/App.vue`, `src/views/Home.vue`, `src/views/About.vue` | `framework lint semantics` | Vue SFC template fragments | `S02` if just formatting; `S03` if rule policy conflicts with scaffold readability | mixed |
| JSON key ordering | `package.json`, `tsconfig*.json` | `generated config policy` | JSON mutation / config fragment policy | `S03` | rethink-required unless policy is to sort generated JSON |
| Tailwind/lightningcss warnings during build | generated Tailwind CSS through Vite build | dependency/build warning | Tailwind/Vite build policy | `S03` | rethink-required |

### `react-full-linked`

Linked smoke passed and generated/build both linked full examples. The additional lint command still failed:

```text
> react-full-linked@0.0.0 lint <repo>/apps/examples/.generated/react-full-linked
> eslint --max-warnings=0

<repo>/apps/examples/.generated/react-full-linked/README.md
  1:4  error  Newline required at end of file but not found  style/eol-last

<repo>/apps/examples/.generated/react-full-linked/eslint.config.mjs
  4:1   error  Expected indentation of 2 spaces but found 6  style/indent
  4:8   error  Trailing spaces not allowed                   style/no-trailing-spaces

<repo>/apps/examples/.generated/react-full-linked/package.json
  error  Expected object keys to be in specified order  jsonc/sort-keys

<repo>/apps/examples/.generated/react-full-linked/src/components/Counter.tsx
  error  Parentheses around JSX should be on separate lines

<repo>/apps/examples/.generated/react-full-linked/src/routes/router.tsx
  error  Fast refresh only works when a file only exports components  react-refresh/only-export-components

<repo>/apps/examples/.generated/react-full-linked/vite.config.ts
  error  Expected "@vitejs/plugin-react" to come before "vite"               perfectionist/sort-imports
  error  Expected "@tailwindcss/vite" to come before "@vitejs/plugin-react"  perfectionist/sort-imports

✖ 52 problems (52 errors, 0 warnings)
49 errors and 0 warnings potentially fixable with the `--fix` option.
```

与 `react-full` 的 issue family 一致；linked path 额外证明当前 smoke gate 没有覆盖 lint cleanliness。

### `vue-full-linked`

Linked smoke passed and generated/build both linked full examples. The additional lint command still failed:

```text
> vue-full-linked@0.0.0 lint <repo>/apps/examples/.generated/vue-full-linked
> eslint --max-warnings=0

<repo>/apps/examples/.generated/vue-full-linked/README.md
  1:4  error  Newline required at end of file but not found  style/eol-last

<repo>/apps/examples/.generated/vue-full-linked/eslint.config.mjs
  error  Expected indentation / no trailing spaces / missing trailing comma

<repo>/apps/examples/.generated/vue-full-linked/package.json
  error  Expected object keys to be in specified order  jsonc/sort-keys

<repo>/apps/examples/.generated/vue-full-linked/src/App.vue
  warning  Expected 1 line break after opening tag (`<RouterLink>`)  vue/singleline-html-element-content-newline

<repo>/apps/examples/.generated/vue-full-linked/src/views/About.vue
   2:8   error  'Counter' is defined but never used       unused-imports/no-unused-imports
  14:27  error  A line break is required after '<style>'  vue/block-tag-newline

<repo>/apps/examples/.generated/vue-full-linked/src/views/Home.vue
  error/warning  Vue template indentation, template closing line-break, trailing spaces, style block newline

<repo>/apps/examples/.generated/vue-full-linked/vite.config.ts
  error  import ordering, trailing spaces, comma style, missing trailing comma

✖ 60 problems (48 errors, 12 warnings)
48 errors and 12 warnings potentially fixable with the `--fix` option.
```

与 `vue-full` 的 issue family 一致；linked path 额外证明当前 smoke gate 没有覆盖 lint cleanliness。

## 横向问题清单

| Issue family | Observed in | Classification | Likely durable owner | Downstream consumer | Notes |
|---|---|---|---|---|---|
| Missing `lint` script | `react-minimal`, `vue-minimal` | `generated config policy` | generated package policy | `S03`, `S04` | `pnpm lint --max-warnings=0` exits 254 before source lint can run。 |
| README / settings EOF | full presets | `template whitespace` | static asset copy / fragment render | `S02` | Mechanical。 |
| ESLint config whitespace/comma style | full presets | `template whitespace` | generated ESLint config fragment | `S02` | Mechanical。 |
| Vite config import order and whitespace | full presets | `template whitespace` | Vite config fragment | `S02` | Mechanical unless import grouping policy is changed。 |
| JSON key order | full presets | `generated config policy` | package / tsconfig JSON mutation policy | `S03` | Rethink-required if generated JSON should preserve conventional order instead of lint order。 |
| React Refresh router export semantics | React full paths | `framework lint semantics` | React router capability owner | `S03` | Rethink-required：split component exports or scoped override。 |
| Vue SFC formatting | Vue full paths | `template whitespace` / `framework lint semantics` | Vue SFC fragments | `S02`, maybe `S03` | Most appears mechanical; rule/readability conflicts should go to `S03`。 |
| Vue unused import | Vue full paths | `unused imports / dead code` | Vue view fragment | `S02` | Mechanical。 |
| Tailwind/lightningcss build warnings | React/Vue full builds and linked smoke stderr | `dependency/build warning` | Tailwind / Vite build policy | `S03` | Build exit code remains 0; do not conflate with lint failure。 |
| Smoke gate lacks lint | linked full examples | `generated config policy` / smoke policy | linked smoke flow | `S04` | `smoke:examples` passes while generated lint fails。 |

## Failure handling notes

- Registry/network instability was visible but non-fatal: installs emitted `ECONNRESET` / long request warnings for registry access, then completed successfully. These are environment/dependency observations, not generated-file failures.
- No command timed out.
- No command output was malformed enough to prevent classification.
- Missing `lint` scripts are recorded as baseline gaps instead of being skipped.

## Relationship to Phase 2 slices

- `S02` should consume mechanical `template whitespace`, import order, unused import, and obvious generated style issues.
- `S03` should consume rethink-required `framework lint semantics`, `generated config policy`, and `dependency/build warning` findings.
- `S04` should consume the linked smoke gap: build smoke passes even when `lint --max-warnings=0` fails.
- `S05` should consume this report as vocabulary/examples for a reusable generated-scaffold audit workflow.

## Reader-test checklist

A cold maintainer can use this report to answer:

- Which generated projects were audited? All four preset-matrix projects plus both linked full examples are represented.
- Were build and lint recorded separately? Yes; full preset builds pass with Tailwind/lightningcss warnings, while lint fails separately.
- Was lint run with `--max-warnings=0`? Yes; every lint command in this report used that flag.
- Are generated workspaces required to remain on disk? No; the temp matrix was deleted, and linked examples are ignored generated workspaces.
- Is durable remediation performed here? No; this is evidence only.
