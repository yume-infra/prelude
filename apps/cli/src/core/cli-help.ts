export const HELP_TEXT = `Usage:
  create-yume --preset react-minimal --name my-app [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset react-full --name my-app [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset vue-minimal --name my-app [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset vue-full --name my-app [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset workspace-root --name my-workspace [--install | --no-install] [--git | --no-git] [--dry-run]

Options:
  --preset, --p <preset> Project preset combination: react-minimal | react-full | vue-minimal | vue-full | workspace-root
  --name <project>      Target project name (letters, numbers, hyphens, underscores)
  --install             Run pnpm install after generation
  --no-install          Skip pnpm install after generation
  --git                 Force Git initialization on
  --no-git              Force Git initialization off
  --dry-run             Print the PlanSpec preview without writing files or running commands
  --rollback            Remove generated files if generation fails (default)
  --no-rollback         Keep generated files when generation fails
  --help, -h            Show this help message
  --version, -v         Show CLI version
`
