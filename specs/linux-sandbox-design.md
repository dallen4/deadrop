# Linux sandbox — design & handoff spec

Goal: a local, containerized way to **actually install and set up** deadrop on
Linux, so OS-specific install mechanics are exercised during development instead
of discovered by users.

We already have CI runners that compile and distribute Linux artifacts. Nothing
currently *installs* them. Everything works well on macOS because macOS is where
the install paths get run by hand; Linux is buggy because it is only ever built
and shipped. This closes that gap.

Three purposes, in priority order:

1. **Simulate user setup** — run the real install and configuration path a user
   runs, on a clean machine, and prove it works
2. **Exercise practical usage** — confirm what was installed actually runs, not
   merely that files landed
3. **Reproduce bugs** — when a Linux user reports something, get a disposable
   machine matching their setup and reproduce it locally rather than guessing

The third is why `shell` and `--keep` (§4) are first-class rather than debug
conveniences, and why profiles are cheap to add: a repro harness is only useful
if you can quickly shape it to match the reporter's environment.

Not a pipeline blocker. This is a developer/agent tool for experimentation and
pre-release signoff, deliberately shaped so the same scenario scripts can later
be lifted into a `ubuntu-latest` workflow without a rewrite.

---

## 1. Scope (decided — do not expand)

**Installed means runnable.** This is the success criterion for every scenario
here. A file landing at the right path with the right mode bits is not a
validated install; the only proof is executing what was installed. Every install
scenario therefore ends by running its artifact, not by inspecting it.

That is achievable headlessly, because "can it run" and "does it render
correctly" are different questions. The CLI answers the first directly —
`deadrop --version` either works on that distro or it does not. The desktop
AppImage answers it up to the display layer: extract it, confirm the inner ELF
matches the host architecture, confirm every shared library resolves, then
execute it with no `DISPLAY` and require that the failure is *"cannot open
display"* rather than "exec format error" or "library not found". Reaching the
display layer proves the entire chain beneath it. Only "does it draw the right
pixels" needs a real compositor, and that is §13.5.

**North star: the full first-run journey**, in one home directory, in order —
install CLI, configure it, install desktop, run both (§8/`70`).

**Authentication is out of scope.** The journey runs anonymous throughout —
`deadrop init`, vault creation, and config resolution, with no `deadrop login`.
Drop and grab both work signed out, so this is the genuine first-run path for
most users, and it avoids putting real credentials or a login bypass in a test
container. Consequence: `cli/actions/login.ts` is never exercised here, and the
missing headless-login path (`open(url)` + a loopback server on port 1337) stays
a known, deliberate gap.

**In scope: install and setup mechanics.**

- `cli/install.sh` end-to-end
- `cli/install-desktop.sh` end-to-end
- `deadrop desktop install` / `deadrop update` (`cli/lib/update/desktop.ts`)
- Config path resolution (`cli/lib/global-config.ts`)
- Keychain **degradation** behavior (`cli/lib/auth/cache.ts`)
- Desktop integration — the freedesktop `.desktop` launcher entry and icon,
  which **do not exist yet** (§8/`60`, §13.6)

**Out of scope:**

- Rust toolchain, Tauri builds, any desktop compilation
- Any display stack, and therefore rendering. The AppImage *is* executed
  (headlessly, per "installed means runnable" above); what is out of scope is
  drawing a window and judging what it looks like — deferred to §13.5, not
  permanently excluded
- WebRTC drop/grab flows (owned by `tests/e2e/`, and P2P ICE does not complete
  in Linux containers anyway — see the note in `.github/workflows/cli_e2e_workflow.yml`)
- x86_64 by default — arm64-native only, with emulation as an opt-in follow-on
  (§11, §13.2)

**Critical-only assertion bar.** A scenario fails when the user ends up with no
working tool, a silently broken one, or instructions that are actively wrong.
Wording, timing, ordering, and non-blocking warnings are not failures. Resist
adding cosmetic assertions; this suite loses its value the moment it goes red
for reasons nobody needs to act on.

## 2. Runtime and profiles (decided)

**Podman**, rootless, arm64-native. Chosen over Docker Desktop for licensing and
for being closest to how GitHub's Linux runners behave.

**Profiles cover variation axes, not distros.** This distinction drives every
decision below. There are far too many distros to enumerate, but only a handful
of properties can actually break a setup path:

| Axis | Values that matter | How it is covered |
|---|---|---|
| Package manager | apt / dnf / pacman | `ubuntu` + `fedora`. pacman adds no third failure mode — see below |
| libc | glibc / musl | glibc only. musl is **not supported** today (§11), not merely untested |
| glibc version | at the build floor / newer | scenario `50`, statically — **no profile needed** |
| Secret Service | present / absent | runtime strip inside any profile (§6) |
| Architecture | x86_64 / aarch64 | aarch64 native; x86_64 opt-in (§13.2) |

Only two of those axes need a distinct base image:

| Profile | Base image | Axis it exists for |
|---|---|---|
| `ubuntu` | `ubuntu:24.04` | apt family — Ubuntu, Debian, Mint, Pop!_OS |
| `fedora` | current stable (pin at implementation time, e.g. `fedora:43`) | dnf/rpm family, SELinux enforcing — Fedora, RHEL, CentOS Stream, Rocky |

