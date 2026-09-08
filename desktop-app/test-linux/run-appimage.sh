#!/usr/bin/env bash
# Runs the newest AppImage emitted by build-linux.sh.
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
desktop_dir="$(cd "$script_dir/.." && pwd)"

if [[ ! -d "$desktop_dir/dist" ]]; then
  echo "No AppImage found. Run build-linux.sh first." >&2
  exit 1
fi

appimage="$(find "$desktop_dir/dist" -maxdepth 1 -type f -name '*.AppImage' -printf '%T@ %p\n' | sort -nr | head -n 1 | cut -d' ' -f2-)"
if [[ -z "$appimage" ]]; then
  echo "No AppImage found. Run build-linux.sh first." >&2
  exit 1
fi

chmod u+x "$appimage"

# AppImages normally need libfuse2 to mount. In minimal distributions and
# containers, use the AppImage runtime's extraction mode instead.
if command -v ldconfig >/dev/null 2>&1 && ldconfig -p 2>/dev/null | grep -q 'libfuse.so.2'; then
  exec "$appimage"
fi

echo "libfuse.so.2 is unavailable; running through AppImage extraction mode."
extract_dir="$(mktemp -d "${TMPDIR:-/tmp}/retail-crm-appimage.XXXXXX")"
trap 'rm -rf "$extract_dir"' EXIT
(cd "$extract_dir" && "$appimage" --appimage-extract >/dev/null 2>&1)

# The explicit switch is only for this FUSE-less test fallback. Normal
# AppImage launches use the platform's regular Chromium sandbox.
"$extract_dir/squashfs-root/retail-crm-desktop" --no-sandbox
