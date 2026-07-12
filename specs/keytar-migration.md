# Keychain Migration Spec

## Current State

`cli/lib/auth/cache.ts` stores a Clerk JWT + timestamp as a YAML file at `<cwd>/.deadrop/creds` using cosmiconfig. The token sits in plaintext on disk in whatever directory the user runs `deadrop` from.

Problems:
- Plaintext credential on disk
- Tied to `cwd()` — different directories = different auth sessions
- No OS-level access control

## Proposed State

Two credential backends selected at build time:

- **Node.js (JS bundle via npm):** `@napi-rs/keyring` — native OS keychain bindings (Keychain on macOS, libsecret/Secret Service on Linux, Credential Manager on Windows). A maintained, prebuilt-binary alternative to the archived `keytar`.
- **Bun (compiled binary):** Bun's built-in `Bun.secrets` API — same OS credential stores.

`cache.ts` exports the same interface (`getToken`, `setSession`, `clearSession`) regardless of backend.

### Backend selection: `DEADROP_INSTALL_METHOD`, not `typeof Bun`

Branch on the build-time constant `process.env.DEADROP_INSTALL_METHOD`. It is **already** baked by both pipelines:

- `cli/scripts/esbuild.js` → `environmentPlugin({ ..., DEADROP_INSTALL_METHOD: 'npm' })`
- `cli/scripts/bun-build.ts` → `envVars['process.env.DEADROP_INSTALL_METHOD'] = JSON.stringify('binary')`

Because each pipeline replaces `process.env.DEADROP_INSTALL_METHOD` with a string literal, `process.env.DEADROP_INSTALL_METHOD === 'binary'` folds to a constant at build time and the unused branch is dead-code-eliminated:
- esbuild (npm bundle): folds to `false` → the `Bun.secrets` branch is dropped.
- Bun (binary): folds to `true` → the `@napi-rs/keyring` branch (and its `require`) is dropped, so the native `.node` addon is never pulled into the single-file binary.

Do **not** branch on `typeof Bun`: it is a runtime check the bundlers cannot fold, so Bun would try to bundle the `@napi-rs/keyring` native addon into the binary and fail. bun-build.ts already documents this exact hazard in a comment.

The keyring dependency is loaded via an inline `require('@napi-rs/keyring')` *inside* the non-binary branch (never a top-level `import`), so Bun reliably drops it once that branch is eliminated.

For the same reason, write the comparison inline in each function — do **not** extract it into a helper like `const isBinary = () => ...`. Define-substitution only folds the literal comparison at the site where it appears; neither bundler inlines function calls, so a helper makes the branch opaque, DCE stops working, and the Bun compile fails trying to bundle the native addon.

## File-by-File Implementation

### 1. `cli/lib/auth/cache.ts` — full rewrite

Replace the entire file with:

```ts
import { logInfo } from '../log';

const SERVICE = 'deadrop-cli';
const ACCOUNT = 'auth-token';

let warnedKeychainError = false;

// Warn once per process when the keychain backend is unreachable
function warnKeychainOnce(): void {
  if (warnedKeychainError) return;
  warnedKeychainError = true;
  logInfo(
    'Could not reach your OS keychain; continuing unauthenticated. Run `deadrop login` once your keychain is available.',
  );
}

// NoEntry (no stored credential) vs a real backend failure
function isMissingEntry(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? '').toLowerCase();
  return msg.includes('no matching entry') || msg.includes('no entry');
}

// Linux failures are almost always the missing libsecret shared lib;
// macOS/Windows failures are almost always the user denying the
// keychain/Credential Manager access prompt. Point at the fix for each,
// since "install libsecret" is meaningless (and confusing) on a Mac.
function keychainUnavailableMessage(): string {
  if (process.platform === 'linux') {
    return 'Secure credential storage is unavailable. Install libsecret (e.g. `sudo apt-get install -y libsecret-1-0`) and run `deadrop login` again.';
  }
  return 'Secure credential storage is unavailable. If your OS just prompted for keychain access, allow it and run `deadrop login` again.';
}

// Never throws: missing entry is silent, backend failure warns once
export async function getToken(): Promise<string> {
  try {
    if (process.env.DEADROP_INSTALL_METHOD === 'binary') {
      return (
        (await Bun.secrets.get({ service: SERVICE, name: ACCOUNT })) ?? ''
      );
    }
    const { Entry } = require('@napi-rs/keyring');
    return new Entry(SERVICE, ACCOUNT).getPassword() ?? '';
  } catch (err) {
    if (!isMissingEntry(err)) warnKeychainOnce();
    return '';
  }
}

// Login-only write: failure surfaces instead of faking a successful login
export async function setSession(token: string): Promise<void> {
  try {
    if (process.env.DEADROP_INSTALL_METHOD === 'binary') {
      await Bun.secrets.set({
        service: SERVICE,
        name: ACCOUNT,
        value: token,
      });
      return;
    }
    const { Entry } = require('@napi-rs/keyring');
    new Entry(SERVICE, ACCOUNT).setPassword(token);
  } catch {
    throw new Error(keychainUnavailableMessage());
  }
}

export async function clearSession(): Promise<void> {
  try {
    if (process.env.DEADROP_INSTALL_METHOD === 'binary') {
      await Bun.secrets.delete({ service: SERVICE, name: ACCOUNT });
      return;
    }
    const { Entry } = require('@napi-rs/keyring');
    new Entry(SERVICE, ACCOUNT).deletePassword();
  } catch {
    // already gone or backend unavailable
  }
}
```

