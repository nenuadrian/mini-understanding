#!/usr/bin/env python3

from __future__ import annotations

import shutil
from pathlib import Path


def collect_apps(dist_dir: Path) -> list[str]:
    apps: list[str] = []
    if not dist_dir.exists() or not dist_dir.is_dir():
        return apps

    for child in sorted(dist_dir.iterdir(), key=lambda path: path.name.lower()):
        if not child.is_dir():
            continue
        if (child / "index.html").exists():
            apps.append(child.name)
    return apps


def copy_dist_to_docs(dist_dir: Path, docs_dist_dir: Path) -> None:
    if docs_dist_dir.exists():
        shutil.rmtree(docs_dist_dir)
    if dist_dir.exists() and dist_dir.is_dir():
        shutil.copytree(dist_dir, docs_dist_dir)


def write_apps_page(apps: list[str], output_path: Path) -> None:
    lines: list[str] = [
        "# Apps",
        "",
        "Built demos discovered in `dist/`:",
        "",
    ]

    if not apps:
        lines.extend(
            [
                "No built apps found yet.",
                "",
                "Run: `sh scripts/build-all.sh` and regenerate docs.",
            ]
        )
    else:
        for app in apps:
            lines.append(f"- [{app}](dist/{app}/index.html)")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    dist_dir = repo_root / "dist"
    docs_dir = repo_root / "docs"
    docs_dist_dir = docs_dir / "dist"
    apps_page = docs_dir / "apps.md"

    copy_dist_to_docs(dist_dir, docs_dist_dir)
    apps = collect_apps(dist_dir)
    write_apps_page(apps, apps_page)

    print(f"Synced dist to docs: {docs_dist_dir}")
    print(f"Generated apps page: {apps_page} (apps={len(apps)})")


if __name__ == "__main__":
    main()
