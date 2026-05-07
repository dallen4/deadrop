#!/usr/bin/env bash
set -euo pipefail

REPO="dallen4/deadrop"
BINARY="deadrop"
INSTALL_DIR="${DEADROP_INSTALL_DIR:-/usr/local/bin}"

case "$(uname -s)" in
  Darwin) OS="macos" ;;
  Linux)  OS="linux" ;;
  *) echo "Unsupported OS: $(uname -s)" >&2; exit 1 ;;
esac

case "$(uname -m)" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64)        ARCH="x64" ;;
  *) echo "Unsupported arch: $(uname -m)" >&2; exit 1 ;;
esac

VERSION=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
  | grep '"tag_name"' | head -1 | sed 's/.*"cli-v\([^"]*\)".*/\1/')
[ -z "$VERSION" ] && { echo "Could not determine latest version" >&2; exit 1; }

URL="https://github.com/${REPO}/releases/download/cli-v${VERSION}/${BINARY}-${VERSION}-${OS}-${ARCH}"

echo "Downloading deadrop v${VERSION} (${OS}/${ARCH})..."

TMP=$(mktemp -d)
trap "rm -rf $TMP" EXIT

curl -fsSL "$URL" -o "$TMP/$BINARY"
chmod +x "$TMP/$BINARY"

if [ -w "$INSTALL_DIR" ]; then
  mv "$TMP/$BINARY" "$INSTALL_DIR/$BINARY"
else
  sudo mv "$TMP/$BINARY" "$INSTALL_DIR/$BINARY"
  sudo chmod +x "$INSTALL_DIR/$BINARY"
fi

echo "deadrop v${VERSION} installed to ${INSTALL_DIR}/${BINARY}"

if ! command -v deadrop &>/dev/null; then
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
fi
