export const HELP_TEXT = `Usage:
  create-yume --preset standalone-react-minimal --name my-app [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset standalone-react-full --name my-app [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset standalone-vue-minimal --name my-app [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset standalone-vue-full --name my-app [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset workspace-root-minimal --name my-workspace [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset workspace-cli-library --name my-tool-workspace [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset workspace-fullstack-react --name my-workspace [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset workspace-fullstack-vue --name my-workspace [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset standalone-library-minimal --name my-lib [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset standalone-library-node --name my-node-lib [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset standalone-backend-minimal --name my-app [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset standalone-backend-full --name my-app [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset standalone-cli-minimal --name my-tool [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset standalone-cli-effect --name my-tool [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --preset standalone-cli-full --name my-tool [--install | --no-install] [--git | --no-git] [--dry-run]
  create-yume --spec create-yume.json --name my-workspace [--dry-run] [--no-input]
  create-yume --preset standalone-react-full --name my-app --print-spec

Options:
  --preset, --p <preset> Project preset combination:
                         standalone-react-minimal | standalone-react-full | standalone-vue-minimal | standalone-vue-full
                         workspace-root-minimal | workspace-cli-library | workspace-fullstack-react | workspace-fullstack-vue
                         standalone-library-minimal | standalone-library-node | standalone-backend-minimal | standalone-backend-full
                         standalone-cli-minimal | standalone-cli-effect | standalone-cli-full
                         compatibility aliases: react-minimal | react-full | vue-minimal | vue-full | workspace-root | node-minimal | cli-minimal | cli-effect
  --spec <file-or-json>  Structured create spec file path or inline JSON payload
  --name <project>      Target project name (letters, numbers, hyphens, underscores)
  --install             Run pnpm install after generation
  --no-install          Skip pnpm install after generation
  --git                 Force Git initialization on
  --no-git              Force Git initialization off
  --dry-run             Print the PlanSpec preview without writing files or running commands
  --print-spec          Print the resolved create spec and exit before generation
  --no-input            Disable prompts; requires complete --preset/--name or --spec/--name input
  --rollback            Remove generated files if generation fails (default)
  --no-rollback         Keep generated files when generation fails
  --help, -h            Show this help message
  --version, -v         Show CLI version
`
