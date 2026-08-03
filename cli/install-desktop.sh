#!/usr/bin/env bash
set -euo pipefail

REPO="dallen4/deadrop"
APP_NAME="deadrop.app"
APP_PATH="/Applications/${APP_NAME}"

if [ "$(uname -s)" != "Darwin" ]; then
  echo "deadrop desktop is currently macOS-only." >&2
  exit 1
fi

# Finding the right release (deadrop-desktop@* among a releases list shared
# with the CLI's deadrop@* tags) and then that release's own .dmg/.sha256
# assets needs real JSON structure, not a flat grep extraction like
# install.sh does — jq is the standard tool for this.
if ! command -v jq >/dev/null 2>&1; then
  echo "install-desktop.sh requires jq. Install it with: brew install jq" >&2
  exit 1
fi

RELEASE_JSON=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases") || {
  echo "No published deadrop desktop release found (or network error)." >&2
  echo "See https://github.com/${REPO}/releases" >&2
  exit 1
}

RELEASE=$(printf '%s' "$RELEASE_JSON" | jq -c '[.[] | select(.tag_name | startswith("deadrop-desktop@"))][0]')
if [ "$RELEASE" = "null" ] || [ -z "$RELEASE" ]; then
  echo "No published deadrop desktop release found." >&2
  echo "See https://github.com/${REPO}/releases" >&2
  exit 1
fi

TAG=$(printf '%s' "$RELEASE" | jq -r '.tag_name')
DMG_URL=$(printf '%s' "$RELEASE" | jq -r '.assets[] | select(.name | endswith(".dmg")) | .browser_download_url' | head -1)
SHA_URL=$(printf '%s' "$RELEASE" | jq -r '.assets[] | select(.name | endswith(".dmg.sha256")) | .browser_download_url' | head -1)

if [ -z "$DMG_URL" ] || [ -z "$SHA_URL" ]; then
  echo "Could not find a .dmg (or its checksum) on release ${TAG}" >&2
  exit 1
fi

echo "Downloading deadrop desktop ${TAG}..."

TMP=$(mktemp -d)
MOUNT_POINT=""
cleanup() {
  [ -n "$MOUNT_POINT" ] && hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
  rm -rf "$TMP"
}
trap cleanup EXIT

curl -fsSL --progress-bar "$DMG_URL" -o "$TMP/deadrop.dmg"
curl -fsSL "$SHA_URL" -o "$TMP/deadrop.dmg.sha256" || {
  echo "Could not download checksum for verification" >&2
  exit 1
}

EXPECTED=$(awk '{print $1}' "$TMP/deadrop.dmg.sha256")
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL=$(sha256sum "$TMP/deadrop.dmg" | awk '{print $1}')
else
  ACTUAL=$(shasum -a 256 "$TMP/deadrop.dmg" | awk '{print $1}')
fi
if [ -z "$EXPECTED" ] || [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "Checksum verification failed (expected ${EXPECTED:-<none>}, got ${ACTUAL})" >&2
  exit 1
fi
echo "Checksum verified."

ATTACH_OUTPUT=$(hdiutil attach "$TMP/deadrop.dmg" -nobrowse)
MOUNT_POINT=$(printf '%s' "$ATTACH_OUTPUT" | grep -o '/Volumes/[^[:space:]]*' | head -1)
if [ -z "$MOUNT_POINT" ]; then
  echo "Could not determine hdiutil mount point" >&2
  exit 1
fi

if [ -d "$APP_PATH" ]; then
  rm -rf "$APP_PATH"
fi
ditto "${MOUNT_POINT}/${APP_NAME}" "$APP_PATH"

hdiutil detach "$MOUNT_POINT" -quiet
MOUNT_POINT=""

echo "deadrop desktop ${TAG} installed to ${APP_PATH}"
echo "Unsigned build — the first launch may show an \"unidentified developer\" warning; right-click the app and choose Open."
