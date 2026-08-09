#!/usr/bin/env bash
# install.sh, run the way a user runs it: on a machine with no toolchain,
# against an artifact built somewhere else.

. "$(dirname "$0")/../lib/harness.sh"

scenario "10-install-cli"

assert_registry_reachable

# No TTY here, which is the point — install.sh must not block on its PATH
# prompt in a pipe, a Dockerfile, or CI.
run_ok bash "$SANDBOX_SCRIPTS/install.sh"
INSTALL_OUT="$LAST_STDOUT$LAST_STDERR"

assert_contains "$INSTALL_OUT" "Checksum verified"
# ~/.local/bin is not on PATH in a bare container, so the manual instruction
# has to appear rather than the script silently succeeding.
assert_contains "$INSTALL_OUT" "is not in your PATH"

BIN="$HOME/.local/bin/deadrop"
assert_file_exists "$BIN"
assert_executable "$BIN"

# The assertion that matters: placement and mode bits prove nothing if the
# binary can't run on this distro.
run_ok "$BIN" --version
if printf '%s' "$LAST_STDOUT" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+'; then
  pass "--version printed a semver ($LAST_STDOUT)"
else
  fail "--version printed '$LAST_STDOUT', expected a semver"
fi

# A payload that doesn't match its checksum must abort, and must not leave a
# binary behind. The registry serves a corrupted copy under /tampered.
rm -f "$BIN"
run_fails env \
  DEADROP_RELEASES_DOWNLOAD_BASE="${DEADROP_RELEASES_DOWNLOAD_BASE%/download}/tampered" \
  bash "$SANDBOX_SCRIPTS/install.sh"
assert_contains "$LAST_STDERR" "Checksum verification failed"

if [ -f "$BIN" ]; then
  fail "install proceeded despite a checksum mismatch"
else
  pass "no binary installed after checksum failure"
fi

finish
