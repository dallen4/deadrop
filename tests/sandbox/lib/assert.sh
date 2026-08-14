# Assertions emit one tab-delimited, prefixed line on stdout. Not fd 3:
# podman forwards only stdio into a container, and a stdout marker also
# survives any CI log pipeline unchanged.

SANDBOX_FAILURES=0
SANDBOX_RESULT_PREFIX="##RESULT"

_emit() {
  printf '%s\t%s\t%s\t%s\n' "$SANDBOX_RESULT_PREFIX" "$1" "${SANDBOX_SCENARIO:-?}" "$2"
}

scenario() { SANDBOX_SCENARIO="$1"; }
pass() { _emit PASS "$1"; }
fail() { SANDBOX_FAILURES=$((SANDBOX_FAILURES + 1)); _emit FAIL "$1"; }
skip() { _emit SKIP "$1"; }

# Captures output without aborting — the scenario decides what a nonzero exit
# means.
run() {
  LAST_STDOUT=$("$@" 2>/tmp/sandbox-stderr) && LAST_STATUS=0 || LAST_STATUS=$?
  LAST_STDERR=$(cat /tmp/sandbox-stderr)
  return 0
}

run_ok() {
  run "$@"
  if [ "$LAST_STATUS" -eq 0 ]; then
    pass "$1 exited 0"
  else
    fail "$1 exited $LAST_STATUS: ${LAST_STDERR:-$LAST_STDOUT}"
  fi
}

run_fails() {
  run "$@"
  if [ "$LAST_STATUS" -ne 0 ]; then
    pass "$1 exited $LAST_STATUS as expected"
  else
    fail "$1 unexpectedly succeeded"
  fi
}

assert_file_exists() {
  if [ -f "$1" ]; then pass "$1 exists"; else fail "$1 missing"; fi
}

assert_executable() {
  if [ -x "$1" ]; then pass "$1 executable"; else fail "$1 not executable"; fi
}

assert_contains() {
  case "$1" in
    *"$2"*) pass "output contains '$2'" ;;
    *) fail "expected '$2' in: $(printf '%s' "$1" | tr '\n' ' ' | head -c 300)" ;;
  esac
}

assert_not_contains() {
  case "$1" in
    *"$2"*) fail "did not expect '$2' in output" ;;
    *) pass "output omits '$2'" ;;
  esac
}

assert_eq() {
  if [ "$1" = "$2" ]; then pass "$3"; else fail "$3 (expected '$2', got '$1')"; fi
}
