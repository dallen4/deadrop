# Plan: Migrate CLI to Bun Compiled Binary

## Context

The deadrop CLI currently uses esbuild to bundle `cli/index.ts` into `dist/deadrop.js` (CommonJS, ~286KB), then nexe wraps it into a platform binary. This pipeline has several pain points:
- nexe is a 4.0.0-rc (pre-release) binary packager
- Two-step build (esbuild → nexe)
- env vars require a custom esbuild plugin
- Native addons (@roamhq/wrtc, libsql) are problematic

Bun's `bun build --compile` produces a self-contained binary in a single step, with built-in cross-compilation targets and `--define` for build-time env injection.

---

## Critical Constraint: Native Addons

Both addons use `@neon-rs/load` for dynamic platform detection, which Bun can't statically analyze. The fix for both is to directly `require()` the platform-tagged package — Bun then embeds the `.node` file transitively.

### @roamhq/wrtc (WebRTC) — needs shim
- `@roamhq/wrtc` doesn't export WebRTC globals directly. App code (`peerjs`, XState machines) expects `globalThis.RTCPeerConnection` etc. to already exist.
- The shim directly requires `@roamhq/wrtc-darwin-arm64` (which re-exports `./wrtc.node`) and sets the globals before any app code runs — bypassing `@neon-rs/load` entirely.

### libsql — no shim needed
- `@libsql/client` is imported normally in `cli/db/init.ts`. Bun bundles the full module graph: `@libsql/client` → `libsql` → `@neon-rs/load` → `require('@libsql/darwin-arm64')`.
- At runtime, `@neon-rs/load` calls `currentTarget()` and requires the platform package, which is already in the bundle. Works without a shim.

Since we build per-platform on native CI runners (ubuntu-x64, macos-arm64, macos-x64, windows-x64), the platform-tagged packages installed by `pnpm install` on each runner always match.

---

## Implementation Steps

### 1. Create `cli/scripts/bun-build.ts`

Replace `cli/scripts/esbuild.js`:

```typescript
// cli/scripts/bun-build.ts
import { build } from 'bun';

const env = {
  DEADROP_API_URL: process.env.DEADROP_API_URL!,
  DEADROP_APP_URL: process.env.DEADROP_APP_URL!,
  PEER_SERVER_URL: process.env.PEER_SERVER_URL!,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY!,
};

if (!env.DEADROP_API_URL || !env.PEER_SERVER_URL) {
  console.error('Invalid environment configuration');
  process.exit(1);
}

await build({
  entrypoints: ['./index.ts'],
  outdir: './dist',
  target: 'bun',
  compile: true,
  naming: 'deadrop',
  minify: true,
  // No externals — libsql and wrtc .node files are embedded via wrtc-shim.ts
  define: Object.fromEntries(
    Object.entries(env).map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)])
  ),
});
```

### 2. Create `cli/lib/wrtc-init.ts`

Replace `cli/scripts/inject.js`. Bun's bundler has no `inject` API (unlike esbuild), so instead we **import this file as the first import in `cli/index.ts`**.

The platform package suffix is resolved **at module load time** using `os.platform()` + `os.arch()`. Since this runs inside the compiled binary, Bun must have embedded all possible platform packages — or, since we build per-platform on native runners, only the current platform's package is installed and bundled.

```typescript
// cli/lib/wrtc-init.ts
import { platform, arch } from 'os';

const platformMap: Record<string, string> = {
  'darwin-arm64': 'darwin-arm64',
  'darwin-x64':   'darwin-x64',
  'linux-x64':    'linux-x64',
  'linux-arm64':  'linux-arm64',
  'win32-x64':    'win32-x64',
};

const suffix = platformMap[`${platform()}-${arch()}`];
if (!suffix) throw new Error(`Unsupported platform: ${platform()}-${arch()}`);

// Dynamic require — Bun will bundle the matching platform package since
// per-platform builds only have one platform's packages installed.
const wrtc = require(`@roamhq/wrtc-${suffix}`);

Object.defineProperty(globalThis, 'navigator', {
  value: { ...(globalThis.navigator || {}), platform: 'system' },
  writable: true,
  configurable: true,
});

globalThis.RTCPeerConnection = wrtc.RTCPeerConnection;
globalThis.RTCSessionDescription = wrtc.RTCSessionDescription;
globalThis.RTCIceCandidate = wrtc.RTCIceCandidate;
// Bun has built-in global WebSocket — ws not needed
```

> **Note on dynamic require**: Bun may warn about the template literal `require`. If so, use a switch/if chain with static string requires per platform (Bun statically analyzes each branch and embeds only the reachable one on that runner).

