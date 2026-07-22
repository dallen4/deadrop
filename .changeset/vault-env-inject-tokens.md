---
'cli': minor
---

Add `deadrop vault env list` and `deadrop vault env add <name>` to manage per-vault environments, and `deadrop vault use --environment <env>` to switch environments while changing vaults. New vaults are now seeded with both `development` and `production` environments.

`deadrop inject` now mints a fresh read-only vault token from the new `/vault/tokens` endpoint whenever no usable token is cached, so it works from a clean checkout. Pass `--refresh-token` to force a new token even when one is cached.

`deadrop inject` also gains a config-free CI mode: set `DEADROP_VAULT_KEY` (the environment's decryption key) to skip config discovery entirely, selecting the vault and environment via `DEADROP_VAULT`/`DEADROP_ENVIRONMENT` (or `-v`/`-e`). In this mode it authenticates to the worker with `DEADROP_API_KEY` when no interactive session is present.
