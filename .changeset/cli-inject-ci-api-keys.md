---
'cli': minor
---

Run `deadrop inject` in CI with a scoped API key. Set `DEADROP_API_KEY` alongside `DEADROP_VAULT_KEY` and the vault and environment both come from the key's own claims, so a pipeline needs no config file, no `DEADROP_VAULT`, and no `DEADROP_ENVIRONMENT`. The minted token is read-only and expires in five minutes.

Pass `--ci` to require that path: it fails immediately naming whichever variable is missing, instead of falling back to an interactive sign-in that cannot succeed in a container.

Token minting is also more dependable everywhere. A cloud vault configured in `.deadroprc` mints again when its cached token is absent or `--refresh-token` is given, the minted token is applied to the vault it was issued for, and a vault that no longer exists, a rejected key, or an unexpected response now stop the run with a readable message rather than injecting nothing and exiting successfully.
