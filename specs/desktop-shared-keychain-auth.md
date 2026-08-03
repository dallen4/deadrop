# Desktop Shared-Keychain Auth Spec

## Goal

The Tauri desktop app should share one Clerk session with the CLI: signing
in on either surface signs you in on both, by reading/writing the same OS
keychain entry (macOS Keychain / Linux Secret Service via libsecret /
Windows Credential Manager). No separate desktop-only sign-in state.

## Current State

- **CLI** (`cli/lib/auth/cache.ts`) stores Clerk's rotating "native client"
  token — not a plain JWT — in the OS keychain under
  `service = "deadrop-cli"`, `account = "auth-token"`, via `@napi-rs/keyring`
  (npm install path) or `Bun.secrets` (standalone binary path).
  `cli/lib/auth/clerk.ts` runs `clerk-js` in native mode
  (`new Clerk(pk)`, `.load({ standardBrowser: false })`) and wires
  `getFapiClient().onBeforeRequest`/`onAfterResponse` to attach/rotate that
  token as the `authorization` header on every FAPI request — no cookies.
- **Desktop** (`desktop/src/main.tsx`, `desktop/src/layouts/RootLayout.tsx`)
  uses `@clerk/react`'s standard browser-mode `ClerkProvider` — a completely
  separate session (cookies/localStorage), with its own `SignInButton`/
  `UserButton`. No Tauri command/IPC bridge exists yet in
  `desktop/src-tauri/` beyond the default `tauri-plugin-opener` scaffold.

Reusing the CLI's stored token naively (hand-rolled `onBeforeRequest` in the
webview, mirroring the CLI's Node-only code) would hit a real Tauri platform
bug: the webview auto-sends an `Origin` header, and Clerk's backend rejects
requests carrying both `Origin` and `Authorization`
(`origin_authorization_headers_conflict`).

## Proposed State

### 1. Adopt `tauri-plugin-clerk` (Nipsuli/tauri-plugin-clerk)

A community-maintained, production-used (28 stars, actively pushed) Tauri
SDK for Clerk that already solves the Origin/Authorization conflict: it
patches `fetch` in the webview to route Clerk FAPI calls through
`tauri-plugin-http` on the Rust side. It wraps `clerk-fapi-rs`, a Rust
implementation of Clerk's Frontend API, and exposes a JS `initClerk()` that
returns a real `Clerk` instance suitable for `@clerk/react`'s `ClerkProvider`:

```tsx
// desktop/src/main.tsx (replaces the current bare ClerkProvider usage)
import { use, Suspense } from 'react';
import { ClerkProvider } from '@clerk/react';
import { initClerk } from 'tauri-plugin-clerk';

const clerkPromise = initClerk();

const AppWithClerk = () => {
  const clerk = use(clerkPromise);
  return (
    <ClerkProvider publishableKey={clerk.publishableKey} Clerk={clerk}>
      {/* existing RouterProvider tree */}
    </ClerkProvider>
  );
};
```

`SignInButton`/`UserButton` keep working unmodified under this setup — the
plugin's own React example and Clerk's Chrome-extension/Electron packages
run the same non-standard-browser configuration under those same prebuilt
components. Confirmed limitations (irrelevant here): OAuth and magic links
don't work in the default sign-in component. Desktop already only supports
email/password + email OTP (per `desktop/CLAUDE.md`), so this doesn't
regress anything.

Rust side, `desktop/src-tauri/src/lib.rs`:

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_http::init()) // required by tauri-plugin-clerk
    .plugin(
        tauri_plugin_clerk::ClerkPluginBuilder::new()
            .publishable_key(clerk_publishable_key)
            .store(SharedKeychainStore::new())
            .build(),
    )
    // ...
```

Do **not** chain `.with_tauri_store()` (the plugin's default persistence,
backed by `tauri-plugin-store`/plain JSON file) — see below.

### 2. Custom `Store`: redirect the session token to the shared keychain entry

`tauri-plugin-clerk`'s builder accepts `.store(impl clerk_fapi_rs::configuration::Store)`,
a 4-method trait: `set`/`get`/`has`/`delete`, each keyed by `&str`.

Traced through `clerk-fapi-rs` (`src/clerk_state.rs`,
`src/configuration.rs`): the rotating session token is the **only**
security-sensitive value, stored under exactly one key —
`"ClerkFapi:authorization_header"` (default store prefix `"ClerkFapi:"` +
key `"authorization_header"`) — as a JSON string (`Option<String>` via
`serde_json::to_value`). Every other key (cached client/session/user/
environment) is a convenience cache Clerk refetches from the API on load;
it's only consulted as an offline fallback, which is out of scope here.

Implement `desktop/src-tauri/src/keychain_store.rs`:

```rust
use clerk_fapi_rs::configuration::Store as ClerkStateStore;
use keyring::Entry;
use parking_lot::Mutex;
use serde_json::Value as JsonValue;
use std::collections::HashMap;

