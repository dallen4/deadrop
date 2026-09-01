---
'cli': minor
---

Issue and use scoped API keys for CI. `deadrop apiKeys create` walks you through picking one of your cloud vaults and one of its environments, then prints a key bound to exactly that pair — pass `-v`/`-e` to skip the prompts, or `-y` to skip the confirmation. Keys are named with the vault, environment and issue time so they are easy to tell apart and revoke in your Clerk account.

Set that key as `DEADROP_API_KEY` alongside `DEADROP_VAULT_KEY` and `deadrop inject --ci -- <command>` needs nothing else: the vault and environment both come from the key's own claims, so a pipeline needs no config file, no `DEADROP_VAULT`, and no `DEADROP_ENVIRONMENT`. The token it mints is read-only and expires in five minutes. `--ci` fails immediately naming whichever variable is missing, instead of falling back to an interactive sign-in that cannot succeed in a container.

Token minting is also more dependable everywhere. A cloud vault configured in `.deadroprc` mints again when its cached token is absent or `--refresh-token` is given, the minted token is applied to the vault it was issued for, and a vault that no longer exists, a rejected key, or an unexpected response now stop the run with a readable message rather than injecting nothing and exiting successfully.
