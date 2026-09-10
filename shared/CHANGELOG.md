# shared

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