### 3. Update `cli/lib/util.ts`

Replace `checkNodeVersion` with `checkBunVersion`:

```typescript
export const checkBunVersion = () => {
  const needed = '>=1.0.0';
  const curr = Bun.version;
  if (!isValidVersion(curr, needed)) {
    console.error(`Requires Bun ${needed}, found ${curr}`);
    process.exit(1);
  }
};
```

### 4. Update `cli/index.ts`

- Add `import './lib/wrtc-init'` as the **first import** (ensures WebRTC globals are set before anything else)
- Call `checkBunVersion()` instead of `checkNodeVersion()`
- Remove `import 'dotenv/config'` — Bun loads `.env` automatically

### 5. Update `cli/package.json`

**Scripts:**
```json
{
  "prebuild": "rimraf dist/",
  "build": "bun run ./scripts/bun-build.ts",
  "release": "pnpm build && npm publish"
}
```

Each CI runner (`ubuntu-x64`, `macos-arm64`, `macos-x64`, `windows-x64`) runs `pnpm cli:build` natively. No cross-compile flags — `target: 'bun'` always compiles for the current platform.

Figlet's `Standard` font is resolved from within the bundled `figlet` package — no external font copy needed. Remove `fonts/` dir and the `cpx` font-copy step entirely.

**Remove from devDependencies:**
- `nexe`
- `esbuild-plugin-environment`
- `dotenv` (Bun loads .env natively)
- `cpx` (no longer needed)

**Update bin + files fields:**
```json
{
  "bin": { "deadrop": "./dist/deadrop" },
  "files": ["./dist/*"]
}
```

`fonts/Standard.flf` removed from `files` — no longer needed, figlet fonts bundled with the package.

### 6. Add `deadrop update` command + startup version check

**New file: `cli/actions/update.ts`**

Fetches the latest release from GitHub API, compares to current version, downloads the matching platform binary, and replaces the running executable.

```typescript
// cli/actions/update.ts
import { platform, arch } from 'os';
import { createWriteStream } from 'fs';
import { chmod, rename } from 'fs/promises';
import { VERSION } from '../lib/constants'; // current baked-in version

const REPO = 'dallen4/deadrop';
const PLATFORM_ASSET_MAP: Record<string, string> = {
  'darwin-arm64': 'deadrop-darwin-arm64',
  'darwin-x64':   'deadrop-darwin-x64',
  'linux-x64':    'deadrop-linux-x64',
  'linux-arm64':  'deadrop-linux-arm64',
  'win32-x64':    'deadrop-win32-x64',
};

export const update = async () => {
  // 1. Fetch latest release tag from GitHub API
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
  const release = await res.json();
  const latest = release.tag_name; // e.g. "v0.3.0"

  if (latest === `v${VERSION}`) {
    console.log('Already up to date.');
    return;
  }

  // 2. Find the asset URL for this platform
  const key = `${platform()}-${arch()}`;
  const assetName = PLATFORM_ASSET_MAP[key];
  const asset = release.assets.find((a: any) => a.name === assetName);
  if (!asset) throw new Error(`No release asset for ${key}`);

  // 3. Download binary to a temp path, make executable, replace self
  const tmpPath = `${process.execPath}.new`;
  const dl = await fetch(asset.browser_download_url);
  // ... stream download to tmpPath, chmod +x, rename to process.execPath
  await chmod(tmpPath, 0o755);
  await rename(tmpPath, process.execPath);

  console.log(`Updated to ${latest}`);
};
```

**Startup version check in `cli/index.ts`** (non-blocking):

```typescript
// After deadrop.parse() — fire-and-forget async check
checkForUpdate().catch(() => {}); // silently ignore network errors

async function checkForUpdate() {
  const res = await fetch('https://api.github.com/repos/dallen4/deadrop/releases/latest');
  const { tag_name } = await res.json();
  if (tag_name !== `v${VERSION}`) {
    console.log(`\nUpdate available: ${tag_name}. Run \`deadrop update\` to install.`);
  }
}
```

**Wire up in `cli/core.ts`:**

```typescript
deadrop
  .command('update')
  .description('Update deadrop to the latest version')
  .action(update);
```

**Bake version into binary** — add to `bun-build.ts` define map:

```typescript
define: {
  ...envDefines,
  'process.env.DEADROP_VERSION': JSON.stringify(pkg.version),
}
```

And in `cli/lib/constants.ts`:

```typescript
export const VERSION = process.env.DEADROP_VERSION ?? '0.0.0';
```

### 7. Create `cli/scripts/install.sh`

Hosted at `https://deadrop.io/install.sh`. Detects platform, downloads latest binary from GitHub Releases, installs to `~/.local/bin/deadrop`, adds to PATH.

