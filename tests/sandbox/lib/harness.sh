# Sourced by every scenario. Knows nothing about podman, so these scripts run
# unchanged on a bare Linux CI runner.
#
# Contract, all set by the runner:
#   SANDBOX_MODE                    local | released
#   SANDBOX_SCRIPTS                 install.sh / install-desktop.sh under test
#   SANDBOX_PROFILE                 ubuntu | fedora
#   SANDBOX_PKG_REMOVE              profile-appropriate removal command
#   HOME                            fresh and writable
#
# local mode additionally sets, pointing at the on-host registry:
#   DEADROP_RELEASES_API            registry stand-in for GitHub Releases
#   DEADROP_RELEASES_DOWNLOAD_BASE  ditto, for asset downloads
#
# released mode sets neither, so the scripts fall back to their own GitHub
# defaults, and adds:
#   SANDBOX_PUBLIC_BASE             where users are told to curl the scripts from
#
# The registry runs outside the machine under test — a target that had to host
# its own file server wouldn't be a bare distro any more.

set -u

: "${SANDBOX_SCRIPTS:?not set}"
: "${SANDBOX_MODE:?not set}"

if [ "$SANDBOX_MODE" = "local" ]; then
  : "${DEADROP_RELEASES_API:?not set}"
  : "${DEADROP_RELEASES_DOWNLOAD_BASE:?not set}"
else
  : "${SANDBOX_PUBLIC_BASE:?not set}"
fi

# shellcheck source=./assert.sh
. "$(dirname "${BASH_SOURCE[0]}")/assert.sh"

released_mode() { [ "$SANDBOX_MODE" = "released" ]; }

# The script a user would actually run. local mode reads the working tree so
# unreleased changes are testable; released mode curls the published copy, which
# is the only way to catch a script that is fine in-repo but broken as served.
install_script() {
  local name="$1"
  if released_mode; then
    local dest="/tmp/published-$name"
    if [ ! -f "$dest" ]; then
      curl -fsSL "$SANDBOX_PUBLIC_BASE/$name" -o "$dest" || {
        fail "could not download $SANDBOX_PUBLIC_BASE/$name"
        return 1
      }
    fi
    printf '%s' "$dest"
  else
    printf '%s' "$SANDBOX_SCRIPTS/$name"
  fi
}

assert_registry_reachable() {
  local url
  if released_mode; then
    url="$SANDBOX_PUBLIC_BASE/install.sh"
  else
    url="$DEADROP_RELEASES_API"
  fi
  if curl -fsS "$url" -o /dev/null 2>&1; then
    pass "registry reachable"
  else
    fail "registry unreachable at $url"
  fi
}

finish() {
  [ "$SANDBOX_FAILURES" -eq 0 ] || exit 1
  exit 0
}