The glibc-floor axis deliberately does **not** get an `ubuntu:22.04` profile. The
failure it guards against is a dynamic-linker error at launch on a user's older
machine, and that is detectable by reading required version symbols out of the
artifact rather than by running it somewhere old (§8/`50`). Static inspection is
instant, needs no display, and works on any host architecture. A dedicated
old-glibc image would add marginal fidelity for the cost of a third profile.

There is no third "barebones" image. "No `jq`, no `libsecret`, no keyring
daemon" is a **runtime strip** inside either profile (§6), so missing-tooling
guards get proven on both package families rather than on one synthetic distro.

**Why no `arch` profile**, despite Arch being common among exactly our audience
(developers on Framework-class hardware): it adds almost no technical coverage.
It is glibc, `ldconfig -p` works, and XDG paths are identical — the only new
axis is a third package-manager name, and that surfaces the *same* defect
`fedora` already catches in §8/`40`. The correct response to three package
families is not three profiles; it is to stop hardcoding one package manager in
remediation text (§13.1). `install.sh:18-20` already gets this right by listing
apt, dnf, and pacman variants together.

Both images contain: bash, curl, node (matching `.nvmrc`, >= 24), pnpm, `jq`,
`libsecret`, `desktop-file-utils` (for §8/`60`), `binutils` (for §8/`50`), and a
non-root `sandbox` user with a real home directory. Scenarios that need
something absent remove it themselves.

## 3. Location and files

Lives in the **existing `tests/` workspace**, not a new package. Its purpose is
test and verify; it does not ship.

```
tests/sandbox/
├── sandbox                  # bash entrypoint (the only thing a human/agent runs)
├── images/
│   ├── Containerfile.builder  # the ONLY image with a toolchain
│   ├── Containerfile.ubuntu   # bare target
│   └── Containerfile.fedora   # bare target
├── lib/
│   ├── runner.sh            # the ONLY container-aware code; also hosts the registry
│   ├── harness.sh           # scenario preamble: env contract
│   └── assert.sh            # assertion primitives + result protocol
├── scenarios/
│   ├── 10-install-cli.sh          # built
│   ├── 20-install-desktop.sh      # todo
│   ├── 30-config-paths.sh         # todo
│   ├── 40-keychain-degradation.sh # todo
│   ├── 50-glibc-floor.sh          # todo
│   ├── 60-desktop-integration.sh  # todo
│   └── 70-first-run.sh            # todo
├── .work/                   # gitignored — artifacts the builder produced
└── .logs/                   # gitignored, written every run
```

There is no `fixtures/` directory of canned binaries. Artifacts are **built**,
not committed: the builder emits them into `.work/artifacts/`, which the
registry then serves. A checked-in stand-in binary would test the download
plumbing while proving nothing about the thing we actually ship.

Wiring:

- `tests/package.json` gains `"sandbox": "./sandbox/sandbox"`
- root `package.json` gains `"sandbox": "pnpm -F tests sandbox"`
- `.gitignore` gains `tests/sandbox/.logs/`
- Docs go in `tests/CLAUDE.md` as a new section — **no new nested CLAUDE.md**
- Discovery pointers get added to root `CLAUDE.md` and `cli/CLAUDE.md`, since an
  agent editing `cli/install.sh` has no reason to open `tests/CLAUDE.md` on its own

## 4. Interface

```bash
pnpm sandbox doctor                    # verify podman + machine state, print exact fixes
pnpm sandbox list                      # profiles × scenarios
pnpm sandbox run                       # full matrix
pnpm sandbox run --profile fedora
pnpm sandbox run --scenario install-cli # substring match
pnpm sandbox shell --profile ubuntu    # interactive bare target, registry running
```

Built: `doctor`, `list`, `run`, `shell`, `--profile`, `--scenario`, `--verbose`.

Not yet built: `affected` (map `git diff --name-only` → scenarios), `--json`
(machine summary), `--live` (real GitHub instead of the local registry, §7),
`--keep` (leave containers for inspection).

`affected` reads a path → scenario map:

| Path | Scenarios |
|---|---|
| `cli/install.sh` | `10` |
| `cli/install-desktop.sh` | `20` |
| `cli/lib/update/**` | `20` |
| `cli/lib/global-config.ts`, `shared/lib/constants.ts` | `30` |
| `cli/lib/auth/**` | `40` |
| `.github/workflows/desktop_publish_workflow.yml` | `50` |
| `cli/lib/update/desktop-entry.ts` | `60` |
| `cli/actions/init.ts` | `30`, `70` |

## 5. Runner mechanics

**Build somewhere, install somewhere else.** This separation is the entire
point, and getting it wrong makes the suite worthless. A user never compiles
deadrop — they download an artifact built on a GitHub runner and run it on their
own distro, and the gap between "built there" and "runs here" is exactly the bug
class this exists to catch. Compiling inside the machine under test resolves
native modules for that machine and papers over every one of those bugs.

Three roles, mirroring the real pipeline:

