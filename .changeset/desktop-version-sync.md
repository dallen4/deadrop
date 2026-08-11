---
'desktop': patch
---

The desktop version is now synced from `package.json` into `tauri.conf.json`, `Cargo.toml`, and `Cargo.lock` as part of `changeset version`. Changesets only bumps `package.json`, but Tauri names every bundle from `tauri.conf.json`, so the two drifted silently: the `deadrop-desktop@0.2.2` release shipped a full set of assets named `0.1.0`, which broke checksum lookups and made the installed version impossible to identify.

`pnpm -F desktop sync-version` writes the three files, and `--check` fails instead of writing so Desktop CI catches a bump that bypassed changesets.
