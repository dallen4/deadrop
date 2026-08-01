# Desktop Install via CLI Spec

## Goal

Let users install the desktop app two ways — a new `deadrop desktop install`
CLI subcommand, and a standalone `install-desktop.sh` (mirroring `cli/install.sh`'s
existing pattern) — both fully automated (no manual drag-to-Applications
step), matching the CLI's own silent-install UX. macOS only, matching
desktop's current release scope. The reverse direction ("desktop installs
the CLI") is explicitly out of scope for this spec — deferred to a later,
separate design.

## Current State

- `cli/install.sh`: downloads a raw platform binary
  (`deadrop-{darwin,linux}-{arm64,x64}`) from `GET /repos/{repo}/releases/latest`,
  verifies its `.sha256`, drops it in `~/.local/bin`, offers a PATH-export
  prompt. Fully automated, no user interaction beyond that one PATH prompt.
- `desktop_publish_workflow.yml` (already merged): builds a macOS **universal**
  `.dmg` via `tauri-apps/tauri-action@v1`, uploads it as a GitHub Release
  asset on `deadrop-desktop@*` tags. Does **not** currently generate a
  `.sha256` for it (unlike `cli_publish_workflow.yml`, which explicitly
  does for every CLI binary).
- **Two independent, un-namespaced release trains now share one GitHub
  Releases list**: `deadrop@*` (CLI) and `deadrop-desktop@*` (desktop).
  `install.sh`'s `GET /releases/latest` call doesn't distinguish between
  them — whichever tag was cut most recently becomes "latest," so a
  desktop release could silently break `install.sh`'s CLI install. This
  needs fixing regardless of what else ships here.
- The `.dmg`'s filename is derived from `tauri.conf.json`'s `version`
  field (currently `"0.1.0"`) at build time — **not** necessarily the git
  tag that triggered the build, since nothing currently syncs the two
  (same gap `cli_publish_workflow.yml` has for the CLI, which sidesteps it
  by fully controlling binary names itself in the workflow rather than
  relying on `package.json`). Both install paths should look up the
  actual asset name from the release's asset list via the GitHub API,
  not construct it from the tag string.
- `cli/lib/constants.ts` already exports `GITHUB_REPO`, reused by
  `cli/lib/update/binary.ts` for the CLI's own self-update flow — reuse
  it here rather than hardcoding the repo string a third time.
- No code signing/notarization exists for desktop builds yet (unrelated,
  already-accepted gap) — installed users will need to right-click → Open
  the first time (Gatekeeper "unidentified developer" warning).

## Scope

- **In scope**: `deadrop desktop install` (new CLI subcommand),
  `install-desktop.sh` (new standalone script), the `install.sh`
  latest-release-ambiguity fix, checksum generation for the `.dmg` in
  `desktop_publish_workflow.yml`.
- **Out of scope**: desktop installing the CLI (reverse direction — future,
  separate spec), Linux/Windows desktop installs (desktop itself is
  macOS-only right now), `deadrop desktop update`/`uninstall` (the `desktop`
  subcommand is structured to allow these later, but only `install` ships
  now).

## Design

### 1. `desktop_publish_workflow.yml`: generate a checksum for the `.dmg`

After `tauri-apps/tauri-action`'s build+upload step, add a step that finds
the built `.dmg` in `desktop/src-tauri/target/universal-apple-darwin/release/bundle/dmg/`,
generates its `.sha256` (`shasum -a 256`, matching `cli_publish_workflow.yml`'s
fallback for macOS runners), and uploads it as an additional release asset
via `gh release upload <tag> <path>.sha256`.

### 2. `cli/install.sh`: fix the latest-release ambiguity

Replace the `GET /releases/latest` call with `GET /releases` (returns the
list, newest first) and take the first entry whose `tag_name` starts with
`deadrop@` (explicitly **not** `deadrop-desktop@` — a plain prefix match
would incorrectly match both). This is the one change to this file — no
`--desktop` flag, no other logic changes.

### 3. `install-desktop.sh` (new): standalone desktop installer