API details to get right:
- `Bun.secrets.set` takes a single object with a `value` field: `set({ service, name, value })`. It is **not** a two-arg `set(options, token)` call.
- `Bun.secrets.get` / `.delete` take `{ service, name }`. `.get` returns `string | null`.
- `@napi-rs/keyring` uses the sync `Entry` class (constructor `new Entry(service, username)`, methods `getPassword()` / `setPassword(pw)` / `deletePassword()`). `getPassword()` returns `string | undefined` and throws `NoEntry` when missing — the `try/catch` handles both.
- `isMissingEntry` matches the NoEntry error **message string**, which is version-sensitive: verify the actual message thrown by the installed `@napi-rs/keyring` version (a quick script or the unit test in Verification #7) and widen the match if it differs.
- The removed exports `readAuthCache` / `writeAuthCache` had no external consumers (only `getToken`/`setSession` are imported, by `clerk.ts`) — safe to drop.
- The `Bun` global typechecks because `@types/bun` is already a devDep. No new type dependency.

### 2. `cli/lib/auth/cache.ts` — add legacy migration helper

Append to the same file (the one-time notify-and-delete for the old plaintext creds). `logInfo` is already imported by the rewrite above; add only the `fs` / `process` / constants imports:

```ts
import { existsSync, unlinkSync } from 'fs';
import { cwd } from 'process';
import { STORAGE_DIR_NAME } from '@shared/lib/constants';

// Remove the legacy plaintext creds file from cwd, if present
export function migrateLegacyCreds(): void {
  const legacyPath = `${cwd()}/${STORAGE_DIR_NAME}/creds`;
  if (!existsSync(legacyPath)) return;
  unlinkSync(legacyPath);
  logInfo(
    'Removed legacy plaintext credential; credentials now use your OS keychain. Run `deadrop login` to sign in again.',
  );
}
```

Confirm the `logInfo` import path resolves the same way `logout.ts` imports it (`lib/log`); adjust the relative specifier if needed so it matches the existing convention in `cli/lib/`.

### 3. `cli/index.ts` — call the migration once at startup

Add the import and invoke it after the version checks, before `deadrop.parse()`:

```ts
import { migrateLegacyCreds } from 'lib/auth/cache';
// ...
checkBunVersion();
checkNodeVersion();
migrateLegacyCreds();

deadrop.parse();
```

### 4. `cli/actions/logout.ts` — use `clearSession()`

Replace the file-deletion block. The current file imports `existsSync`, `unlink`, `STORAGE_DIR_NAME`, and `cwd` solely to delete the creds file; remove all four. New version:

```ts
import { createClerkClient } from 'lib/auth/clerk';
import { clearSession } from 'lib/auth/cache';
import { logInfo } from 'lib/log';

export default async function logout() {
  const clerkClient = await createClerkClient();

  if (!clerkClient.session) {
    logInfo(
      `You're not signed in right now!\nRun \`deadrop login\` to get started.`,
    );

    return process.exit(0);
  }

  await clerkClient.signOut();

  await clearSession();

  logInfo('Successfully signed out!');

  process.exit(0);
}
```

### 5. `cli/scripts/esbuild.js` — externalize the native addon

`@napi-rs/keyring` is a native `.node` addon and cannot be bundled. Add it to the existing `external` array:

```js
external: ['libsql', 'node-datachannel', '@napi-rs/keyring'],
```

No change to `bun-build.ts` — the keyring branch is DCE'd out of the binary (see backend-selection section). If Bun ever fails to eliminate it, the symptom is a compile error resolving `@napi-rs/keyring`; the fix is to confirm the `DEADROP_INSTALL_METHOD` define is present in `bun-build.ts`, not to add a Bun external (a compiled single-file binary cannot resolve an external native addon at runtime).

**Also add `minifySyntax: true` to the `build()` call.** The `DEADROP_INSTALL_METHOD` define alone does not eliminate the dead `Bun.secrets` branch from the npm bundle — esbuild only performs dead-branch elimination on constant-folded conditions when `minifySyntax`/`minify` is set, and `esbuild.js` previously built unminified. Without it the `Bun.secrets` calls survive as inert text in `dist/deadrop.js` (harmless at runtime since the guard is always `false` there, but it fails the grep in Verification #2). `minifySyntax: true` drops dead branches without mangling identifiers or whitespace, so the bundle stays readable. `bun-build.ts` already sets `minify: true` and doesn't need this change.

### 6. `cli/package.json` — deps

Add to `dependencies`:

```json
"@napi-rs/keyring": "^1.3.0"
```

(Pin to the current latest — `1.3.0` as of this migration, not the `1.1.7` in earlier drafts of this spec; check `npm view @napi-rs/keyring version` before implementing, since it may have moved again. `@napi-rs/keyring` ships its platform binaries as its own `optionalDependencies`, so pnpm resolves the correct `.node` automatically — no manual per-platform entries needed, unlike `libsql`.)

Do **not** add any type dep — `@types/bun` is already present in `devDependencies`.

### 7. `cli/actions/whoami.ts` — new command

A read-only check of the current sign-in state, so users have a way to confirm credentials actually made it into the OS keychain (or that a stored token is still valid) without triggering a full `login`/`logout` cycle. Mirrors `logout.ts`'s shape:

```ts
import { createClerkClient } from 'lib/auth/clerk';
import { logInfo } from 'lib/log';