```bash
#!/bin/sh
set -e

REPO="dallen4/deadrop"
INSTALL_DIR="${DEADROP_INSTALL_DIR:-$HOME/.local/bin}"

# Detect platform
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS-$ARCH" in
  darwin-arm64)   ASSET="deadrop-darwin-arm64" ;;
  darwin-x86_64)  ASSET="deadrop-darwin-x64" ;;
  linux-x86_64)   ASSET="deadrop-linux-x64" ;;
  linux-aarch64)  ASSET="deadrop-linux-arm64" ;;
  *)
    echo "Unsupported platform: $OS-$ARCH" >&2
    exit 1
    ;;
esac

# Fetch latest release download URL
LATEST_URL=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
  | grep "browser_download_url" \
  | grep "$ASSET\"" \
  | cut -d '"' -f 4)

echo "Downloading $ASSET..."
mkdir -p "$INSTALL_DIR"
curl -fsSL "$LATEST_URL" -o "$INSTALL_DIR/deadrop"
chmod +x "$INSTALL_DIR/deadrop"

# Add to PATH hint
if ! echo "$PATH" | grep -q "$INSTALL_DIR"; then
  echo ""
  echo "Add to your shell profile:"
  echo "  export PATH=\"\$PATH:$INSTALL_DIR\""
fi

echo "deadrop installed to $INSTALL_DIR/deadrop"
"$INSTALL_DIR/deadrop" --version
```

### 8. GitHub Actions release workflow (`.github/workflows/release-cli.yml`)

Matrix build → upload assets → publish npm package from linux runner.

```yaml
name: Release CLI

on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest   target: linux-x64
          - os: macos-latest    target: darwin-arm64  # M-series runner
          - os: macos-13        target: darwin-x64    # Intel runner
          - os: windows-latest  target: win32-x64
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm cli:build
        env:
          DEADROP_API_URL: ${{ secrets.DEADROP_API_URL }}
          # ... other env vars
      - name: Rename binary for release
        run: mv cli/dist/deadrop cli/dist/deadrop-${{ matrix.target }}
      - uses: actions/upload-artifact@v4
        with:
          name: deadrop-${{ matrix.target }}
          path: cli/dist/deadrop-${{ matrix.target }}

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - uses: softprops/action-gh-release@v2
        with:
          files: deadrop-*/deadrop-*
```

### 9. Delete replaced files

- `cli/scripts/esbuild.js`
- `cli/scripts/inject.js`

---

## Files Changed

| File | Action |
|------|--------|
| `cli/scripts/esbuild.js` | Delete |
| `cli/scripts/inject.js` | Delete |
| `cli/scripts/bun-build.ts` | **Create** — Bun build script |
| `cli/lib/wrtc-init.ts` | **Create** — WebRTC globals init (replaces inject.js) |
| `cli/actions/update.ts` | **Create** — self-update command |
| `cli/scripts/install.sh` | **Create** — curl install script |
| `.github/workflows/release-cli.yml` | **Create** — matrix build + release |
| `cli/package.json` | Update scripts, devDeps, bin |
| `cli/lib/util.ts` | `checkNodeVersion` → `checkBunVersion` |
| `cli/lib/constants.ts` | Add `VERSION` export |
| `cli/core.ts` | Add `update` command |
| `cli/index.ts` | First import `wrtc-init`, call `checkBunVersion()`, startup version check, remove dotenv import |

---

## Risks

1. **Dynamic require in wrtc-init.ts**: Bun may warn about template-literal `require(\`@roamhq/wrtc-${suffix}\`)`. If so, replace with a `switch` using static string requires — Bun embeds only the reachable branch.
2. **libsql at runtime**: Test `./dist/deadrop vault list` early. If `@neon-rs/load` fails inside the binary, add a static `require('@libsql/darwin-arm64')` in `cli/db/init.ts` as a bundler hint.
3. **Self-replacing binary on Windows**: `rename()` over a running executable may fail. Mitigation: download to temp, instruct user to restart, or use a `.cmd` wrapper.
4. **Bun version**: Confirm Bun >= 1.x on CI runners and dev machines.

---

## Verification

```bash
# Build
pnpm cli:build

# Smoke tests
./cli/dist/deadrop --version
./cli/dist/deadrop drop "test secret"     # tests WebRTC P2P
./cli/dist/deadrop vault create my-vault  # tests libsql
./cli/dist/deadrop vault list             # confirms DB reads
./cli/dist/deadrop update                 # tests self-update flow

# Install script (once hosted)
curl -fsSL https://deadrop.io/install.sh | sh
deadrop --version
```
