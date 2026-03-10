#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/../projects" && pwd)"
ROOT_DIST="$ROOT_DIR/../dist"

echo "Preparing root dist folder at: $ROOT_DIST"
rm -rf "$ROOT_DIST"
mkdir -p "$ROOT_DIST"

PROJECT_LIST_FILE="$(mktemp)"
find "$ROOT_DIR" -mindepth 1 -maxdepth 1 -type d \
  ! -name ".git" \
  ! -name "dist" \
  -exec test -f "{}/package.json" ';' -print \
| sort > "$PROJECT_LIST_FILE"

if [ ! -s "$PROJECT_LIST_FILE" ]; then
  echo "No npm project folders found in $ROOT_DIR"
  rm -f "$PROJECT_LIST_FILE"
  exit 0
fi

while IFS= read -r project_path; do
  project_name="$(basename "$project_path")"

  echo ""
  echo "=== Building $project_name ==="
  (
    cd "$project_path"
    cp $ROOT_DIR/../vite.config.ts .
    rm .env.example
    npm install
    npm run build
  )

  project_dist="$project_path/dist"
  target_dist="$ROOT_DIST/$project_name"

  if [ ! -d "$project_dist" ]; then
    echo "Error: expected dist folder not found for $project_name at $project_dist"
    rm -f "$PROJECT_LIST_FILE"
    exit 1
  fi

  rm -rf "$target_dist"
  mv "$project_dist" "$target_dist"
  echo "Collected build output -> $target_dist"
done < "$PROJECT_LIST_FILE"

rm -f "$PROJECT_LIST_FILE"

echo ""
echo "All builds completed. Aggregated dist folders in: $ROOT_DIST"
