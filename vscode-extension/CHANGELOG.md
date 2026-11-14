# deadrop-vsc

## 0.1.12

### Patch Changes

- 60dccee: Drops and grabs now relay through Cloudflare's TURN network using short-lived credentials issued for each session, instead of a shared relay credential baked into every build. Connections behind restrictive networks should be more reliable, and no long-lived relay secret ships in the CLI, desktop app, extension, or web bundle anymore.

  The `TURN_USERNAME` and `TURN_PWD` environment variables are no longer read and can be removed.

- 76a7a01: Security fixes from an audit of the local-first boundary.
  - Vault names are validated before they reach Turso, so a crafted name can't point at another user's database.
  - The sign-in page only sends a login ticket to a CLI or VS Code callback on your own machine, and both callbacks listen on 127.0.0.1 and check a one-time `state`.
  - Drops enforce their grab limit on every connection.
  - `deadrop grab` keeps received files in the current folder under their bare name, and never overwrites an existing file.
  - `inject` refuses to set loader variables like `NODE_OPTIONS` or `LD_PRELOAD` from a vault. Pass `--allow-env NAME` if you mean it.
  - A `.env` in the working directory can still supply `DEADROP_API_KEY`, but `DEADROP_VAULT_KEY`, `DEADROP_VAULT` and `DEADROP_ENVIRONMENT` are only read from it with `--ci`, and `inject` warns when it skips them. Exported variables always win.
  - Peer-supplied text is escaped before it's printed in the terminal or shown in VS Code.
  - Grabbing a shared vault never replaces one you already have.
  - Drop ids are scrubbed from error reports and analytics.

- Updated dependencies [f26a8cb]
- Updated dependencies [60dccee]
- Updated dependencies [76a7a01]
  - shared@1.8.0

## 0.1.11

### Patch Changes

- Updated dependencies [1b8336b]
- Updated dependencies [3bd129e]
  - shared@1.7.0

## 0.1.10

### Patch Changes

- d40a139: Republish the extension so every platform target is available. The 0.1.9 publish timed out against the marketplace API partway through uploading the per-platform builds, leaving `linux-x64` and `win32-x64` missing. Every vsix is platform specific, so there was no universal build for those users to fall back to and the extension could not be installed on Windows or on the most common Linux target. No extension code changes.
- Updated dependencies [b4279ac]
  - shared@1.6.0

## 0.1.9

### Patch Changes

- Updated dependencies [1502f27]
- Updated dependencies [95d715c]
- Updated dependencies [1502f27]
  - shared@1.5.0

## 0.1.8

### Patch Changes

- Updated dependencies [0817197]
  - shared@1.4.0

## 0.1.7

### Patch Changes

- Updated dependencies [9786cb6]
  - shared@1.3.0

## 0.1.6

### Patch Changes

- 6dfbfb2: Vault sync URLs are now derived from the vault's remote name rather than stored in `.deadroprc`. Existing configs keep working with no migration, since the derived URL is identical to the one previously written. Importing a cloud vault also allocates a fresh local replica path instead of trusting the sender's, which fixes vaults imported from another machine.
- Updated dependencies [6dfbfb2]
- Updated dependencies [bb15b91]
- Updated dependencies [6dfbfb2]
  - shared@1.2.0

## 0.1.5

### Patch Changes

- Updated dependencies [84acb4f]
  - shared@1.1.0

## 0.1.4

### Patch Changes

- 739f85b: Fix vault row action buttons rendering literal `\uXXXX` text instead of their icons — bare unicode escapes in JSX text nodes aren't parsed as string escapes; wrap them in expressions.

## 0.1.3

### Patch Changes

- Updated dependencies [3c4ef57]
  - shared@1.0.0
