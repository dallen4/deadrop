# Vault as a drop payload type

Share a cloud vault by dropping its config. The payload is one vault entry
with a read-only token and whichever environment keys the owner selects.

## Why this is the right shape

deadrop already has an E2E encrypted, peer-to-peer, one-time-ish channel for
handing someone a secret. A vault share *is* handing someone a secret: a
read-only DB token plus per-environment AES keys. Building a separate sharing
mechanism would mean reimplementing a worse version of the product.

It also needs no new backend. `POST /vault/tokens` already mints **read-only**
tokens scoped to the caller's own vault
(`createVaultToken(vaultName, 'read-only')` in `worker/src/routers/vault.ts`),
which is exactly the credential a reader needs. The owner-side capability
exists today; only composition and recognition are missing.

## Payload

```yaml
vaults:
  acme:
    environments:
      production: <base64 AES-256 key>
      staging: <base64 AES-256 key>
    cloud:
      name: a1b2c3d4e5f67-acme
      authToken: <read-only JWT>
```

`environments` is a map of environment name to key (`shared/lib/vault.ts`), so
the owner chooses per-environment granularity. Sharing production without
development is a natural consequence of the existing structure, not a feature
that needs building.

`location` is deliberately absent. It is the recipient's local replica path
and only they can supply it. See "Import must rewrite location" below.

### Size

`MAX_PAYLOAD_SIZE` is 16,000 bytes (`shared/config/files.ts`, per RFC 8831).
A share payload is a ~44-char base64 key per environment, a JWT of a few
hundred bytes, and a name. Roughly 1KB for a typical vault. No chunking
concern.

## Wire representation: reuse `raw`, discriminate on `meta`

Two options:

**A. New `PayloadMode`.** `'raw' | 'file' | 'vault'`. Semantically clean, but
`mode` is on the wire (`DropMessage` in `shared/types/messages.ts`) and is
switched on across web, cli, vscode, and desktop. An older grabber receiving
`mode: 'vault'` falls through those switches unpredictably.

**B (recommended). `mode: 'raw'` plus a `meta` discriminator.** `DropMessage`
already carries optional `meta: DropMessageMeta` (`{ type, name }`), used
today for file metadata. A vault drop sets something like
`meta.type = 'application/vnd.deadrop.vault'` and `meta.name` to the vault
name.

B degrades gracefully: a grabber that does not recognize the meta type shows
the payload as text, which is a readable YAML fragment the recipient could
save by hand. That is a meaningfully better failure mode than an unhandled
mode value, and it matters because CLI and extension versions drift
independently of web.

`PayloadInputMode` (`'text' | 'json' | 'file'`) is the *UI* input selector and
does **not** gain a `vault` option. Users do not hand-author these; the vault
page composes them.

## Flow

### Drop side

Entry point is the vault page, not the drop page. "Share vault" opens a modal
that:

1. Lists the active vault's environments with checkboxes (at least one).
2. Warns plainly that this grants read access to the selected environments'
   secrets.
3. Mints a read-only token via `POST /vault/tokens` with a bounded
   `expiration` (see `specs/desktop-vault-credentials.md`).
4. Composes the fragment, calls the drop flow's `setPayload(yaml, 'raw')`
   with the vault meta, and routes to the drop UI.

The drop UI then renders its normal share pane. It should show "Vault: acme
(production, staging)" in place of the secret input card, since the payload is
already staged.

### Grab side

On a payload whose meta type is the vault type, `GrabFlow` offers **"Add to my
vaults"** as the primary action instead of copy-to-clipboard. That path:

1. Parses the fragment.
2. Prompts for a local name if it collides with an existing vault.
3. Allocates a local replica path and writes it as `location`.
4. Merges into the recipient's config via the existing save path.

Copy-to-clipboard stays available as a secondary action for anyone who wants
to handle it manually.

## CLI surface

### `deadrop vault drop`

Sits with the other vault subcommands in `cli/core.ts` (`vaultRoot`).
Naming it `drop` rather than `share` keeps the product verb: someone who
knows `deadrop drop` understands immediately what it does and that the
recipient runs `deadrop grab`.

```
deadrop vault drop [name]
  -e, --env <env...>       environments to include (default: active environment)
  --expires <duration>     token lifetime (default: 30d)
  -g, --grabbers <n>       number of recipients (early-access gated)
```

`[name]` defaults to the active vault. Composes the same fragment as the
desktop modal, mints the read-only token, and hands off to the existing drop
flow. Prints the grab command for the recipient, as `deadrop drop` already
does.

It must refuse to drop a vault the user does not own (`userOwnsVault`), since
minting is owner-only.

### `deadrop grab` receiving a vault

