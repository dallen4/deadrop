---
'cli': minor
---

Add `deadrop vault env list` and `deadrop vault env add <name>` to manage per-vault environments, and `deadrop vault use --environment <env>` to switch environments while changing vaults.

Add `deadrop inject --refresh-token` to mint a fresh, read-only vault access token via the new `/vault/tokens` endpoint before running the injected command, instead of relying on a cached token.