| Role | Image | Has | Plays |
|---|---|---|---|
| **Builder** | `ubuntu:24.04` | Node 24, pnpm, bun, projected source | the `ubuntu-24.04-arm` runner in `cli_publish_workflow.yml` |
| **Registry** | — | static file server on loopback | GitHub Releases |
| **Target** | `ubuntu:24.04`, `fedora:*` | **nothing** — bare distro | the user's machine |

The builder runs `pnpm compile` (`cli/scripts/bun-build.ts`) and emits
`deadrop-linux-<arch>` plus a checksum. Note there is no cross-compilation:
that script resolves the host's libsql `.node` and targets the host platform
only, which is why CI builds each target on a native runner and why the builder
here must be a Linux container rather than the macOS host.

**The target image installs nothing.** No Node, no pnpm, no `node_modules`, no
repo. Anything pre-installed is an unearned assumption about the user's machine.
The only thing copied in is the script under test — `install.sh` and
`install-desktop.sh` are single files. Scenarios that legitimately need a
runtime (the `npm i -g deadrop` path) install it themselves, as that user would.

**Source is projected into the builder only**, never bind-mounted: the tree is
mounted read-only at `/src` and `tar`-piped in, excluding `node_modules`,
`.git`, `dist`, `target`, `.next`. The host's `node_modules` holds macOS-arm64
native binaries that would poison the build. Side benefit: **uncommitted work is
testable** without committing, which is the whole reason the builder exists
rather than just consuming published releases.

`--live` skips the builder entirely and points the target at real GitHub, which
validates published artifacts instead of working-tree ones. Both matter: the
builder catches unreleased regressions, `--live` catches bad releases.

Targets run `--user sandbox`. Running as root would mask permission problems
real users hit.

**The EXDEV mount.** `installOrUpdateDesktopLinux` uses `copyFileSync`, not
`renameSync`, specifically because `mkdtempSync(tmpdir())` and
`~/.local/bin` can be on different filesystems (`cli/lib/update/desktop.ts:240`).
In a stock container `/tmp` and `$HOME` are both on the same overlayfs, so that
path is **never exercised** — the regression would pass silently. Scenario 20
therefore runs with `--tmpfs /mnt/alt:rw,exec,size=256m` and `TMPDIR=/mnt/alt`,
forcing a genuine cross-filesystem copy.

Note the same concern does *not* apply to `install.sh` or `install-desktop.sh`:
both use shell `mv`, which falls back to copy+unlink across devices. Only
Node's `rename(2)` fails with `EXDEV`. Do not "fix" the shell scripts.

## 6. Scenario contract

A scenario is plain bash that knows nothing about containers. It sources the
harness and reads a fixed env contract:

| Variable | Meaning |
|---|---|
| `SANDBOX_SCRIPTS` | the installers under test, mounted read-only (`/scripts`) |
| `SANDBOX_PROFILE` | `ubuntu` \| `fedora` |
| `SANDBOX_PKG_REMOVE` | profile-appropriate removal command (`apt-get remove -y` / `dnf remove -y`) |
| `DEADROP_RELEASES_API` | registry stand-in for the GitHub releases list |
| `DEADROP_RELEASES_DOWNLOAD_BASE` | ditto, for asset downloads |
| `HOME` | fresh, empty, writable |

Note there is no `SANDBOX_REPO` or `SANDBOX_CLI`. A target has no repo and no
prebuilt CLI — it gets a binary the only way a user does, by installing one.

```bash
#!/usr/bin/env bash
. "$(dirname "$0")/../lib/harness.sh"

scenario "10-install-cli"

assert_registry_reachable

run_ok bash "$SANDBOX_SCRIPTS/install.sh"
assert_contains "$LAST_STDOUT$LAST_STDERR" "Checksum verified"

BIN="$HOME/.local/bin/deadrop"
assert_file_exists "$BIN"
run_ok "$BIN" --version     # placement proves nothing; running it does

finish
```

`assert.sh` primitives: `run`, `run_ok`, `run_fails`, `assert_file_exists`,
`assert_executable`, `assert_contains`, `assert_not_contains`, `assert_eq`,
`pass`, `fail`, `skip`.

**Result protocol.** Every assertion prints one tab-delimited line to stdout
prefixed `##RESULT`: `##RESULT<TAB>PASS|FAIL|SKIP<TAB>scenario<TAB>message`.
The scenario exits nonzero if any `FAIL` was emitted; `runner.sh` greps the log
and aggregates.

Not fd 3, which an earlier draft specified — podman forwards only stdio into a
container, so a scenario writing to fd 3 dies with `Bad file descriptor`. A
stdout marker also survives any CI log pipeline unchanged, which §10 needs.

**Profile-conditional strips** use `SANDBOX_PKG_REMOVE` rather than hardcoding a
package manager, so a scenario that needs `jq` gone works identically on both.

## 7. Fixture registry and the base-URL override

Live GitHub is a bad dependency here. Unauthenticated API calls are capped at 60
requests/hour/IP, so a full matrix run is both rate-limited and
non-deterministic — disqualifying for something agents run repeatedly.