const AUTH_HEADER_KEY: &str = "ClerkFapi:authorization_header";
const SERVICE: &str = "deadrop";
const LEGACY_SERVICE: &str = "deadrop-cli";
const ACCOUNT: &str = "auth-token";

#[derive(Debug, Default)]
pub struct SharedKeychainStore {
    // Non-auth keys (client/session/user/environment caches): in-memory
    // only, not persisted. No offline-fallback support in this iteration.
    fallback: Mutex<HashMap<String, JsonValue>>,
}

impl SharedKeychainStore {
    pub fn new() -> Self {
        Self::default()
    }
}

// See "Service name migration" below for read_shared_token/write/clear.

impl ClerkStateStore for SharedKeychainStore {
    fn set(&self, key: &str, value: JsonValue) {
        if key == AUTH_HEADER_KEY {
            match value.as_str() {
                Some(token) if !token.is_empty() => write_shared_token(token),
                _ => clear_shared_token(), // empty string / null == explicit clear
            }
            return;
        }
        self.fallback.lock().insert(key.to_string(), value);
    }

    fn get(&self, key: &str) -> Option<JsonValue> {
        if key == AUTH_HEADER_KEY {
            return read_shared_token().map(JsonValue::String);
        }
        self.fallback.lock().get(key).cloned()
    }

    fn has(&self, key: &str) -> bool {
        if key == AUTH_HEADER_KEY {
            return read_shared_token().is_some();
        }
        self.fallback.lock().contains_key(key)
    }

    fn delete(&self, key: &str) -> bool {
        if key == AUTH_HEADER_KEY {
            clear_shared_token();
            return true;
        }
        self.fallback.lock().remove(key).is_some()
    }
}
```

`write_shared_token`/`read_shared_token`/`clear_shared_token` wrap the
`keyring` crate (Rust equivalent of `@napi-rs/keyring`, same native
backends) against `SERVICE`/`ACCOUNT` — see migration behavior below.

### 3. Service name migration: `deadrop-cli` → `deadrop`

The CLI is already published (npm + standalone binary) with
`service = "deadrop-cli"`. Now that this entry is shared with desktop, that
name reads oddly. Standardize on `service = "deadrop"` going forward, but
don't force a silent re-login for existing CLI users — support a one-time,
self-healing migration on read, implemented on **both** platforms (whichever
app runs first after the upgrade performs the migration for both):

- **Read**: try `(deadrop, auth-token)` first. If no entry, try
  `(deadrop-cli, auth-token)`. If found under the legacy name, migrate it —
  write the value to `(deadrop, auth-token)`, delete
  `(deadrop-cli, auth-token)` — then return the token. Converges to fully
  migrated after the first successful read on either platform.
- **Write** (`setSession`/`write_shared_token`): only ever writes
  `(deadrop, auth-token)`.
- **Clear** (`clearSession`/`clear_shared_token`): delete
  `(deadrop, auth-token)`; also attempt to delete
  `(deadrop-cli, auth-token)` if a migration hasn't happened yet (best
  effort, ignore errors — matches the existing `clearSession`'s
  already-gone-is-fine semantics).

#### `cli/lib/auth/cache.ts` changes

```ts
const SERVICE = 'deadrop';
const LEGACY_SERVICE = 'deadrop-cli';
const ACCOUNT = 'auth-token';
```

`getToken()` gains a fallback branch: on a missing-entry result from
`(SERVICE, ACCOUNT)`, retry against `(LEGACY_SERVICE, ACCOUNT)`; on a hit,
call a new `migrateServiceName(token)` helper that writes it forward under
`SERVICE` and best-effort deletes the `LEGACY_SERVICE` entry before
returning the token. Keep the existing once-per-process backend-unreachable
warning behavior unchanged — the fallback only triggers on a genuine
missing-entry result, not a backend failure.

`setSession()`/`clearSession()` target `SERVICE` only (`clearSession` also
best-effort-deletes `LEGACY_SERVICE`, swallowing errors the same way it
already does for `SERVICE`).

The Bun.secrets branch gets the identical fallback/migration logic — same
shape, different API surface (`Bun.secrets.get/set/delete`).

#### Rust side

`read_shared_token`/`write_shared_token`/`clear_shared_token` implement the
identical try-new-then-legacy-then-migrate logic against `keyring::Entry`,
so a fresh desktop install run before the CLI is ever re-run still performs
the migration correctly.

### 4. Sign-out: explicit full clear

Clerk's own `signOut()` deactivates the session but does **not** clear the
client-level token (by design — supports multi-account switching), which is
why the CLI's `logout.ts` already calls `clearSession()` explicitly after
`clerkClient.signOut()`. Desktop needs the same guarantee for
`UserButton`'s built-in sign-out action.

No new custom Tauri command needed: the plugin's existing
`set_client_authorization_header(header: Option<String>)` command already
forwards straight to our `Store::set`, and `SharedKeychainStore::set`
treats a `null`/empty-string write to `AUTH_HEADER_KEY` as a full clear (see
above — `serde_json::to_value(None::<String>)` becomes `JsonValue::Null`,
whose `.as_str()` is `None`, hitting the clear branch). Add an app-level
Clerk session listener in `desktop/src/main.tsx` (alongside the existing
`Clerk={clerk}` wiring) that, when session transitions from present to
`null`, invokes `plugin:clerk|set_client_authorization_header` with
`{ header: null }` — reusing the plugin's own IPC surface rather than
adding a new one.

### 5. Signed-out UI: unchanged

Per user decision, desktop keeps its own sign-in flow — `SignInButton
mode="modal"` stays exactly as-is (`desktop/src/layouts/RootLayout.tsx`).
If a shared session is already in the keychain, `ClerkProvider` hydrates
signed-in before the modal would ever render; otherwise clicking "Sign in"
opens Clerk's normal modal UI, now running against the native-mode client.

## Dependencies

- `desktop/src-tauri/Cargo.toml`: `tauri-plugin-clerk`, `clerk-fapi-rs`
  (transitive, for the `Store` trait), `keyring`, `tauri-plugin-http`
  (required by `tauri-plugin-clerk`), `parking_lot` (already a transitive
  dep pattern used elsewhere in the repo's Rust code — reuse rather than
  add a different mutex crate).
- `desktop/package.json`: `tauri-plugin-clerk` (guest-js side).
- `desktop/src-tauri/capabilities/default.json`: add `"clerk:default"` and
  an `http:default` permission scoped to the Clerk FAPI host (not a bare
  `https://*` allow — narrow it to the actual Clerk frontend API origin
  used by this instance's publishable key).