Same shape as `install.sh`, desktop-specific, no shared code between them
(matches the existing precedent — `install.sh` and `cli/lib/update/binary.ts`
already independently implement similar "download + verify checksum" logic
in bash vs. TypeScript for the CLI's two install paths; this follows the
same pattern for desktop's two install paths):

1. **Platform guard**: `uname -s` must be `Darwin`. Any other OS → clear
   error ("desktop is currently macOS-only") and exit non-zero, no partial
   work attempted.
2. `GET /repos/{GITHUB_REPO}/releases`, take the first entry whose
   `tag_name` starts with `deadrop-desktop@`.
3. From that release's `assets` array, find the entry whose `name` ends in
   `.dmg` (and its `<name>.sha256` sibling) — don't construct the filename
   from the tag.
4. Download both to a `mktemp -d` scratch dir (same `trap ... EXIT` cleanup
   pattern as `install.sh`).
5. Verify checksum (same `sha256sum`/`shasum -a 256` fallback as `install.sh`).
6. `hdiutil attach <dmg> -nobrowse -quiet` → capture the mount point from
   its output.
7. If `/Applications/deadrop.app` already exists, remove it first
   (`rm -rf`) — fully automated per the decision to skip a
   confirm-before-overwrite prompt (tech-savvy audience). Copy the `.app`
   from the mounted volume to `/Applications` via `ditto` (Apple's
   recommended tool for copying `.app` bundles — preserves extended
   attributes/resource forks/permissions correctly, unlike a plain
   recursive copy).
8. `hdiutil detach <mount point> -quiet` — also wired into the `trap`
   cleanup so a failure partway through still unmounts.
9. Success message pointing at `/Applications/deadrop.app`, plus a note
   about the Gatekeeper right-click-Open step being expected (unsigned
   build).

### 4. `deadrop desktop install` (new CLI subcommand)

`cli/actions/desktop/install.ts`, registered in `cli/core.ts` as a `desktop`
parent command (`deadrop.command('desktop')` with an `install` subcommand
nested under it — matches the existing `vault`/`secret` nested-subcommand
convention in `core.ts`), so `deadrop desktop update`/`deadrop desktop
uninstall` can be added later without a naming collision.

TypeScript port of the same steps as `install-desktop.sh` (independent
implementation, not a shell-out to the script — matches how
`cli/lib/update/binary.ts` doesn't shell out to `install.sh` either):

- Platform guard: `process.platform !== 'darwin'` → clear error, matching
  the script's guard.
- `fetch` (Node 24 global) against `https://api.github.com/repos/${GITHUB_REPO}/releases`
  (import `GITHUB_REPO` from `cli/lib/constants.ts`), same tag-prefix
  filter and asset lookup as the script.
- Download to a temp dir (`os.tmpdir()` + `randomUUID()`, matching
  `cli/lib/update/binary.ts`'s existing temp-file pattern), verify checksum
  (reuse `cli/lib/update/checksum.ts`'s `fetchExpectedChecksum`/`verifyChecksum`
  — already generic over any asset, not CLI-binary-specific).
- Shell out to `hdiutil attach`/`ditto`/`hdiutil detach` via Node's
  `child_process` (`execFileSync`, matching the CLI's existing style of
  wrapping system commands rather than adding a new npm dependency for
  something three OS-native commands already do correctly).
- Same overwrite-existing-app and Gatekeeper-note messaging as the script.

## Error Handling

- **No `deadrop-desktop@*` release exists yet**: clear message ("no
  published desktop release found — see
  https://github.com/{repo}/releases"), exit non-zero — same shape as
  `install.sh`'s existing "no published deadrop release found" case.
- **Checksum mismatch**: abort before touching `/Applications`, same as
  `install.sh`'s existing behavior for the CLI binary.
- **`hdiutil attach` fails** (e.g. corrupt download): abort, temp dir
  still cleaned up via `trap`/`finally`.
- **`/Applications` not writable**: `ditto`'s failure surfaces directly;
  no special handling beyond letting the command's own error propagate
  (tech-savvy audience, per the earlier scoping decision — no elaborate
  permission-recovery flow).

## Verification

1. `cli/install.sh` still installs the CLI correctly after the tag-prefix
   filter change (regression check — run it against the real repo).
2. `install-desktop.sh` on a real Mac: downloads, verifies checksum,
   mounts, copies to `/Applications` (including the overwrite-existing-app
   path), unmounts, and the app is launchable from `/Applications`.
3. `deadrop desktop install` (via `pnpm cli:build` + running the built
   CLI locally): same checks as #2.
4. Both paths, run on Linux: platform guard fires before any network call.
5. `desktop_publish_workflow.yml`'s new checksum step: confirm the `.dmg.sha256`
   asset actually appears on a real release and matches the `.dmg`.