The drop flow is unchanged. Only the post-receipt branch is new: when the
payload's meta marks it a vault, instead of printing the secret, resolve a
config to merge it into.

**Resolution order** mirrors `loadConfig()` (`cli/lib/config.ts`):

1. cosmiconfig search upward from cwd for a project-scoped `.deadroprc`
2. else the global config (`globalConfigPath()`, `cli/lib/global-config.ts`)
3. else **prompt**

When one is found, merge and report which file was written. When neither
exists, ask where it should go:

```
No deadrop config found. Where should this vault go?
  > this directory  (./.deadroprc)
    global          (~/Library/Application Support/com.deadrop/.deadroprc)
```

The global option is the same app-data path the desktop app uses, so a vault
grabbed globally by the CLI shows up in the desktop app with no extra step.
That is the existing cross-surface contract in `global-config.ts`, which
already documents itself as matching Tauri's `app_data_dir()`.

`--global` and `--local` skip the prompt for non-interactive use.

### `loadConfig()` needs a non-fatal variant

`loadConfig()` currently calls `process.exit(1)` when it finds nothing:

```ts
logError('No config found, please run `deadrop init` to get started.');
process.exit(1);
```

The vault-grab path needs "not found" to be a normal outcome, since it is
about to create one. Extract the search into
`findConfig(): Promise<CustomConfigResult | null>` and leave `loadConfig()`
as the exiting wrapper over it, so every existing caller is unaffected.

### Writing the vault in

Three cases beyond the plain merge:

- **Name collision.** If the incoming vault name already exists in the target
  config, prompt for a new local name. An empty response falls back to
  `cloud.name`, the full prefixed remote name (`<hash13>-<vault>`). That is
  guaranteed not to collide, because it is the Turso database name and is
  unique within the org, and it is already the value the sync URL is built
  from. Never overwrite the existing entry silently: that would discard its
  environment keys.

  The local config key is just a label. `cloud.name` is what identifies the
  remote database, so renaming on import costs nothing.
- **`location` allocation.** The CLI needs desktop's `vaultPathForName`
  equivalent. Global scope should be
  `join(globalConfigDir(), 'vaults', '<name>.db')`, matching desktop's
  `join(appDataDir(), 'vaults', '<name>.db')` so both surfaces resolve the
  same replica file. Project scope goes next to the config.
- **Active vault.** Set `active_vault` to the vault just grabbed, and its
  environment to the first one shared, in both the fresh-config and
  merge-into-existing cases. Someone who just grabbed a vault almost
  certainly wants to use it, and `deadrop vault use <name>` toggles back.

  On a fresh config this is required rather than convenient: a config whose
  `active_vault` does not resolve breaks every other command.

### Where the branch lives

Vault detection belongs in the platform adapters, not `shared/handlers/grab.ts`.
The shared handler should surface the received payload's `meta` so each
platform can branch on it; config writing is inherently platform-specific
(CLI writes YAML with `saveConfig`, desktop invokes the Rust
`write_app_vault_config`). Putting config I/O in shared would break the
web build, which has no filesystem.

## Import must rewrite `location`

This is the one real blocker and it exists independently of this feature.

`pickExternalVaultConfig` (`desktop/src/lib/vault-config.ts`) opens vault
paths as-is, because it was built for linking a project-scoped `.deadroprc` on
the same machine, where the absolute path is valid. A shared config's
`location` points at a path on the owner's machine that does not exist for
the recipient.

For cloud-backed vaults the local file is an embedded replica that gets
created on first sync, so the fix is to allocate a fresh path
(`vaultPathForName`) rather than trust the incoming one. Import should ignore
`location` entirely whenever `cloud` is present.

## What this inherits

**Bounded expiry gives time-limited shares.** Since the token carries an
expiration, "share for 30 days" is the default rather than a feature. Access
lapses on its own.

**`maxGrabbers` gives multi-recipient shares.** Sharing with a team of five is
a drop with `maxGrabbers: 5`. Note this is gated behind `early_access` /
`internal` claims today, so it is not available to general users yet.

**Revocation is still rotate-all.** Cutting off one recipient invalidates every
token for the database, including the owner's own and every other
recipient's. Expiry is the graceful path; rotation is break-glass. This is a
Turso constraint, not a deadrop one.

## Open items

- **Read-only affordances.** The recipient's vault UI still renders add,
  edit, and delete controls that will fail at the DB layer against a
  read-only token. Needs the UI to reflect ownership, keying off
  `userOwnsVault`.
- **Write delegation** (`vault_sharing_write` in `shared/config/plans.ts`)
  would mean minting a full-access token instead. Same mechanism, higher
  stakes, and rotate-all revocation becomes more painful. Out of scope here.
- **Plan gating.** `vault_sharing_read` exists as a feature slug but is not
  enforced anywhere yet.
