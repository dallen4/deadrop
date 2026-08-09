# Sourced by every scenario. Knows nothing about podman, so these scripts run
# unchanged on a bare Linux CI runner.
#
# Contract, all set by the runner:
#   SANDBOX_SCRIPTS                 install.sh / install-desktop.sh under test
#   SANDBOX_PROFILE                 ubuntu | fedora
#   SANDBOX_PKG_REMOVE              profile-appropriate removal command
#   DEADROP_RELEASES_API            registry stand-in for GitHub Releases
#   DEADROP_RELEASES_DOWNLOAD_BASE  ditto, for asset downloads
#   HOME                            fresh and writable
#
# The registry runs outside the machine under test — a target that had to host
# its own file server wouldn't be a bare distro any more.

set -u

: "${SANDBOX_SCRIPTS:?not set}"
: "${DEADROP_RELEASES_API:?not set}"
: "${DEADROP_RELEASES_DOWNLOAD_BASE:?not set}"

# shellcheck source=./assert.sh
. "$(dirname "${BASH_SOURCE[0]}")/assert.sh"

assert_registry_reachable() {
  if curl -fsS "$DEADROP_RELEASES_API" -o /dev/null 2>&1; then
    pass "registry reachable"
  else
    fail "registry unreachable at $DEADROP_RELEASES_API"
  fi
}

finish() {
  [ "$SANDBOX_FAILURES" -eq 0 ] || exit 1
  exit 0
}
