# CLI Update Command + install.sh Progress Bar

## Context

`deadrop` ships two ways:
- **npm global install** (`npm i -g deadrop` / pnpm / yarn / bun) — runs under Node, resolves `dist/deadrop.js` built by `cli/scripts/esbuild.js`.
- **Standalone binary** via `cli/install.sh` — downloads a Bun-compiled executable from GitHub Releases (`dallen4/deadrop`, tags `deadrop@X.Y.Z`, assets `deadrop-${os}-${arch}` + `.sha256`), built by `cli/scripts/bun-build.ts`.

There is currently no update path for either install method — users reinstall manually. Goal: a `deadrop update` command that mirrors Claude Code's — run it, it tells you the previous and new version, and it's done — for **both** install methods. Secondary goal: a download progress bar for `install.sh`'s binary fetch, and (as a stretch) a real progress bar in `deadrop update`'s binary-download path.

## Decisions made

- **Support both install methods, auto-detected** — not npm-only or binary-only. install.sh is likely the primary "curl and go" path, so leaving it without an update story wasn't acceptable.
- **Detection is build-time, not runtime.** A runtime check like `typeof Bun !== 'undefined'` (already used in `lib/util.ts`) detects which runtime is *executing* the code, not which pipeline *built* the artifact — if Bun ever interprets the plain npm/esbuild output, that check would misidentify an npm install as a binary install. Instead, bake `DEADROP_INSTALL_METHOD` in at build time (same mechanism already used for `FIGLET_STANDARD_FONT` / `DEADROP_API_URL` etc. via `environmentPlugin` in `esbuild.js` and `define` in `bun-build.ts`).
- **install.sh progress bar: use curl's native `--progress-bar` for now.** A custom/fancier bar would need more shell scripting to maintain; native curl is zero-complexity and ships today. A nicer custom bar is desired eventually but explicitly deferred (see Open Questions).
- **`deadrop update` progress UI differs by path:** binary-install path gets a real byte-level progress bar (streamed `fetch`, `Content-Length` vs. bytes read, no new dependency). npm-install path gets an Ora spinner only — a subprocess (`npm`/`pnpm`/etc.) doesn't give us byte-level progress to render.
- **npm-path package manager detection: infer from install path, default npm.** `deadrop` only publishes to the npm registry, but users may have installed globally via npm, pnpm, yarn, or bun. Always shelling out to `npm install -g` risks leaving a stale/duplicate copy for pnpm/yarn/bun-global users. Instead, inspect `process.argv[1]` for `pnpm`/`yarn`/`.bun` substrings (matching each PM's real global-install directory convention — e.g. yarn classic's `.config/yarn/global`, not a literal `.yarn` folder) and use that PM's global-install command; fall back to `npm` if nothing matches. (Rejected: always-npm — too likely to update the wrong copy. Rejected: print-instructions-only — breaks the "just run it and you're done" goal.)
- **No `--check`/`--dry-run` flag.** Not requested; keeping the command a single explicit action (YAGNI).

## Open questions / deferred