export default async function whoami() {
  const clerkClient = await createClerkClient();

  if (!clerkClient.session) {
    logInfo(
      `You're not signed in.\nRun \`deadrop login\` to get started.`,
    );

    return process.exit(0);
  }

  logInfo(
    `Signed in as ${clerkClient.session.user.emailAddresses[0]}`,
  );

  process.exit(0);
}
```

Wire it into `cli/core.ts` next to `login`/`logout`:

```ts
import whoami from 'actions/whoami';
// ...
deadrop
  .command('whoami')
  .description('check whether you are signed in')
  .action(whoami);
```

`createClerkClient()` resolving `clerkClient.session` already round-trips through `getToken()` (keychain read) and Clerk's own session validation, so `whoami` doubles as a smoke test for the keychain backend — a bare `security find-generic-password -s deadrop-cli -a auth-token` (macOS) or `secret-tool lookup service deadrop-cli account auth-token` (Linux) only proves *something* is stored, not that it's still a valid session.

### Out of scope — do NOT remove `cosmiconfig` or `yaml`

Both remain load-bearing for the deadrop config file in `cli/lib/config.ts`:
- `cosmiconfig('deadrop')` powers `loadConfig()` (config discovery).
- `yaml`'s `parse` / `stringify` power `loadConfigFromPath()` and `saveConfig()`.

Only `cache.ts` stops importing them; both packages stay in `dependencies`.

## Linux: libsecret System Dependency

Both `Bun.secrets` and `@napi-rs/keyring` use `libsecret` (GNOME Keyring / KWallet) on Linux. It's a system shared library loaded at runtime via `dlopen` — it cannot be bundled into either the Bun binary or the JS bundle. macOS (Keychain) and Windows (Credential Manager) have no equivalent runtime dependency.

**What `install.sh` should do on Linux** (add after Linux detection):
```bash
if ! ldconfig -p | grep -q libsecret-1; then
  echo "deadrop requires libsecret for secure credential storage."
  echo "Install it with:"
  echo "  Ubuntu/Debian: sudo apt-get install -y libsecret-1-0"
  echo "  Fedora/RHEL:   sudo dnf install -y libsecret"
  echo "  Arch:          sudo pacman -S libsecret"
