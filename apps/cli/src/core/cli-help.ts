export const HELP_TEXT = `Usage:
  prelude --spec prelude.json --name my-project [--no-input]
  prelude --spec '{"topology":"single-package",...}' --name my-project [--no-input]
  prelude --spec prelude.json --print-spec
  prelude

Canonical CreateSpec:
  {
    "topology": "single-package",
    "package": {
      "id": "app",
      "name": "my-project",
      "capabilities": ["minimal-node-package"]
    },
    "rootCapabilities": [],
    "providers": [],
    "overrides": {}
  }

Options:
  --spec <file-or-json>  Complete canonical CreateSpec file path or inline JSON payload
  --name <project>      Target directory name for create
  --print-spec          Print the canonical CreateSpec and exit before generation
  --no-input            Disable prompts; requires --spec unless --print-spec is used with --spec
  --dry-run             Removed; use --print-spec to inspect canonical input
  --preset, --p         Removed; reusable shapes are complete CreateSpec files passed with --spec
  --install             Removed; dependency installation is outside create
  --no-install          Removed; dependency installation is outside create
  --git                 Removed; git setup is outside create
  --no-git              Removed; git setup is outside create
  --rollback            Removed; create uses the canonical write boundary
  --no-rollback         Removed; create uses the canonical write boundary
  --help, -h            Show this help message
  --version, -v         Show CLI version
`
