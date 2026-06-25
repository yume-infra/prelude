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
  --dry-run             Rejected on the canonical create route in this slice
  --preset, --p         Removed; reusable shapes are complete CreateSpec files passed with --spec
  --install             Accepted for compatibility, not used by the canonical create route
  --no-install          Accepted for compatibility, not used by the canonical create route
  --git                 Accepted for compatibility, not used by the canonical create route
  --no-git              Accepted for compatibility, not used by the canonical create route
  --rollback            Accepted for compatibility, not used by the canonical create route
  --no-rollback         Accepted for compatibility, not used by the canonical create route
  --help, -h            Show this help message
  --version, -v         Show CLI version
`
