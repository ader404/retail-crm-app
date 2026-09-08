#!/usr/bin/env bash
# Builds a Linux AppImage with the same self-contained service bundle as Windows.
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$script_dir/../.." && pwd)"
desktop_dir="$project_dir/desktop-app"

for command in node npm; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command" >&2
    exit 1
  fi
done

echo "[1/5] Installing desktop dependencies"
(cd "$desktop_dir" && npm install)

echo "[2/5] Installing and preparing backend"
(cd "$project_dir/backend" && npm install && npx prisma generate && npm run build)

echo "[3/5] Installing and building frontend standalone server"
(cd "$project_dir/frontend" && npm install && NEXT_TELEMETRY_DISABLED=1 npm run build)

echo "[4/5] Packaging Linux AppImage"
(cd "$desktop_dir" && npm run dist:linux)

echo "[5/5] Linux build complete"
find "$desktop_dir/dist" -maxdepth 1 -type f -name '*.AppImage' -print
