#!/bin/sh
# POSIX sh, not bash: the documented install is `curl ... | sh`, and /bin/sh is
# dash on Debian/Ubuntu. Keep this file free of bashisms.
set -eu

REPO="dallen4/deadrop"
APP_NAME="deadrop.app"
APP_PATH="/Applications/${APP_NAME}"
INSTALL_DIR="${DEADROP_INSTALL_DIR:-$HOME/.local/bin}"
APPIMAGE_PATH="${INSTALL_DIR}/deadrop-desktop.AppImage"

OS="$(uname -s)"
case "$OS" in
  Darwin|Linux) ;;
  *)
    # No POSIX shell runs natively on Windows (no PowerShell/cmd support) —
    # `deadrop desktop install` (Node, cross-platform) is the real Windows
    # install path for now. A native install-desktop.ps1 is a tracked
    # fast-follow, not built yet.
    echo "install-desktop.sh doesn't support ${OS}." >&2
    echo "On Windows, use \`deadrop desktop install\` (npm install -g deadrop, or the CLI installer) or download the build directly: https://github.com/${REPO}/releases" >&2
    exit 1
    ;;
esac

# Finding the right release (deadrop-desktop@* among a releases list shared
# with the CLI's deadrop@* tags) and then that release's own assets needs
# real JSON structure, not a flat grep extraction like install.sh does —
# jq is the standard tool for this.
if ! command -v jq >/dev/null 2>&1; then
  echo "install-desktop.sh requires jq. Install it with: brew install jq (macOS) or your distro's package manager (Linux)" >&2
  exit 1
fi

RELEASE_JSON=$(curl -fsSL "${DEADROP_RELEASES_API:-https://api.github.com/repos/${REPO}/releases}") || {
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

if [ "$OS" = "Darwin" ]; then
  # macOS ships a single universal .dmg — no arch suffix to match on.
  ASSET_SUFFIX=".dmg"
else
  # Tauri names Linux bundles `<product>_<version>_<arch>.AppImage`. Match
  # the arch too: selecting on `.AppImage` alone takes whichever build the
  # API lists first, which hands an x64 user an aarch64 binary the moment a
  # second Linux target is published.
  case "$(uname -m)" in
    x86_64)        ASSET_SUFFIX="_amd64.AppImage" ;;
    arm64|aarch64) ASSET_SUFFIX="_aarch64.AppImage" ;;
    *) echo "Unsupported arch: $(uname -m)" >&2; exit 1 ;;
  esac
fi

ASSET_URL=$(printf '%s' "$RELEASE" | jq -r --arg sfx "$ASSET_SUFFIX" '.assets[] | select(.name | endswith($sfx)) | .browser_download_url' | head -1)
SHA_URL=$(printf '%s' "$RELEASE" | jq -r --arg sfx "${ASSET_SUFFIX}.sha256" '.assets[] | select(.name | endswith($sfx)) | .browser_download_url' | head -1)

if [ -z "$ASSET_URL" ] || [ -z "$SHA_URL" ]; then
  echo "Release ${TAG} publishes no ${ASSET_SUFFIX} build (or its checksum) for $(uname -s)/$(uname -m)" >&2
  echo "See https://github.com/${REPO}/releases" >&2
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

ASSET_PATH="$TMP/deadrop${ASSET_SUFFIX}"
curl -fsSL --progress-bar "$ASSET_URL" -o "$ASSET_PATH"
curl -fsSL "$SHA_URL" -o "${ASSET_PATH}.sha256" || {
  echo "Could not download checksum for verification" >&2
  exit 1
}

EXPECTED=$(awk '{print $1}' "${ASSET_PATH}.sha256")
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL=$(sha256sum "$ASSET_PATH" | awk '{print $1}')
else
  ACTUAL=$(shasum -a 256 "$ASSET_PATH" | awk '{print $1}')
fi
if [ -z "$EXPECTED" ] || [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "Checksum verification failed (expected ${EXPECTED:-<none>}, got ${ACTUAL})" >&2
  exit 1
fi
echo "Checksum verified."

if [ "$OS" = "Darwin" ]; then
  ATTACH_OUTPUT=$(hdiutil attach "$ASSET_PATH" -nobrowse)
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
else
  # AppImages are self-contained — "installing" is just placing an
  # executable file, no package manager involved. Same ~/.local/bin
  # convention install.sh already uses for the CLI binary itself.
  chmod +x "$ASSET_PATH"
  mkdir -p "$INSTALL_DIR"
  mv "$ASSET_PATH" "$APPIMAGE_PATH"

  # Without a .desktop entry the AppImage never appears in the app menu.
  # Mirrors installDesktopEntry() in cli/lib/update/desktop-entry.ts.
  DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
  # Largest first — .DirIcon is only a 32x32 symlink.
  ICON_VALUE="$APPIMAGE_PATH"
  ICON_TMP=$(mktemp -d)
  for CANDIDATE in \
    "usr/share/icons/hicolor/256x256@2/apps/deadrop.png" \
    "usr/share/icons/hicolor/128x128/apps/deadrop.png" \
    ".DirIcon"; do
    (cd "$ICON_TMP" && "$APPIMAGE_PATH" --appimage-extract "$CANDIDATE" >/dev/null 2>&1) || continue
    [ -f "$ICON_TMP/squashfs-root/$CANDIDATE" ] || continue
    mkdir -p "${DATA_HOME}/icons/hicolor/256x256/apps"
    cp "$ICON_TMP/squashfs-root/$CANDIDATE" "${DATA_HOME}/icons/hicolor/256x256/apps/deadrop.png"
    ICON_VALUE="deadrop"
    break
  done
  rm -rf "$ICON_TMP"

  mkdir -p "${DATA_HOME}/applications"
  cat > "${DATA_HOME}/applications/deadrop.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=deadrop
GenericName=Secret Sharing
Comment=End-to-end encrypted secret sharing
Exec=${APPIMAGE_PATH}
Icon=${ICON_VALUE}
Terminal=false
Categories=Network;FileTransfer;
Keywords=secret;encryption;share;vault;
StartupWMClass=deadrop
EOF

  update-desktop-database "${DATA_HOME}/applications" >/dev/null 2>&1 || true
  gtk-update-icon-cache -q -t -f "${DATA_HOME}/icons" >/dev/null 2>&1 || true

  echo "deadrop desktop ${TAG} installed to ${APPIMAGE_PATH}"
  echo "Added to your application menu."
  echo "Unsigned build."

  if ! printf '%s' "$PATH" | tr ':' '\n' | grep -qx "$INSTALL_DIR"; then
    echo "${INSTALL_DIR} is not in your PATH — run it directly: ${APPIMAGE_PATH}"
  fi
fi