fi
```

Runtime package is `libsecret-1-0` (not `-dev`); `@napi-rs/keyring` ships prebuilt `.node` files, so only the shared lib is needed. For CI / Docker images: `apt-get install -y libsecret-1-0`.

## macOS/Windows: repeated access prompts on unsigned/dev builds

macOS ties a Keychain item's ACL to the specific requesting binary. Ad-hoc/dev builds (esbuild output run via plain `node`, or a locally `bun compile`d binary) get a different signature on every rebuild, so the OS treats each rebuild as a new, untrusted app and re-prompts for access — this is expected during development, not a bug. A `deadrop login` run can also trigger two separate prompts in the same process (one for the `getToken` read, one for the `setSession` write), since macOS can gate reads and writes on an item separately.

For a real release this goes away once the Bun binary is codesigned and notarized with a stable Apple Developer ID: "Always Allow" then persists across runs of that specific signed artifact. Signing/notarizing the release binary is tracked as a follow-up (not part of this migration) — needs an Apple Developer account and a CI signing step.

## Fallback Behavior (read vs write asymmetry)

- **Reads (`getToken`)** never throw — they return `''` (anonymous). But the three cases are distinguished: no stored credential is silent (normal signed-out), whereas an unreachable/broken backend warns **once per process** ("Could not reach your OS keychain; continuing unauthenticated…") so the user isn't left wondering why auth silently stopped. This is the hot path (every API call via `clerk.ts` `onBeforeRequest`), hence the once-per-process guard.
- **Writes (`setSession`)** throw a platform-appropriate error — the one point where the user can act on it. On Linux this names libsecret (the likely cause); on macOS/Windows it points at the OS keychain/Credential Manager access prompt instead, since "install libsecret" is meaningless there and the actual cause on those platforms is almost always the user denying (or not being asked about) that prompt. Falling back to plaintext storage on denial is explicitly out of scope — it would undo the entire point of this migration, so a write failure fails the login instead of silently degrading to disk.

## Verification

Run all of these; each must pass:

1. **Typecheck:** `pnpm -F cli exec tsc --noEmit` (or the repo's cli typecheck script) — confirms the `Bun` global and `@napi-rs/keyring` types resolve.
2. **npm bundle build:** `pnpm cli:build` — must succeed with `@napi-rs/keyring` externalized; grep `dist/deadrop.js` to confirm no `Bun.secrets` string survives (branch DCE'd — requires `minifySyntax: true` per step 5 above, not just the `define`).
3. **Bun binary build:** `pnpm -F cli compile` — must succeed; the compile must not attempt to resolve `@napi-rs/keyring` (branch DCE'd).
4. **Runtime, Node path (npm):** `deadrop login` then `deadrop whoami` prints the signed-in email; `deadrop grab`/authenticated call succeeds; token is in the OS keychain, not on disk (`security find-generic-password -s deadrop-cli -a auth-token` on macOS). `deadrop logout` clears it and `deadrop whoami` reports signed-out again.
5. **Runtime, missing backend:** with libsecret unavailable (or simulated by mocking `Entry` to throw a non-NoEntry error), an authenticated command still runs anonymously (no crash) and prints the "Could not reach your OS keychain" warning exactly once even across multiple reads in one process; `deadrop login` fails with the libsecret message. Separately confirm a genuinely signed-out run (no credential stored) prints **no** such warning.
6. **Migration:** create a stub `./.deadrop/creds` file, run any `deadrop` command → file is deleted and the re-auth notice prints once; a second run prints nothing.
7. **Unit tests:** `pnpm vitest run --project cli` stays green; cover all three `getToken` outcomes: (a) `getPassword` throws a NoEntry-message error → returns `''`, no warn; (b) `getPassword` throws a non-NoEntry error → returns `''`, warns exactly once across repeated calls; (c) `getPassword` returns a token → returns it. Reset the module (or the `warnedKeychainError` flag) between cases so the once-per-process guard doesn't leak across tests.

   **Mocking gotcha:** `cache.ts` loads `@napi-rs/keyring` via an inline `require()` inside each function (required for bundler DCE — see the backend-selection section), which `vi.mock('@napi-rs/keyring', ...)` does **not** intercept; it only patches statically-imported specifiers, and a probe test confirms the real native module gets hit instead of the mock. Mock it by `require()`-ing the real module once at the top of the test file and `vi.spyOn(keyring, 'Entry').mockImplementation(...)` — Node's module cache means `cache.ts`'s own `require()` calls resolve to the same patched object.

## Post-Merge

Update the memory pointer for this spec: backend is `@napi-rs/keyring` (Node) + `Bun.secrets` (binary), not `keytar`; `deadrop whoami` is the way to check sign-in state / verify the keychain write worked.