- **Windows binary self-update is not solved in this pass.** In-place executable swaps are unreliable on Windows while the process is running. `install.sh` itself never supported Windows (bash-only, `Darwin`/`Linux` case statement), so a Windows binary user only exists by manually downloading the `.exe` from Releases. For now, `deadrop update` on `win32` + binary install prints a message pointing back to the Releases page instead of attempting a swap. Revisit if Windows binary usage turns out to be non-trivial.
- **A fancier/custom install.sh progress bar** (beyond curl's native `--progress-bar`) is wanted eventually but not scoped or designed here.

## Install-method detection (build-time)

- `cli/scripts/esbuild.js` — add `DEADROP_INSTALL_METHOD: 'npm'` to the existing `environmentPlugin` config.
- `cli/scripts/bun-build.ts` — add `DEADROP_INSTALL_METHOD: 'binary'` to the `envVars` map (same `define` mechanism already used for `DEADROP_API_URL` etc.).
- `actions/update.ts` reads it as `process.env.DEADROP_INSTALL_METHOD` — same `process.env.X` build-time-substitution pattern already used for `DEADROP_API_URL`/`DEADROP_APP_URL`/etc. on both pipelines, rather than a bare ambient global like `FIGLET_STANDARD_FONT` (that pattern exists specifically because `FIGLET_STANDARD_FONT` is intentionally *undefined* on the esbuild side; here we want a real value baked in on both sides, so reusing the `process.env.*` mechanism is more consistent with existing code).

## Command

New `cli/actions/update.ts`, registered in `core.ts`:

```ts
deadrop.command('update').action(update);
```

Thin action, same pattern as `login`/`logout`/`init`.

### Binary-install path (`DEADROP_INSTALL_METHOD === 'binary'`)

1. `GET https://api.github.com/repos/dallen4/deadrop/releases/latest` (same endpoint `install.sh` uses). Parse `tag_name` (`deadrop@X.Y.Z`), strip the prefix, compare to the running `version` (from `core.ts`) via `semver.gt()`.
2. Not newer → print `Already on the latest version (v1.2.0)`, exit 0.
3. `process.platform === 'win32'` → print the Releases-page fallback message (see Open Questions), exit 0.
4. Otherwise:
   - Resolve the asset URL exactly like `install.sh`: `deadrop-${os}-${arch}` + `.sha256` sibling.
   - Stream the download via native `fetch` to a temp file (`os.tmpdir()`), rendering a real byte-progress bar: read `Content-Length`, track bytes consumed as chunks arrive, redraw a `[####----] 42% (1.2/2.9 MB)`-style line with `\r` (same terminal-redraw approach already used in `lib/log/text.ts`'s `printGrabberList`). No new dependency.
   - Verify SHA-256 of the downloaded file against the `.sha256` asset (`node:crypto`).
   - `chmod +x` the temp file, then `fs.renameSync(tmpPath, process.execPath)` — atomic replace. The currently-running process keeps executing off the unlinked old inode; nothing crashes mid-update.
5. Print `v1.0.0 → v1.2.0`, exit 0.

### npm-install path (`DEADROP_INSTALL_METHOD === 'npm'`)

1. `GET https://registry.npmjs.org/deadrop/latest`, compare versions the same way.
2. Not newer → same "already up to date" message.
3. Detect package manager from `process.argv[1]` (substring match `pnpm`/`yarn`/`.bun`, default `npm`). Run that PM's global-install/update command as a child process.
4. Show an Ora spinner ("Updating via pnpm...") while it runs.
5. Print `v1.0.0 → v1.2.0`, exit 0.

## install.sh

Change the binary-download `curl -fsSL` to `curl -fsSL --progress-bar`. Leave the small GitHub API and `.sha256` fetches on `-fsSL` (silent) — only the big binary download gets a visible bar.

## Errors & edge cases

- Network failure fetching latest version/release metadata → clear error, exit non-zero, no filesystem changes.
- Checksum mismatch → abort before `chmod`/`rename`, temp file discarded, exit non-zero.
- `EACCES` writing to the binary's directory or npm's global dir → clear actionable error, exit non-zero.
- Atomic rename means a failed download/verify never leaves a half-written binary in place — worst case, the update didn't happen and the old binary still runs.

## Testing notes

Vitest unit tests (`cli/tests/unit/`), mocking `fetch`/`fs`:
- Version-diff decision (up to date vs. update available) via `semver`.
- Package-manager detection given fake `process.argv[1]` values (pnpm/yarn/bun/none).
- GitHub asset-URL construction for each OS/arch combination.
- Checksum comparison (match/mismatch).

Not unit tested (manual verification instead, consistent with `install.sh` also being untested):
- The actual download-and-replace network/filesystem side effects.
- The rendered progress bar output itself.
- `install.sh`'s `--progress-bar` change (manual run).

Manual verification plan:
- [ ] Binary install (macOS): `deadrop update` from an older tagged binary shows a progress bar, verifies checksum, replaces itself, prints `vX → vY`, and the new binary runs (`deadrop --version`).
- [ ] Binary install, already latest: prints "already on the latest version", no download.
- [ ] npm install (global): `deadrop update` detects `npm`, runs `npm install -g deadrop@latest`, prints `vX → vY`.
- [ ] pnpm global install: `deadrop update` detects `pnpm` from the install path and uses `pnpm add -g`, not `npm`.
- [ ] `install.sh` fresh run on a clean machine: binary download shows curl's progress bar; checksum verification still passes.
- [ ] Simulated checksum mismatch (binary path): update aborts, old binary untouched, non-zero exit.
- [ ] `win32` + binary install: prints Releases-page fallback message, does not attempt a swap.

## Implementation checklist

- [x] Add `DEADROP_INSTALL_METHOD: 'npm'` to `cli/scripts/esbuild.js`'s `environmentPlugin` config
- [x] Add `DEADROP_INSTALL_METHOD: 'binary'` to `cli/scripts/bun-build.ts`'s `envVars` map
- [x] ~~Declare ambient `DEADROP_INSTALL_METHOD` constant~~ — reused the existing `process.env.*` define pattern instead (see Install-method detection note above); no separate ambient declaration needed
- [x] Add GitHub repo / release constants to `cli/lib/constants.ts` (reuse `dallen4/deadrop`, asset naming convention shared with `install.sh`)
- [x] Implement version-check helpers: GitHub latest-release fetch + npm registry latest fetch, both returning a comparable semver (`cli/lib/update/version.ts`)
- [x] Implement binary-path update: asset URL resolution, streamed download with progress bar, checksum verification, atomic `rename` self-replace, `win32` fallback message (`cli/lib/update/binary.ts`, `download.ts`, `checksum.ts`)
- [x] Implement npm-path update: package-manager detection from `process.argv[1]`, spawn PM's global-install command with Ora spinner (`cli/lib/update/npm.ts`)
- [x] Create `cli/actions/update.ts` wiring both paths behind `DEADROP_INSTALL_METHOD`
- [x] Register `update` command in `cli/core.ts`
- [x] Update `cli/install.sh`: `curl -fsSL` → `curl -fsSL --progress-bar` for the binary download only
- [x] Add Vitest unit tests: version-diff decision, PM detection, asset-URL construction, checksum comparison (47/47 passing)
- [ ] Run manual verification plan above
- [x] Update `cli/CLAUDE.md` command list to include `deadrop update`
