---
'shared': patch
'worker': patch
'cli': patch
'web': patch
'desktop': patch
'deadrop-vsc': patch
---

Security fixes from an audit of the local-first boundary.

- Vault names are validated before they reach Turso, so a crafted name can't point at another user's database.
- The sign-in page only sends a login ticket to a CLI or VS Code callback on your own machine, and both callbacks listen on 127.0.0.1 and check a one-time `state`.
- Drops enforce their grab limit on every connection.
- `deadrop grab` keeps received files in the current folder under their bare name, and never overwrites an existing file.
- `inject` refuses to set loader variables like `NODE_OPTIONS` or `LD_PRELOAD` from a vault. Pass `--allow-env NAME` if you mean it.
- A `.env` in the working directory can still supply `DEADROP_API_KEY`, but `DEADROP_VAULT_KEY`, `DEADROP_VAULT` and `DEADROP_ENVIRONMENT` are only read from it with `--ci`, and `inject` warns when it skips them. Exported variables always win.
- Peer-supplied text is escaped before it's printed in the terminal or shown in VS Code.
- Grabbing a shared vault never replaces one you already have.
- Drop ids are scrubbed from error reports and analytics.