Default runs are **fully offline** against a local registry: a `python3 -m
http.server` on the **host**, reached from the target at
`host.containers.internal`. Deliberately not inside the target — a machine
hosting its own file server is not a bare distro any more, and installing
python3 there would be an unearned assumption about the user.

It serves what the builder produced: the binary, a `.sha256` generated from
those exact bytes, a minimal releases list, and a `/tampered` copy with a byte
appended so the checksum genuinely mismatches. Nothing is checked in, so a
checksum can never drift from what it describes.

This requires a small **production change** — two env overrides that default to
exactly today's hardcoded values:

| Variable | Default |
|---|---|
| `DEADROP_RELEASES_API` | `https://api.github.com/repos/dallen4/deadrop/releases` |
| `DEADROP_RELEASES_DOWNLOAD_BASE` | `https://github.com/dallen4/deadrop/releases/download` |

Applied at five call sites:

- `cli/install.sh:34` — releases list URL → `DEADROP_RELEASES_API`
- `cli/install.sh:42` — asset URL → `DEADROP_RELEASES_DOWNLOAD_BASE`
- `cli/install-desktop.sh:33` — releases list URL → `DEADROP_RELEASES_API`
- `cli/lib/constants.ts:19` (`GITHUB_RELEASES_URL`) → `DEADROP_RELEASES_API`
- `cli/lib/constants.ts:47` (`releaseAssetUrl`) → `DEADROP_RELEASES_DOWNLOAD_BASE`

`install-desktop.sh` and `fetchLatestDesktopRelease` resolve their download URLs
from the payload's `browser_download_url`, so they need only the API override —
the fixture JSON carries local URLs directly.

This has independent production value beyond the sandbox: mirrored/self-hosted
installs, air-gapped environments, and validating against a staging release
before tagging.

`--live` runs the identical scenarios against real GitHub for pre-release
signoff. Expect it to be slower and occasionally rate-limited; that is the
tradeoff, and it is opt-in.

## 8. Scenario catalog

Thirteen cells: six scenarios × two profiles, plus one profile-independent
artifact check (`50`) that runs once per run.

### `10-install-cli` — `cli/install.sh`

- **The installed binary runs.** `deadrop --version` exits 0 and prints the
  expected version. This is the assertion that matters — placement and mode bits
  are necessary, not sufficient. It is also the only check that catches a
  wrong-libc binary, an unresolvable shared library, or a native module
  (`libsql`, `@napi-rs/keyring`, `node-datachannel`) that failed to resolve for
  this platform, none of which are visible from the filesystem
- Exits 0; binary lands at `$DEADROP_INSTALL_DIR/deadrop`, executable
- Checksum is verified, and a **tampered** payload aborts nonzero without installing
- Runs to completion non-interactively (no TTY) without hanging — `install.sh:74`
  guards the `read` behind `[ -t 1 ]`, `-z "${CI:-}"`, and `-r /dev/tty`; all
  three must hold, and the sandbox is a realistic place for that to regress
- Prints the manual PATH instruction when `~/.local/bin` is not on `PATH`
- The libsecret probe (`install.sh:14-21`) does not misfire on either profile.
  Note this script already prints correct apt/dnf/pacman variants — it is the
  Node-side message that does not (see scenario 40)
- `bash` is a hard dependency (`[[ =~ ]]`, `set -o pipefail`); asserted
  explicitly so it stays a known, documented requirement

### `20-install-desktop` — `install-desktop.sh` + `deadrop desktop install`

- **The installed AppImage runs**, as far as a headless container allows:
  `--appimage-extract` succeeds (valid AppImage structure), the inner ELF's
  architecture matches the host, `ldd` reports no unresolved libraries, and
  executing it with `DISPLAY` unset fails with a *display* error rather than
  `exec format error` or a missing-library error. That distinction is the whole
  check — reaching the display layer proves arch, permissions, AppImage
  structure, and the entire shared-library chain are correct.
  On arm64 this fails today, correctly: `desktop_publish_workflow.yml` ships no
  aarch64 build (§11), so there is genuinely nothing an arm64 Linux user could
  run. That is a finding about the product, not a defect in the sandbox, and it
  should be reported as a failure rather than skipped
- AppImage lands at `~/.local/bin/deadrop-desktop.AppImage`, mode `0755`
- Version sidecar `.deadrop-desktop.version` is written, and
  `getInstalledDesktopVersion()` reads it back correctly
- **EXDEV**: with `TMPDIR` on a separate tmpfs, `deadrop desktop install`
  succeeds (the copy-not-rename regression guard)
- Re-running updates in place without corrupting or duplicating the install
- With `jq` removed, `install-desktop.sh` exits 1 with the actionable message at
  `install-desktop.sh:29` — not a stack trace, not a silent partial install
- Both the shell script and the Node command land the app in the same place
- **Asset selection is architecture-aware.** The fixture release carries *both* an
  amd64 and an aarch64 AppImage, and the container's own architecture's build
  must be the one installed. This fails today: `cli/lib/update/desktop.ts:142`
  matches `a.name.endsWith('.AppImage')` and `install-desktop.sh:54` does
  `select(.name | endswith($ext)) | head -1` — neither filters on architecture,
  so with two Linux AppImages on one release the winner is whichever the API
  lists first. It is latent only because `desktop_publish_workflow.yml` ships a
  single Linux target (§13.4). The CLI path does not share the flaw;
  `resolveReleaseAssetName()` (`cli/lib/constants.ts:34`) builds an explicit
  `deadrop-linux-<arch>` name. **Fix this before adding a second Linux desktop
  build**, or existing x64 users get handed an aarch64 binary.

