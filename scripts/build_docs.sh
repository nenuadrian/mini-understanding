#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

sh scripts/build-all.sh
python3 scripts/generate_mkdocs_apps.py
mkdocs build --strict

echo "Docs build complete: $ROOT_DIR/site"
