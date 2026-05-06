export const PnpmPackageManager = {
  name: 'pnpm',
  version: '10.12.4',
  packageManager: 'pnpm@10.12.4',
} as const

type PackageManagerName = typeof PnpmPackageManager.name

export interface PackageManagerCommandSpec {
  readonly command: PackageManagerName
  readonly args: readonly string[]
}

export function getPackageManagerField(): string {
  return PnpmPackageManager.packageManager
}

export function packageManagerInstallCommand(): PackageManagerCommandSpec {
  return {
    command: PnpmPackageManager.name,
    args: ['install'],
  }
}

export function packageManagerAddDevCommand(packageName: string): PackageManagerCommandSpec {
  return {
    command: PnpmPackageManager.name,
    args: ['add', '-D', packageName],
  }
}

export function packageManagerExecCommand(...args: readonly string[]): PackageManagerCommandSpec {
  return {
    command: PnpmPackageManager.name,
    args: ['exec', ...args],
  }
}

export function packageManagerInvokeCommand(...args: readonly string[]): PackageManagerCommandSpec {
  return {
    command: PnpmPackageManager.name,
    args,
  }
}

export function formatPackageManagerCommand(command: PackageManagerCommandSpec): string {
  return [command.command, ...command.args].join(' ')
}
