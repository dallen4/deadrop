# The only container-aware file. Scenarios depend on the env contract in
# harness.sh, never on podman, so they lift onto a bare CI runner unchanged.

SANDBOX_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$SANDBOX_DIR/../.." && pwd)"
WORK="$SANDBOX_DIR/.work"
LOGS="$SANDBOX_DIR/.logs"

# local:    build from the working tree, serve from an on-host registry.
# released: no build, no registry — curl the published scripts and install the
#           real GitHub release, which is the only way to catch breakage that
#           exists in what users are served rather than in the working tree.
SANDBOX_MODE="local"
SANDBOX_PUBLIC_BASE="${SANDBOX_PUBLIC_BASE:-https://deadrop.io}"

BUILDER_IMAGE="deadrop-sandbox-builder"
TARGET_IMAGE_PREFIX="deadrop-sandbox"

# Dummy values: install mechanics never reach the network beyond the registry,
# but cli/scripts/bun-build.ts hard-exits without these.
BUILD_ENV=(
  -e HUSKY=0
  -e DEADROP_API_URL=http://127.0.0.1:9/api
  -e DEADROP_APP_URL=http://127.0.0.1:9
  -e PEER_SERVER_URL=http://127.0.0.1:9/peers
  -e CLERK_PUBLISHABLE_KEY=pk_test_sandbox
  -e TURN_USERNAME=sandbox
  -e TURN_PWD=sandbox
)

die() { printf '%s\n' "$*" >&2; exit 2; }

# Pin every build and run to the host arch — a base image cached from an
# emulated pull would otherwise be picked up silently.
host_platform() {
  case "$(podman info --format '{{.Host.Arch}}')" in
    arm64|aarch64) printf 'linux/arm64' ;;
    *) printf 'linux/amd64' ;;
  esac
}

doctor() {
  command -v podman >/dev/null 2>&1 || die "podman is not installed.
  Fix: brew install podman"

  podman machine inspect >/dev/null 2>&1 || die "no podman machine.
  Fix: podman machine init --cpus 4 --memory 4096 --disk-size 40"

  podman info >/dev/null 2>&1 || die "podman machine is not running.
  Fix: podman machine start"

  printf 'podman %s, machine running, arch %s\n' \
    "$(podman version --format '{{.Client.Version}}')" \
    "$(podman info --format '{{.Host.Arch}}')"
}

build_image() {
  local name="$1" file="$2"
  podman build -q --platform "$(host_platform)" -t "$name" \
    -f "$SANDBOX_DIR/images/$file" "$REPO_ROOT" \
    >/dev/null || die "image build failed: $file"
}

# Produces the artifacts a release would, in a container with a toolchain —
# never in the one under test.
build_artifacts() {
  local arch artifact
  arch=$(podman info --format '{{.Host.Arch}}')
  [ "$arch" = "arm64" ] && arch=arm64 || arch=x64
  artifact="deadrop-linux-${arch}"

  rm -rf "$WORK/artifacts"
  mkdir -p "$WORK/artifacts/download/deadrop@0.0.0-sandbox" \
           "$WORK/artifacts/tampered/deadrop@0.0.0-sandbox"

  build_image "$BUILDER_IMAGE" Containerfile.builder

  podman run --rm --platform "$(host_platform)" "${BUILD_ENV[@]}" \
    -v "$REPO_ROOT:/src:ro" \
    -v "$WORK/artifacts/download/deadrop@0.0.0-sandbox:/out" \
    "$BUILDER_IMAGE" bash -c '
      set -euo pipefail
      cd /src
      tar -cf - --exclude=node_modules --exclude=.git --exclude=dist \
                --exclude=.next --exclude=target . | (cd /build && tar -xf -)
      cd /build/cli
      pnpm compile >/dev/null
      cp dist/deadrop /out/'"$artifact"'
      cd /out && sha256sum '"$artifact"' > '"$artifact"'.sha256
    ' || die "artifact build failed"

  # Same bytes with one flipped, so the checksum genuinely mismatches.
  cp "$WORK/artifacts/download/deadrop@0.0.0-sandbox/$artifact.sha256" \
     "$WORK/artifacts/tampered/deadrop@0.0.0-sandbox/"
  cp "$WORK/artifacts/download/deadrop@0.0.0-sandbox/$artifact" \
     "$WORK/artifacts/tampered/deadrop@0.0.0-sandbox/"
  printf 'tampered' >> "$WORK/artifacts/tampered/deadrop@0.0.0-sandbox/$artifact"

  # install.sh greps tag_name out of this, so only that field has to be real.
  cat > "$WORK/artifacts/releases" <<'JSON'
[{"tag_name": "deadrop@0.0.0-sandbox", "assets": []}]
JSON

  ARTIFACT_NAME="$artifact"
}

# Serves artifacts from the host: a target that hosted its own file server
# wouldn't be a bare distro any more.
start_registry() {
  REGISTRY_PORT=$(awk 'BEGIN{srand();print int(18000+rand()*2000)}')
  (cd "$WORK/artifacts" && python3 -m http.server "$REGISTRY_PORT" \
    --bind 127.0.0.1 >/dev/null 2>&1) &
  REGISTRY_PID=$!

  local i
  for i in $(seq 1 50); do
    curl -fsS "http://127.0.0.1:${REGISTRY_PORT}/releases" -o /dev/null 2>/dev/null && return 0
    sleep 0.1
  done
  die "registry failed to start on port $REGISTRY_PORT"
}

stop_registry() {
  [ -n "${REGISTRY_PID:-}" ] && kill "$REGISTRY_PID" 2>/dev/null
  REGISTRY_PID=""
}

run_scenario() {
  local profile="$1" scenario="$2" name log
  name=$(basename "$scenario" .sh)
  log="$LOGS/$RUN_ID/$profile/$name.log"
  mkdir -p "$(dirname "$log")"

  local pkg_remove="apt-get remove -y"
  [ "$profile" = "fedora" ] && pkg_remove="dnf remove -y"

  # released mode deliberately passes no DEADROP_RELEASES_* overrides, so the
  # scripts use their own GitHub defaults — the real user path.
  local -a mode_env
  if [ "$SANDBOX_MODE" = "released" ]; then
    mode_env=(-e SANDBOX_PUBLIC_BASE="$SANDBOX_PUBLIC_BASE")
  else
    local base="http://host.containers.internal:${REGISTRY_PORT}"
    mode_env=(
      -e DEADROP_RELEASES_API="$base/releases"
      -e DEADROP_RELEASES_DOWNLOAD_BASE="$base/download"
    )
  fi

  local started ended
  started=$(date +%s)

  podman run --rm --platform "$(host_platform)" \
    --user sandbox \
    -e HOME=/home/sandbox \
    -e SANDBOX_SCRIPTS=/scripts \
    -e SANDBOX_MODE="$SANDBOX_MODE" \
    -e SANDBOX_PROFILE="$profile" \
    -e SANDBOX_PKG_REMOVE="$pkg_remove" \
    "${mode_env[@]}" \
    -v "$REPO_ROOT/cli:/scripts:ro" \
    -v "$SANDBOX_DIR/lib:/sandbox/lib:ro" \
    -v "$SANDBOX_DIR/scenarios:/sandbox/scenarios:ro" \
    "${TARGET_IMAGE_PREFIX}-${profile}" \
    bash /sandbox/scenarios/"$(basename "$scenario")" \
    >"$log" 2>&1
  local status=$?
  grep '^##RESULT' "$log" > "$log.results" 2>/dev/null || true
  ended=$(date +%s)

  report_scenario "$profile" "$name" "$status" "$((ended - started))" "$log"
  return $status
}
