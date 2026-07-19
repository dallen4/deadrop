#!/usr/bin/env bash
set -euo pipefail

REPO="dallen4/deadrop"
BINARY="deadrop"
INSTALL_DIR="${DEADROP_INSTALL_DIR:-$HOME/.local/bin}"

case "$(uname -s)" in
  Darwin) OS="darwin" ;;
  Linux)  OS="linux" ;;
  *) echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac

if [ "$OS" = "linux" ] && command -v ldconfig >/dev/null 2>&1; then
  if ! ldconfig -p | grep -q libsecret-1; then
    echo "deadrop requires libsecret for secure credential storage."
    echo "Install it with:"
    echo "  Ubuntu/Debian: sudo apt-get install -y libsecret-1-0"
    echo "  Fedora/RHEL:   sudo dnf install -y libsecret"
    echo "  Arch:          sudo pacman -S libsecret"
  fi
fi

case "$(uname -m)" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64)        ARCH="x64" ;;
  *) echo "Unsupported arch: $(uname -m)" >&2; exit 1 ;;
esac

RELEASE_JSON=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest") || {
  echo "No published deadrop release found (or network error)." >&2
  echo "See https://github.com/${REPO}/releases" >&2
  exit 1
}
TAG=$(printf '%s' "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')
[ -z "$TAG" ] && { echo "Could not determine latest release tag" >&2; exit 1; }

URL="https://github.com/${REPO}/releases/download/${TAG}/${BINARY}-${OS}-${ARCH}"

echo "Downloading deadrop ${TAG} (${OS}/${ARCH})..."

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

curl -fsSL --progress-bar "$URL" -o "$TMP/$BINARY"
curl -fsSL "${URL}.sha256" -o "$TMP/$BINARY.sha256" || {
  echo "Could not download checksum for verification" >&2
  exit 1
}

EXPECTED=$(awk '{print $1}' "$TMP/$BINARY.sha256")
if command -v sha256sum >/dev/null 2>&1; then
  ACTUAL=$(sha256sum "$TMP/$BINARY" | awk '{print $1}')
else
  ACTUAL=$(shasum -a 256 "$TMP/$BINARY" | awk '{print $1}')
fi
if [ -z "$EXPECTED" ] || [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "Checksum verification failed (expected ${EXPECTED:-<none>}, got ${ACTUAL})" >&2
  exit 1
fi
echo "Checksum verified."

chmod +x "$TMP/$BINARY"
mkdir -p "$INSTALL_DIR"
mv "$TMP/$BINARY" "$INSTALL_DIR/$BINARY"

echo "deadrop ${TAG} installed to ${INSTALL_DIR}/${BINARY}"

if ! command -v deadrop &>/dev/null; then
  if [ -t 1 ] && [ -z "${CI:-}" ] && [ -r /dev/tty ]; then
    SHELL_RC=""
    case "${SHELL:-}" in
      */zsh)  SHELL_RC="$HOME/.zshrc" ;;
      */bash) SHELL_RC="$HOME/.bashrc" ;;
      *)      SHELL_RC="$HOME/.profile" ;;
    esac
    printf "\n%s is not in your PATH. Add it now? [y/N] " "$INSTALL_DIR" >/dev/tty
    read -r REPLY </dev/tty
    if [[ "$REPLY" =~ ^[Yy]$ ]]; then
      echo "export PATH=\"${INSTALL_DIR}:\$PATH\"" >> "$SHELL_RC"
      echo "Added to ${SHELL_RC}. Run: source ${SHELL_RC}"
    else
      echo "Skipped. Add manually: export PATH=\"${INSTALL_DIR}:\$PATH\""
    fi
  else
    echo "${INSTALL_DIR} is not in your PATH."
    echo "Add manually: export PATH=\"${INSTALL_DIR}:\$PATH\""
  fi
fi
