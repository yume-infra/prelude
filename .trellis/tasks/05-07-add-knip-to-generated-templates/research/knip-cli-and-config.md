# Knip CLI and Config Notes

## Source

- <https://knip.dev/reference/cli>
- <https://knip.dev/reference/configuration>

## Findings

- Knip is already designed to run as a package script via its CLI; the CLI accepts config discovery through `knip.json`, `knip.jsonc`, `.knip.json`, `.knip.jsonc`, `knip.js`, `knip.ts`, or `package.json#knip`.
- The CLI also accepts `--config`, but that is primarily for alternate config paths. Generated projects should prefer default config discovery unless there is a strong reason to hide the config in a non-standard path.
- Knip supports issue filters such as `--include`, `--exclude`, and shortcuts like `--dependencies`, `--exports`, and `--files`, but project defaults are better expressed in config so CI and local runs share behavior.
- Knip config supports root/workspace settings, entry/project patterns, plugins, filters, ignore options, and config hints. The docs recommend avoiding broad `ignore` patterns where entry/project configuration or production mode can express intent more precisely.
- Exit codes are suitable for quality gates: `0` means no issues, `1` means Knip found lint issues, and `2` means bad input or internal error.

## Implication for create-yume

- Generated `package.json` should use a simple script such as `knip` and, for broad gates, include it in `verify` rather than only exposing an ad-hoc one-off command.
- Dependency/script injection belongs in package manifest contributions, not Handlebars `package.json` templates.
- A generated Knip config file, if needed, should be a root-scoped fixed fragment such as `knip.jsonc.hbs` or `knip.ts.hbs`, owned by workspace/bootstrap/tooling policy.
- CLI flags are useful for focused developer commands, but a maintainable generated baseline should not encode the whole policy only in script flags.