## Error Handling / Edge Cases

- **Keychain backend unavailable** (Linux missing libsecret, user denies a
  macOS/Windows access prompt): mirror the CLI's behavior —
  `SharedKeychainStore::get` swallows the error and returns `None` (falls
  back to signed-out UI, not a crash); a genuine backend failure (vs. a
  clean missing-entry result) should be logged once, not spammed on every
  FAPI call.
- **Stale/expired token in the keychain**: Clerk's own session validation on
  load handles this the same way it already does for the CLI — an invalid
  token results in a signed-out `ClerkProvider` state, not a crash. No
  special handling needed beyond what `clerk-fapi-rs`/`clerk-js` already do.
- **Revoked session mid-use**: same as today's desktop behavior — Clerk's
  FAPI responses drive session state; no new handling required.
- **Migration race** (CLI and desktop both run for the first time
  post-upgrade concurrently): both attempt the same read-legacy /
  write-new / delete-legacy sequence. Worst case is a harmless double-write
  of the same token value; the delete of the legacy entry is idempotent
  (already-gone is treated as success on both platforms). No locking needed.

## Out of Scope

- Offline fallback via the plugin's non-auth-header store keys (client/
  session/user/environment caches) — left in-memory-only for this
  iteration.
- OAuth-via-deep-link for packaged desktop builds (tracked separately in
  `desktop/CLAUDE.md`'s follow-ups list).
- Narrowing the CSP (`desktop/src-tauri/tauri.conf.json`'s
  `security.csp: null`) — unrelated to this change, already a known
  follow-up.

## Verification

1. **CLI, npm path**: `deadrop login`, confirm token under
   `security find-generic-password -s deadrop -a auth-token` (macOS) — not
   `-s deadrop-cli`. `deadrop whoami` reports signed in.
2. **CLI migration**: manually seed a `deadrop-cli`/`auth-token` keychain
   entry (simulating a pre-upgrade install), run `deadrop whoami` — reports
   signed in, and the entry has moved to `deadrop`/`auth-token` (verify via
   `security find-generic-password`); the legacy entry is gone.
3. **Desktop reads CLI session**: `deadrop login` in a terminal, then launch
   the desktop app fresh (`pnpm desktop:dev`) — should render signed-in
   with no sign-in modal.
4. **Desktop writes back**: sign out of the CLI (`deadrop logout`), sign in
   via the desktop app's modal, then run `deadrop whoami` — reports signed
   in as the desktop-originated session.
5. **Sign-out from desktop clears both**: sign in on desktop, sign out via
   `UserButton`, then `deadrop whoami` — reports signed out; confirm the
   keychain entry is actually gone, not just empty.
6. **Desktop-first migration**: seed a `deadrop-cli` entry, skip running the
   CLI, launch desktop directly — renders signed in and migrates the entry
   (same check as #2, triggered from the Rust side).
7. **Backend unavailable** (Linux, no libsecret): desktop renders the
   signed-out state (modal available) instead of crashing; a single log line
   notes the backend failure, not a spam loop.