### `30-config-paths` — `cli/lib/global-config.ts`

- Default resolves to `~/.local/share/<APP_IDENTIFIER>`
- `XDG_DATA_HOME` is honored when set
- CLI and desktop agree on one vault directory (the stated reason this function
  mirrors Tauri's `app_data_dir()`), so a vault created by one is visible to the
  other
- `deadrop init` in a clean `$HOME` produces a usable config and a working
  SQLite database — this is where a mis-resolved native `libsql` binding
  surfaces on Linux

### `40-keychain-degradation` — `cli/lib/auth/cache.ts`

Degradation only. The full gnome-keyring roundtrip is deliberately excluded:
making `dbus-run-session` + an unlocked daemon reliable in a container is the
single most fragile thing this suite could contain, and it tests a happy path,
not a critical error.

- With libsecret removed: `getToken()` returns `''` and never throws
  (`cache.ts:42`), the process warns once and continues, and an anonymous drop
  still works end-to-end
- `setSession()` (login) surfaces a real error rather than faking success
  (`cache.ts:112`)
- **The remediation text is distro-appropriate.** `cache.ts:33` hardcodes
  ``sudo apt-get install -y libsecret-1-0``. On Fedora that command does not
  exist and the package is `libsecret` — a user following our own error message
  gets a second error. This assertion fails on `fedora` on day one; that is the
  point, and it is the concrete thing that justifies a second profile.

### `50-glibc-floor` — artifact compatibility floor (profile-independent)

Guards the pin at `desktop_publish_workflow.yml:28-32`, which builds the
AppImage on `ubuntu-22.04` specifically so the result links against an older
glibc and stays loadable on more end-user distros.

Nothing today notices if that pin changes. Bumping it to `ubuntu-latest` still
produces a green build and a published release; the binary then requires newer
`GLIBC_` symbols and dies in the dynamic linker on every Ubuntu 22.04, Debian
12, and RHEL 9 machine, before a single line of app code runs. It is the
canonical "we build on Linux but never set up on Linux" failure.

The check needs no execution and no old base image:

1. `--appimage-extract` the artifact
2. For every ELF in the extracted tree, read required version symbols
   (`readelf --version-info`, or `objdump -T`)
3. Assert the maximum `GLIBC_x.y` is at or below the declared floor

The floor is declared once as `SANDBOX_GLIBC_FLOOR` (2.35 for `ubuntu-22.04`)
and must be updated deliberately, in the same commit that changes the build
runner. That coupling is the actual guard — the assertion exists to make a
silent change loud.

Runs once per run rather than per profile: it inspects a build artifact, not a
running system, so a second profile would re-derive an identical answer. It is
also the most CI-shaped scenario here, since it is a pure post-build property —
see §10.

### `60-desktop-integration` — launcher entry

Reported from the field by an Arch/Wayland user: the app never appeared in the
launcher. Confirmed and fixed — `cli/lib/update/desktop-entry.ts` and the Linux
branch of `install-desktop.sh` now write the entry and install the icon. This
scenario is the regression guard for that, asserting the **installer's real
output**, not a candidate template.

- `desktop-file-validate` passes on both profiles (`desktop-file-utils` — a
  cross-distro packaging check in its own right)
- `Exec=` is an **absolute** path, not a bare command name. The bundled entry
  inside the AppImage ships `Exec=deadrop`, which resolves only if
  `~/.local/bin` is on `PATH` — often it isn't
- Exactly one main category. `Utility;Security;Network;` declares three, which
  makes `desktop-file-validate` warn about the app appearing twice in the menu;
  `Network;FileTransfer;` validates clean
- Env prefixes, if any, use the spec-legal `env VAR=value /path` form — `Exec=`
  is not a shell, so a bare `VAR=value /path` is invalid and silently fails in
  some DEs
- The icon is the **128 or 256** variant, not `.DirIcon`, which symlinks to the
  32x32 and looks poor in a launcher
- `update-desktop-database` and `gtk-update-icon-cache` degrade cleanly when
  absent — neither is guaranteed installed, and neither should fail an install

**What this cannot answer.** Validity is not rendering. Whether the `Exec=` line
actually produces a window under Wayland — the `WEBKIT_DISABLE_DMABUF_RENDERER`
/ `WEBKIT_DISABLE_COMPOSITING_MODE` / `GDK_BACKEND` question — needs a real
compositor and a GPU, which is §13.5. Do not let a green `60` be read as "the
app launches on Wayland." It means "the entry is well-formed."

### `70-first-run` — the whole journey, one home directory

Scenarios `10`-`60` each run in an isolated container with a clean `$HOME`,
which is the right default for attribution: a failure names one thing. But no
real user does one step. They install the CLI, configure it, install the desktop
app, and run both — in sequence, in the same home directory, where each step
inherits whatever the previous one left behind.

This scenario runs that sequence in a single container:

1. `install.sh` → run `deadrop --version`
2. `deadrop init` → a usable config and vault (§13.7)
3. `install-desktop.sh` → run the AppImage headlessly per §8/`20`
4. Both binaries coexist in `~/.local/bin`, and the `PATH` guidance printed
   along the way is consistent rather than contradictory

It exists to catch what isolation hides — ordering effects, one installer
clobbering another's files, a second `PATH` warning that contradicts the first,
and config written by the CLI that the desktop app cannot read. It is deliberately
the least isolated thing here, and that is its entire value.

Being a composition, it should be read as a smoke test: when it fails alongside
a focused scenario, fix the focused one first. When it fails *alone*, the bug is
in how the steps interact, and that is a class nothing else here can find.

## 9. Output and exit codes

Quiet by default. One line per cell:

```
tests/sandbox › ubuntu
  PASS  10-install-cli              1.9s
  PASS  20-install-desktop          3.4s
  PASS  30-config-paths             0.6s
  PASS  40-keychain-degradation     1.2s
  PASS  60-desktop-integration      0.5s
  PASS  70-first-run                4.9s

tests/sandbox › fedora
  PASS  10-install-cli              2.0s
  PASS  20-install-desktop          3.6s
  PASS  30-config-paths             0.7s
  PASS  60-desktop-integration      0.5s
  PASS  70-first-run                5.1s
  FAIL  40-keychain-degradation     1.1s
        assert_contains: expected stderr to name a fedora-installable package
        got: "Secure credential storage is unavailable. Install libsecret
              (e.g. `sudo apt-get install -y libsecret-1-0`) and run
              `deadrop login` again."
        → cli/lib/auth/cache.ts:33  keychainUnavailableMessage()
        log: tests/sandbox/.logs/2026-08-09T14-22-03/fedora/40-keychain-degradation.log

tests/sandbox › artifact
  PASS  50-glibc-floor              0.4s

12 passed, 1 failed (13 cells, 25.9s)
```

Failures print the assertion plus its immediate context and nothing else. Full
logs are **always** written for deliberate grepping, pass or fail. `--verbose`
streams everything; `--json` emits a machine-readable summary.

Exit codes: `0` all passed · `1` a scenario failed (a real code problem) · `2`
environment problem (podman missing, machine stopped, image build failed). The
`1`/`2` split matters — an agent must never report a broken container runtime as
a product bug.

`doctor` and every exit-`2` path print the exact fix, never a stack trace:

```
podman machine is not running.
  Fix: podman machine start
```

## 10. CI graduation path

Not built now. Designed for.

Scenarios depend only on the §6 env contract, never on podman. `runner.sh` is
the sole container-aware file. GitHub's `ubuntu-latest` *is* Linux, so a future
workflow builds the artifact in its own job (which is what `cli_publish_workflow.yml`
already does), serves it, sets `SANDBOX_SCRIPTS` / the two `DEADROP_RELEASES_*`
vars / a fresh `HOME`, and loops the same scenario files unchanged; the `fedora`
profile maps to the workflow `container:` key. Document this in
`tests/CLAUDE.md` so the eventual CI work is transcription, not redesign.

Two things must hold to keep that true, and both are review criteria:

1. No scenario shells out to `podman`, or references image or volume names
2. No scenario assumes it can `sudo` (CI runners can; we run as `sandbox`
   precisely so nothing starts depending on root)

Scenario `50` is the natural first graduation candidate, and the one place a
pipeline gate would be clearly warranted rather than merely possible. It is a
pure post-build artifact property, needs no container at all, and the failure it
catches ships silently to every user on an older distro. If any of this ever
becomes a blocking CI step, start there — not with the install scenarios.

## 11. Deferred, with reasons

- **musl / Alpine.** Dropped when the matrix narrowed to the two most common
  distro families. This costs coverage of the `@libsql/linux-arm64-musl`
  optional-dependency path, and of a **suspected live bug**: `install.sh:15` runs
  `ldconfig -p | grep -q libsecret-1`, but musl's `ldconfig` does not implement
  `-p`. Under `set -euo pipefail` with `if !`, that plausibly makes the script
  claim libsecret is missing on Alpine even when it is installed. Unverified —
  worth a scenario if Alpine ever becomes a supported target.
- **x64.** Everything runs native arm64; emulated x64 was excluded for speed and
  fidelity. This lands differently for the two products. The CLI publishes both
  `deadrop-linux-x64` and `deadrop-linux-arm64`
  (`cli_publish_workflow.yml:27,30`), so scenarios 10/30/40 exercise a genuine
  arm64 artifact and the x64 twin simply goes untested. The desktop app
  publishes **only** `Linux (x86_64 AppImage)`
  (`desktop_publish_workflow.yml:31`) — there is no aarch64 build at all, so
  under `--live` on an arm64 host scenario 20 installs a foreign-arch AppImage.
  That remains a valid test, because scenario 20 asserts placement, permissions,
  sidecar, and EXDEV behavior and never executes the binary. It stops being
  valid the moment anything tries to launch it (§13.5).
- **gnome-keyring happy path.** See §8/`40`. If it is ever wanted, it belongs in
  its own scenario that can be skipped, not folded into the degradation tests —
  and §13's GUI profile is the natural home for it, since a real desktop session
  starts D-Bus and the keyring daemon properly.
- **Windows.** `install-desktop.sh:18` exits pointing at `deadrop desktop
  install`, and a native `install-desktop.ps1` remains an untracked fast-follow.
  Out of scope here entirely.
- **AppImage execution.** We assert placement, permissions, and (statically)
  link compatibility, but never launch. A real launch needs FUSE and a display —
  that is §13.5, and it is a different kind of tool: an experimentation shell,
  not a test.

## 12. Implementation order

1. ~~`doctor`, builder + target images, `runner.sh`~~ — **done**
2. ~~`harness.sh` / `assert.sh` / registry + the base-URL override (§7)~~ — **done**
3. ~~`10-install-cli` on `ubuntu`~~ — **done**
4. ~~`Containerfile.fedora`~~ — **done**, `10` green on both
5. Scenarios `20`, `30`, `40`
6. Scenario `50` — independent of everything above; can be pulled earlier if the
   build-runner pin is being touched
7. Scenario `60` — also independent, and worth pulling forward while the field
   report is fresh; it is the workbench for §13.6 rather than a guard on
   existing behavior
8. Scenario `70` — last, since it composes the others; needs §13.7 to get past
   `deadrop init`
9. `affected`, `--json`, docs in `tests/CLAUDE.md`, pointers in root and
   `cli/CLAUDE.md`

Step 3 is the checkpoint worth pausing at. If a scenario at that point is not
obviously portable to a bare `ubuntu-latest` runner, the abstraction is wrong
and §10 is already lost.

None of §13 is in this order. The headless suite ships first and is blocked on
nothing below.

## 13. Sequenced follow-ons

Each is independently justified and independently shippable. The ordering is a
dependency chain, not a wishlist.

### 13.1 Package-manager-agnostic remediation text

`cli/lib/auth/cache.ts:33` hardcodes ``sudo apt-get install -y libsecret-1-0``.
That advice is wrong on Fedora (`libsecret`, via dnf) and wrong on Arch
(`libsecret`, via pacman) — a user following our own error message hits a second
error. Scenario `40` fails on the `fedora` profile from day one because of this;
this is the fix that turns it green.

Do what `install.sh:18-20` already does and name all three, rather than
detecting the distro. Detection is more code and more ways to be wrong, and the
message is short enough to list variants inline.

Cheap, no dependencies, and it is the one confirmed user-facing Linux bug this
design surfaced before writing a line of sandbox code.

### 13.2 Opt-in emulated x86_64

The default matrix is arm64-native, which is fast and matches the development
machine. It does not match most Linux users, and it categorically does not match
desktop: `desktop_publish_workflow.yml` ships x86_64 **only** (§11).

Add `--arch amd64`, running the same profiles and scenarios under
`podman --platform linux/amd64` with qemu. Scenarios are already architecture-
agnostic bash, so this costs a runner flag rather than new test code. Expect
roughly 5-10x slowdown; for install mechanics (curl, chmod, file placement, a
short Node process) that is a minutes-long full pass, which is acceptable for
opt-in pre-release signoff and unacceptable as a default.

Explicitly **not** the same problem as §13.5 — emulating `install.sh` is fine,
emulating WebKitGTK is not.

**Covers the CLI only. It cannot test the desktop AppImage.** Measured, not
assumed: an AppImage stamps its own magic (`AI\x02`) into ELF header bytes 8-10,
and the `binfmt_misc` magic/mask qemu registers for x86-64 requires those bytes
to be zero. The kernel therefore does not recognise an AppImage as an x86-64
ELF and refuses to exec it — `cannot execute binary file: Exec format error`,
on a host where ordinary x86-64 binaries emulate fine. This is structural, not
a configuration problem, and no amount of qemu tuning fixes it. Consequence:
running the desktop app on an arm64 host requires a native aarch64 build
(§13.4). There is no emulated shortcut.

### 13.3 Architecture-aware desktop asset selection

(CPU architecture — nothing to do with Arch Linux.)

See §8/`20`. `cli/lib/update/desktop.ts:142` and `install-desktop.sh:54` select
the first `.AppImage` on a release without filtering by architecture. Harmless
while exactly one Linux desktop build exists; ships an aarch64 binary to x64
users the moment a second one does.

**This is a hard prerequisite for 13.4.** Adding the build first would introduce
a regression for every existing Linux desktop user.

### 13.4 aarch64 Linux AppImage build

Not justified by user demand — Linux desktop is overwhelmingly x86_64, and the
arm64 Linux story is servers and containers, which is the CLI, which already
publishes `deadrop-linux-arm64`. It is justified as developer infrastructure,
and after the §13.2 measurement it is the **only** way to run the desktop app
on an Apple Silicon host at all: emulation is structurally impossible for
AppImages, so without an aarch64 build no local container will ever launch this
app. That promotes it from convenience to prerequisite — for §13.5, and for the
"installed means runnable" bar in §1.

Cost is low. The repo is public, so GitHub's `ubuntu-22.04-arm` hosted runners
are free, and `desktop_publish_workflow.yml`'s matrix is already parameterized —
it is one added row plus widening the `if: matrix.runner == 'ubuntu-22.04'`
guard on the Linux system-dependencies step to cover both runners. Keep the
22.04 glibc pin for the same compatibility reason documented at line 28.

### 13.5 GUI profile

A separate opt-in profile, never part of the 13-cell matrix — this is an
experimentation shell, not a test suite, and the headless suite's speed is a
feature worth protecting.

**It must be Wayland, not X11.** With `DISPLAY` set and `WAYLAND_DISPLAY` unset,
GTK selects its X11 backend, so an Xvfb-based profile would not reproduce a
Wayland-specific WebKitGTK fault — it would report a confident pass on exactly
the bug it exists to investigate. Use a headless Wayland compositor
(`weston --backend=headless-backend.so`, or `sway` under `WLR_BACKENDS=headless`)
with `wayvnc`, reachable over Screen Sharing at `vnc://localhost:5900`. Keep an
XWayland path available for comparison, since running both is how you establish
whether a fault is backend-specific at all.

Fidelity caveat: if the underlying fault is in the DMABUF renderer it is likely
GPU- and driver-dependent, and a container falling back to software rendering
may not reproduce it under any compositor. Treat this profile as a strong lead,
not a verdict.

Launch via `--appimage-extract-and-run` to avoid needing
`/dev/fuse` and `CAP_SYS_ADMIN`, which keeps the container rootless and
consistent with §5. Requires the full WebKitGTK/GTK3/libayatana dependency set
already enumerated in `desktop_publish_workflow.yml`'s Linux setup step.

Once 13.4 lands this runs native on arm64. Attempting it before then means
emulating WebKitGTK under qemu, which is frequently slow to the point of
unusable and sometimes crashes outright — worth an experiment, not worth
designing around.

This is where the gnome-keyring happy path deferred in §8/`40` belongs: a real
desktop session starts D-Bus and the keyring daemon properly, so what was
prohibitively fragile in a bare container becomes straightforward here.

It is also the only place the `Exec=` line from §13.6 can be confirmed to
actually render a window rather than merely parse.

### 13.6 Linux desktop integration

Independent of 13.1-13.5 and shippable at any point; numbered last only to avoid
renumbering cross-references, not because it ranks last. Arguably the highest
user-visible impact of anything here — it is the difference between the desktop
app being installed and being merely downloaded.

Reported by a Linux user, confirmed absent: `grep` across `cli/` and `desktop/`
finds no `.desktop`, no `hicolor`, no `xdg-desktop-menu`, and no
`update-desktop-database`. The only matches are macOS `/Applications` paths.

Both Linux install paths need to gain, alongside placing the AppImage:

1. `~/.local/share/applications/deadrop.desktop` — `Type=Application`, absolute
   `Exec=`, `Icon=deadrop`, `Terminal=false`, sensible `Categories=`
2. The icon at `~/.local/share/icons/hicolor/128x128/apps/deadrop.png`, sourced
   from `desktop/src-tauri/icons/128x128.png`
3. A best-effort `update-desktop-database` / `gtk-update-icon-cache` refresh that
   does not fail the install when those binaries are missing
4. A removal path — nothing currently uninstalls anything, and writing files into
   shared XDG directories without a way to remove them is worse than not writing
   them

Keep both implementations in sync: `install-desktop.sh` and
`installOrUpdateDesktopLinux` (`cli/lib/update/desktop.ts:229`) are already
parallel implementations of the same install, and this doubles the surface where
they can drift.

**Open question, blocking the `Exec=` line only.** Whether the entry needs a
WebKitGTK env prefix under Wayland is unresolved. The candidates are
`WEBKIT_DISABLE_DMABUF_RENDERER=1` (blank window on WebKitGTK 2.42+),
`WEBKIT_DISABLE_COMPOSITING_MODE=1`, and `GDK_BACKEND=x11` as a blunt fallback.
Which applies depends on GPU, driver, and compositor, and baking in the wrong
one is its own defect. Items 1-4 above are not blocked by this — only the exact
`Exec=` value is.

Worth separating two symptoms that arrived described as one: an app missing from
the launcher (items 1-3) and an app that launches but renders blank (the env
prefix). They have different fixes and can occur independently.

### 13.7 Non-interactive `deadrop init`

`cli/actions/init.ts:41` calls Inquirer's `confirm()` to ask about updating
`.gitignore`, with no flag to answer it in advance. In a non-TTY environment
there is nothing to read from, so `init` cannot complete unattended — it blocks
§8/`70` step 2, and it blocks every real user scripting a setup: Dockerfiles,
CI, provisioning, devcontainers.

Add `--yes` (and honor `CI`), matching the non-TTY guard `install.sh:74` already
implements correctly for its own prompt. That script is the in-repo precedent
for how this should behave.

Not Linux-specific — it fails identically on macOS in a non-TTY shell. It
surfaced here only because this is the first thing that ever tried to run the
setup path unattended.
