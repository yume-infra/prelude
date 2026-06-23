#!/usr/bin/env python3
"""Check or update @sayoriqwq/prelude generated-template dependency literals with taze."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path


SOURCE_FILES = (
    Path("apps/cli/src/core/owners/scaffold-family.ts"),
    Path("apps/cli/src/core/owners/router.ts"),
    Path("apps/cli/src/core/owners/state-management.ts"),
    Path("apps/cli/src/core/workspace-bootstrap.ts"),
    Path("apps/cli/src/core/package-manager.ts"),
)

QUOTED_DEPENDENCY_ENTRY_RE = re.compile(
    r"(?P<key_quote>['\"])(?P<name>(?:@[A-Za-z0-9_.-]+/)?[A-Za-z0-9_.-]+)(?P=key_quote)"
    r"(?P<between>\s*:\s*)"
    r"(?P<value_quote>['\"])(?P<range>(?:[\^~])?\d[^'\"]*)(?P=value_quote)"
)
BARE_DEPENDENCY_ENTRY_RE = re.compile(
    r"(?<![\w'\".-])(?P<name>[A-Za-z][A-Za-z0-9_.-]*)(?P<between>\s*:\s*)"
    r"(?P<value_quote>['\"])(?P<range>(?:[\^~])?\d[^'\"]*)(?P=value_quote)"
)
BARE_DEPENDENCY_NAMES = {
    "effect",
    "eslint",
    "husky",
    "knip",
    "taze",
    "tsdown",
    "tsx",
    "turbo",
    "typescript",
}
PNPM_VERSION_RE = re.compile(r"(?P<prefix>\bversion:\s*['\"])(?P<version>\d+\.\d+\.\d+)(?P<suffix>['\"])")
PNPM_FIELD_RE = re.compile(r"(?P<prefix>\bpackageManager:\s*['\"]pnpm@)(?P<version>\d+\.\d+\.\d+)(?P<suffix>['\"])")


@dataclass(frozen=True)
class DependencyOccurrence:
    path: Path
    name: str
    current_range: str


@dataclass(frozen=True)
class Probe:
    dependencies: dict[str, str]
    package_manager_version: str | None
    occurrences: list[DependencyOccurrence]


def repo_root_from(start: Path) -> Path:
    current = start.resolve()
    for candidate in (current, *current.parents):
        if (candidate / "pnpm-workspace.yaml").is_file() and (candidate / "apps/cli").is_dir():
            return candidate
    raise SystemExit(f"Unable to find prelude repo root from {start}")


def collect_probe(repo: Path) -> Probe:
    dependencies: dict[str, str] = {}
    occurrences: list[DependencyOccurrence] = []
    package_manager_version: str | None = None

    for relative_path in SOURCE_FILES:
        path = repo / relative_path
        text = path.read_text(encoding="utf-8")

        for match in QUOTED_DEPENDENCY_ENTRY_RE.finditer(text):
            name = match.group("name")
            current_range = match.group("range")
            dependencies.setdefault(name, current_range)
            occurrences.append(DependencyOccurrence(relative_path, name, current_range))

        for match in BARE_DEPENDENCY_ENTRY_RE.finditer(text):
            name = match.group("name")
            if name not in BARE_DEPENDENCY_NAMES:
                continue
            current_range = match.group("range")
            dependencies.setdefault(name, current_range)
            occurrences.append(DependencyOccurrence(relative_path, name, current_range))

        if relative_path.name == "package-manager.ts":
            version_match = PNPM_VERSION_RE.search(text)
            if version_match:
                package_manager_version = version_match.group("version")

    if not dependencies:
        raise SystemExit("No dependency literals were found in covered source files.")

    return Probe(dependencies, package_manager_version, occurrences)


def write_probe_package_json(probe: Probe, directory: Path) -> Path:
    package_json = {
        "name": "prelude-template-dependency-probe",
        "private": True,
        "dependencies": dict(sorted(probe.dependencies.items())),
    }
    if probe.package_manager_version:
        package_json["packageManager"] = f"pnpm@{probe.package_manager_version}"

    path = directory / "package.json"
    path.write_text(f"{json.dumps(package_json, indent=2, sort_keys=False)}\n", encoding="utf-8")
    return path


def run_taze(repo: Path, probe_dir: Path, write: bool, force: bool) -> subprocess.CompletedProcess[str]:
    command = [
        "pnpm",
        "exec",
        "taze",
        "latest",
        "--cwd",
        str(probe_dir),
        "--include-locked",
        "--group",
    ]
    if force:
        command.append("--force")
    if write:
        command.append("--write")

    return subprocess.run(command, cwd=repo, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)


def read_probe_package_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def collect_updates(before: Probe, after_manifest: dict[str, object]) -> tuple[dict[str, str], str | None]:
    after_dependencies = after_manifest.get("dependencies")
    if not isinstance(after_dependencies, dict):
        raise SystemExit("Probe package.json lost its dependencies object after taze.")

    dependency_updates: dict[str, str] = {}
    for name, old_range in before.dependencies.items():
        new_range = after_dependencies.get(name)
        if isinstance(new_range, str) and new_range != old_range:
            dependency_updates[name] = new_range

    package_manager_update = None
    after_package_manager = after_manifest.get("packageManager")
    if isinstance(after_package_manager, str) and after_package_manager.startswith("pnpm@"):
        after_version = after_package_manager.removeprefix("pnpm@")
        if before.package_manager_version and after_version != before.package_manager_version:
            package_manager_update = after_version

    return dependency_updates, package_manager_update


def replace_dependency_literals(text: str, dependency_updates: dict[str, str]) -> str:
    def replace(match: re.Match[str]) -> str:
        name = match.group("name")
        new_range = dependency_updates.get(name)
        if new_range is None:
            return match.group(0)
        return (
            f"{match.group('key_quote')}{name}{match.group('key_quote')}"
            f"{match.group('between')}"
            f"{match.group('value_quote')}{new_range}{match.group('value_quote')}"
        )

    text = QUOTED_DEPENDENCY_ENTRY_RE.sub(replace, text)

    def replace_bare(match: re.Match[str]) -> str:
        name = match.group("name")
        if name not in BARE_DEPENDENCY_NAMES:
            return match.group(0)
        new_range = dependency_updates.get(name)
        if new_range is None:
            return match.group(0)
        return f"{name}{match.group('between')}{match.group('value_quote')}{new_range}{match.group('value_quote')}"

    return BARE_DEPENDENCY_ENTRY_RE.sub(replace_bare, text)


def replace_package_manager_literals(text: str, new_version: str | None) -> str:
    if new_version is None:
        return text
    text = PNPM_VERSION_RE.sub(lambda match: f"{match.group('prefix')}{new_version}{match.group('suffix')}", text)
    return PNPM_FIELD_RE.sub(lambda match: f"{match.group('prefix')}{new_version}{match.group('suffix')}", text)


def apply_updates(repo: Path, dependency_updates: dict[str, str], package_manager_update: str | None) -> list[Path]:
    changed: list[Path] = []
    for relative_path in SOURCE_FILES:
        path = repo / relative_path
        original = path.read_text(encoding="utf-8")
        updated = replace_dependency_literals(original, dependency_updates)
        if relative_path.name == "package-manager.ts":
            updated = replace_package_manager_literals(updated, package_manager_update)

        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed.append(relative_path)

    return changed


def print_summary(
    dependency_updates: dict[str, str],
    package_manager_update: str | None,
    changed_files: list[Path] | None = None,
) -> None:
    if not dependency_updates and package_manager_update is None:
        print("Generated-template dependencies are already up to date.")
        return

    print("Generated-template dependency updates:")
    for name, new_range in sorted(dependency_updates.items()):
        print(f"  {name}: {new_range}")
    if package_manager_update:
        print(f"  pnpm packageManager: pnpm@{package_manager_update}")
    if changed_files is not None:
        print("Updated source files:")
        for path in changed_files:
            print(f"  {path}")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=("check", "update"), default="check")
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="@sayoriqwq/prelude repository root or a child path")
    parser.add_argument("--keep-probe", action="store_true", help="keep the temporary probe directory for debugging")
    parser.add_argument("--no-force", action="store_true", help="do not pass --force to taze")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    repo = repo_root_from(args.repo)
    probe = collect_probe(repo)

    temp_dir = Path(tempfile.mkdtemp(prefix="prelude-template-deps-"))
    try:
      package_json_path = write_probe_package_json(probe, temp_dir)
      result = run_taze(repo, temp_dir, write=True, force=not args.no_force)
      print(result.stdout, end="")
      if result.returncode != 0 or " ERROR " in result.stdout or "\nERROR " in result.stdout:
          raise SystemExit(result.returncode or 2)

      after_manifest = read_probe_package_json(package_json_path)
      dependency_updates, package_manager_update = collect_updates(probe, after_manifest)

      if args.mode == "check":
          print_summary(dependency_updates, package_manager_update)
          return 1 if dependency_updates or package_manager_update else 0

      changed_files = apply_updates(repo, dependency_updates, package_manager_update)
      print_summary(dependency_updates, package_manager_update, changed_files)
      return 0
    finally:
        if args.keep_probe:
            print(f"Kept probe directory: {temp_dir}")
        else:
            shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
