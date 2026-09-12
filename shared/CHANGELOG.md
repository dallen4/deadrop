# shared

## 1.6.0

### Minor Changes

- b4279ac: Let a CI API key carry the shaping for the runs that use it. `deadrop apiKeys create` takes `--only` to name the secrets the key injects and `--prefix` to rename them, both optional. The claims travel with the key, so a pipeline sets `DEADROP_API_KEY` and gets the right variables under the right names without repeating the flags at every call site.

  A run can narrow what the key allows but never widen it. `inject --only` may pick a subset of the key's list, and naming anything outside it fails rather than injecting it. An `inject --prefix` that disagrees with the key's warns and the key's prefix is used.

  These claims shape what `inject` writes into the process, not what the key can read. Secrets never pass through the worker, so filtering happens on your machine, and a short lived Turso token covers the whole vault database. What actually separates environments is that each one has its own encryption key: a key issued for `production` cannot decrypt anything from `development`. Secret names and environment names are stored unencrypted and stay visible across environments, the same way a committed `.env.example` lists names without values.

## 1.5.0

### Minor Changes

- 1502f27: Always give a vault a name suffix. A vault created without a name resolved to a bare `<hash13>` derived from the user id, and the ownership check requires the `<hash13>-` separator, so such a vault could never be recognised as owned by the person who created it. It rendered as read only in the desktop app, with no API keys section and no share button. An unnamed vault now resolves to `<hash13>-default`, and an empty or whitespace name resolves there too rather than silently collapsing to the bare form.

  Listing a user's vaults keeps using the bare hash as a prefix filter, which is now a separate `vaultPrefixFromUserId` so plan caps and the billing lock and unlock sweeps still see every vault a user owns.

  Existing API keys carry their resolved vault name in immutable claims, so any key issued without a name still points at the old bare database and needs reissuing.

- 95d715c: Cap every new cloud vault at 100mb. Vaults were provisioned with no size limit, so a single vault could grow until it consumed the whole Turso storage allowance for the organisation. New databases now have Turso's own `size_limit` applied at creation, which bounds the worst case without depending on any client behaving.

  The limit is deliberately far above what a vault should ever hold. It measures the database file rather than the secrets inside it, so page allocation, the primary key index, free pages left behind by deletes, and the write ahead log history kept for replica sync all count against it. A vault whose secrets are rotated often sits at several times the size of the values it holds, and a tighter limit would refuse writes to a vault that had done nothing wrong. Per secret and per vault limits that can explain themselves belong in the client, and are tracked separately.

  Provisioning is also no longer able to leave a vault behind when it half succeeds. Applying the limit is a second call after the database is created, and if it failed the database survived uncapped while the caller saw an error. Because vaults are counted by name prefix when a plan cap is checked, that orphan still counted against its owner, which could permanently consume the single vault a Supporter is allowed. A failed limit now deletes the database it was created for before the error propagates.

- 1502f27: Enforce plan entitlements on the API. Feature gating folds into `authenticated({ feature })`, replacing the separate `restricted()` middleware, so identity and entitlement resolve in one pass. Early access and internal users keep their bypass, and it is now read from live Clerk metadata as well as the session claims, so entitlement no longer depends on the session template projecting the plan.

  Plan limits are enforced rather than advertised. Daily drop limits come from plan config instead of a fixed worker variable, and both the signed in and anonymous counters resolve through the same source. Creating a cloud vault or issuing an API key past the plan cap is refused with a message naming the limit, counted live from Turso and Clerk so nothing has to be reconciled locally.

  Plan limits, feature slugs and auth scopes now live in one place in shared config, and the pricing tiers page derives its copy from the same limits, so advertised numbers cannot drift from the ones actually enforced.

## 1.4.0

### Minor Changes

- 0817197: Manage CI service tokens from the desktop app. Each environment in a cloud vault you own now splits into Secrets and API Keys sections: the API Keys section lists the keys already scoped to that vault and environment with their active, expired, or revoked state, and issues new ones without dropping to the CLI. A new key is shown once when it is created, since that is the only time it can be read back. A local vault, or a cloud vault shared with you, keeps the plain secrets list it had before, because neither has keys to manage.

  Adding a secret moved into a dialog behind an "Add secret" row rather than a form sitting open at the bottom of the list, and both dialogs name the vault and environment being written to so a secret cannot be added to the wrong environment by accident.

  `shared` gains the `AuthScopes` enum, previously worker-only, so any surface can name the scope it is filtering keys on.

## 1.3.0

### Minor Changes

- 9786cb6: Add a single schema for the vault token mint responses, so the worker binds to it when building a response and the CLI parses against it when reading one. A field renamed on one side now fails the worker build and, if it reaches the wire anyway, throws in the CLI instead of yielding undefined credentials and an unauthenticated sync.

  `createVaultUtils` also takes the API token first and defaults the Turso organization to the shared constant, removing the org argument from every call site.

## 1.2.0

### Minor Changes

- 6dfbfb2: Vault sync URLs are now derived from the vault's remote name rather than stored in `.deadroprc`. Existing configs keep working with no migration, since the derived URL is identical to the one previously written. Importing a cloud vault also allocates a fresh local replica path instead of trusting the sender's, which fixes vaults imported from another machine.
- bb15b91: Grant read-only vault sharing to Supporter. Sharing gates on owning a
  cloud vault, not on Pro, so `vault_sharing_read` is now part of
  `SUPPORTER_FEATURES` and shows on the Supporter pricing tier.
- 6dfbfb2: Share a cloud vault by dropping it. "Share vault" on the desktop vault page and the new `deadrop vault drop` command mint a read-only, expiring token for the environments you pick and hand it over the same peer-to-peer drop everything else uses. The recipient gets an "Add to my vaults" action on the desktop grab screen, and `deadrop grab` writes the vault into a local or global config and makes it active. Only the vault's owner can share it, and access lapses on its own when the token expires.

## 1.1.0

### Minor Changes

- 84acb4f: Extracted the drop/grab flow into reusable, headless pieces so a
  platform only has to supply its own shell: `hooks/use-drop` and
  `hooks/use-grab` drive the machines with platform deps injected via
  context, and `components/` gained the Mantine drop/grab UI
  (`DropFlow`, `GrabFlow`, `SharePane`, `GrabbersList`, and supporting
  atoms/molecules) shared between `web` and the new `desktop` app.

## 1.0.0

### Major Changes

- 3c4ef57: deadrop 1.0.0 — first stable platform release.

  Cloud vault subscription lifecycle: vaults are now locked (reads/writes
  blocked, tokens rotated) when a subscription is canceled and restored when
  it reactivates, driven by the Clerk billing webhook through a service-authed
  Worker endpoint. Turso provisioning + lifecycle helpers are consolidated into
  a single `shared/lib/turso` module.
