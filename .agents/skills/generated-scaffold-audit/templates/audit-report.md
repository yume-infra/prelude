# {{AUDIT_TITLE}}

## Scope

- Audit date: {{DATE_OR_SESSION}}
- Generator version or commit context: {{GENERATOR_CONTEXT}}
- Targets checked: {{PRESETS_OR_LINKED_TARGETS}}
- Audit boundary: {{WHAT_IS_IN_SCOPE_AND_OUT_OF_SCOPE}}

## Command Evidence

| Target | Command | Working directory / source | Exit code | Verdict | Duration / timeout | Notes |
|---|---|---|---:|---|---|---|
| {{target}} | `{{command}}` | `{{sanitized_cwd_or_source}}` | {{exit_code}} | {{pass_fail}} | {{duration_or_timeout}} | {{notes}} |

## Package Publishability Evidence

| Target package | Applicable? | Manifest fields checked | Pack command | Dist removed first? | Tarball artifacts observed | Verdict |
|---|---|---|---|---|---|---|
| {{package_target_or_not_applicable}} | {{yes_no_and_reason}} | {{exports_main_types_files_prepack_prepare}} | `{{pnpm_pack_command_or_na}}` | {{yes_no_na}} | {{dist_index_js_dist_index_dts_or_na}} | {{pass_fail_na}} |

## Sanitized Output Excerpts

### {{TARGET_OR_COMMAND}}

```text
{{short_sanitized_excerpt_showing_the_signal}}
```

Sanitization applied: {{repo_tmp_home_or_secret_redaction_notes}}

## Issue Classification

| Finding | Generated file locator or command/tooling surface | Classification | Why this classification fits | Build/lint/editor boundary |
|---|---|---|---|---|
| {{finding_summary}} | `{{path_or_command_surface}}` | {{classification_term}} | {{rationale}} | {{boundary_notes}} |

## Source Map and Durable Ownership

| Generated symptom | Likely durable owner | Owner type | Repair shape | Confidence | Downstream consumer |
|---|---|---|---|---|---|
| {{symptom}} | `{{template_partial_code_or_policy_path}}` | {{template/partial/json-config/package-policy/publishability-policy/lifecycle-policy/lint-strategy/dependency-build-warning/smoke-gate}} | {{proposed_repair_shape}} | {{high_medium_low}} | {{slice_requirement_or_future_owner}} |

## Negative-Test and Ambiguity Handling

- Missing scripts: {{how_missing_scripts_were_classified_without_inventing_generated_file_owners}}
- Missing pack evidence: {{how_unchecked_or_failed_publishability_was_handled}}
- Malformed output or unknown error shapes: {{how_malformed_output_was_handled}}
- Timeouts or partial command results: {{timeout_handling}}
- Ambiguous owners: {{fragment_partial_or_policy_ambiguity_and_first_inspection_target}}
- Build warnings versus lint failures: {{explicit_separation_notes}}

## Requirement and Decision Coverage

| Requirement / decision | Coverage in this audit | Evidence |
|---|---|---|
| {{requirement_or_decision_id}} | {{advanced/validated/not_applicable}} | {{command_or_report_evidence}} |

## Recommended Follow-Up

1. {{highest_priority_follow_up}}
2. {{next_follow_up}}
3. {{optional_follow_up}}

## Reader-Test Checklist

- [ ] A future agent can see which real generated outputs were checked.
- [ ] Build warnings are separated from lint failures.
- [ ] Full-preset lint evidence uses `lint --max-warnings=0` where lint is enabled.
- [ ] Minimal presets are treated as build-only unless a cited decision says otherwise.
- [ ] Dist-backed publishable targets include `pnpm pack --dry-run` evidence, or the report says why package publishability was out of scope.
- [ ] Each issue has a classification and durable owner or explicitly documented ambiguity.
- [ ] The report is useful without reading ignored generated project directories.
