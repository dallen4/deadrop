# Desktop Install via CLI Spec

## Goal

Let users install *and update* the desktop app two ways — a new
`deadrop desktop install` CLI subcommand (idempotent: fresh install or
update, whichever applies), and a standalone `install-desktop.sh`
(mirroring `cli/install.sh`'s existing pattern) — both fully automated (no
manual drag-to-Applications step), matching the CLI's own silent-install
UX. Additionally, `deadrop update` (the CLI's existing self-update command)
should check for a newer desktop version and prompt to update it, but
*only* when desktop is already installed. macOS only, matching desktop's
current release scope. The reverse direction ("desktop installs the CLI")
is explicitly out of scope for this spec — deferred to a later, separate
design.

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
  needs fixing regardless of what else ships here. The exact same bug
  exists a second time: `cli/lib/update/version.ts`'s
  `fetchLatestBinaryVersion()` calls `GITHUB_LATEST_RELEASE_URL`
  (`lib/constants.ts`, also `/releases/latest`) for the CLI's own
  self-update check (`deadrop update`) — same fix needed there too.
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

- **In scope**: `deadrop desktop install` (new CLI subcommand, idempotent
  install-or-update), `install-desktop.sh` (new standalone script),
  `deadrop update` prompting to update desktop when it's already
  installed, the `install.sh` + `version.ts` latest-release-ambiguity
  fixes, checksum generation for the `.dmg` in
  `desktop_publish_workflow.yml`.
- **Out of scope**: desktop installing the CLI (reverse direction — future,
  separate spec), Linux/Windows desktop installs (desktop itself is
  macOS-only right now), `deadrop desktop uninstall` (the `desktop`
  subcommand is structured to allow this later, but it doesn't ship now).

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

### 4. Shared module: `cli/lib/update/desktop.ts`

The actual download/verify/mount/copy logic lives in one TypeScript module,
called from both `deadrop desktop install` (section 4a) and `deadrop
update`'s desktop-check (section 5) — not duplicated between them (only
`install-desktop.sh` gets an independent bash implementation, matching the
existing CLI-vs-script precedent noted above).

```ts
// cli/lib/update/desktop.ts
export const DESKTOP_APP_PATH = '/Applications/deadrop.app';

// Reads CFBundleShortVersionString via `plutil -extract ... raw` (always
// present on macOS, handles both binary and XML plist formats — avoids
// `defaults read`'s path/domain ambiguity). Returns null if not installed.
export async function getInstalledDesktopVersion(): Promise<string | null>;

// GET /repos/{GITHUB_REPO}/releases, first tag_name starting with
// `deadrop-desktop@`. Returns { version, dmgUrl, dmgSha256Url } resolved
// from that release's asset list (never constructed from the tag string).
export async function fetchLatestDesktopRelease(): Promise<{
  version: string;
  dmgUrl: string;
  dmgSha256Url: string;
} | null>;

// Download to temp dir, verify checksum (reuses
// cli/lib/update/checksum.ts's fetchExpectedChecksum/verifyChecksum),
// hdiutil attach, ditto the .app to DESKTOP_APP_PATH (removing any
// existing one first), hdiutil detach. Throws on any failure — caller
// decides how to present it.
export async function installOrUpdateDesktop(
  release: NonNullable<Awaited<ReturnType<typeof fetchLatestDesktopRelease>>>,
): Promise<void>;
```

`getInstalledDesktopVersion`/`fetchLatestDesktopRelease`/`isNewerVersion`
(existing, from `cli/lib/update/version.ts`) together answer "is desktop
installed, and if so, is there a newer version" — both call sites (4a, 5)
use that same three-call sequence, just react to the result differently
(a flag vs. a prompt).

### 4a. `deadrop desktop install` (new CLI subcommand)

`cli/actions/desktop/install.ts`, registered in `cli/core.ts` as a `desktop`
parent command (`deadrop.command('desktop')` with an `install` subcommand
nested under it — matches the existing `vault`/`secret` nested-subcommand
convention in `core.ts`), so `deadrop desktop uninstall` can be added later
without a naming collision.

Idempotent — this is both "install" and "update," there's no separate
update command:

- Platform guard: `process.platform !== 'darwin'` → clear error, matching
  `install-desktop.sh`'s guard.
- `fetchLatestDesktopRelease()`. No release found → clear error (see Error
  Handling), exit non-zero.
- `getInstalledDesktopVersion()`. If already installed:
  - Same version and no `--force` flag → print "already on the latest
    version (vX.Y.Z)" and exit 0, no download attempted.
  - Older version, or `--force` passed → proceed to install (log "Updating
    deadrop desktop vX.Y.Z → vA.B.C..." instead of "Installing...").
  - Not installed → proceed to install (log "Installing deadrop desktop
    vA.B.C...").
- `installOrUpdateDesktop(release)`.
- Same Gatekeeper right-click-Open note as `install-desktop.sh` on success.

### 4b. `install-desktop.sh` (new): standalone desktop installer

Same shape as `cli/install.sh`, desktop-specific, independent bash
implementation (matches the existing precedent — `install.sh` and
`cli/lib/update/binary.ts` already independently implement similar
"download + verify checksum" logic in bash vs. TypeScript for the CLI's
two install paths):

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

### 5. `deadrop update`: prompt to update desktop, if installed

`cli/actions/update.ts` currently updates the CLI itself
(`updateBinaryInstall`/`updateNpmInstall`) then exits. Add, after that
succeeds (not before — CLI updates itself first regardless of what happens
next):

- Non-macOS → skip entirely, no desktop check at all.
- `--skip-desktop` flag → skip the check (new flag on the existing
  `update` command in `cli/core.ts`).
- `getInstalledDesktopVersion()` — not installed → skip silently, nothing
  printed (matches "only ask if you have it installed").
- Installed → `fetchLatestDesktopRelease()` + `isNewerVersion()`. Not
  newer → skip silently. Newer → inquirer confirm prompt: `"A newer
  desktop version is available (vX.Y.Z → vA.B.C). Update now? (Y/n)"`.
  Confirmed → `installOrUpdateDesktop(release)`, same success messaging as
  4a. Declined → nothing further, `deadrop update` still exits 0 (the CLI
  update itself already succeeded; declining the desktop offer isn't a
  failure).
- Any error during the desktop portion (network, checksum, hdiutil) is
  caught and logged as a warning, not a fatal error — `deadrop update`'s
  primary job (updating the CLI) already completed successfully by this
  point, so a desktop-update failure shouldn't make the whole command
  exit non-zero.

## Error Handling

- **No `deadrop-desktop@*` release exists yet**: clear message ("no
  published desktop release found — see
  https://github.com/{repo}/releases"), exit non-zero for `deadrop desktop
  install`/`install-desktop.sh` — same shape as `install.sh`'s existing "no
  published deadrop release found" case. For `deadrop update`'s desktop
  check specifically, this is indistinguishable from "no release yet" and
  should just skip silently (not an error state for a command whose
  primary job already succeeded).
- **Checksum mismatch**: abort before touching `/Applications`, same as
  `install.sh`'s existing behavior for the CLI binary.
- **`hdiutil attach` fails** (e.g. corrupt download): abort, temp dir
  still cleaned up via `trap`/`finally`.
- **`/Applications` not writable**: `ditto`'s failure surfaces directly;
  no special handling beyond letting the command's own error propagate
  (tech-savvy audience, per the earlier scoping decision — no elaborate
  permission-recovery flow). For `deadrop update`'s desktop check, this
  becomes a logged warning rather than a fatal error, per section 5.
- **`plutil -extract` fails** (e.g. `/Applications/deadrop.app` exists but
  its `Info.plist` is malformed/missing): treat as "not installed" rather
  than crashing — same conservative fallback either call site would want.

## Verification

1. `cli/install.sh` still installs the CLI correctly after the tag-prefix
   filter change (regression check — run it against the real repo).
2. `install-desktop.sh` on a real Mac: downloads, verifies checksum,
   mounts, copies to `/Applications` (including the overwrite-existing-app
   path), unmounts, and the app is launchable from `/Applications`.
3. `deadrop desktop install` (via `pnpm cli:build` + running the built
   CLI locally): same checks as #2, plus: running it again with nothing
   newer published prints "already on the latest version" and does not
   re-download; running it with an older app already installed updates in
   place; `--force` reinstalls even when already current.
4. Both install paths, run on Linux: platform guard fires before any
   network call.
5. `desktop_publish_workflow.yml`'s new checksum step: confirm the
   `.dmg.sha256` asset actually appears on a real release and matches the
   `.dmg`.
6. `deadrop update` with desktop installed and a newer version available:
   prompts, confirming updates it, declining leaves it alone and still
   exits 0.
7. `deadrop update` with desktop *not* installed: no desktop-related
   output at all.
8. `deadrop update --skip-desktop` with desktop installed and outdated:
   no prompt, CLI still updates normally.
9. `cli/lib/update/version.ts`'s `fetchLatestBinaryVersion` (CLI
   self-update) still resolves the correct (CLI, not desktop) latest
   version after its own tag-prefix fix — regression check alongside #1.
