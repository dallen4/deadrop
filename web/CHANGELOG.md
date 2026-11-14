# web

## 1.0.11

### Patch Changes

- Updated dependencies [687a8ef]
  - shared@1.8.1

## 1.0.10

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

## 1.0.9

### Patch Changes

- Updated dependencies [1b8336b]
- Updated dependencies [3bd129e]
  - shared@1.7.0

## 1.0.8

### Patch Changes

- Updated dependencies [b4279ac]
  - shared@1.6.0

## 1.0.7

### Patch Changes

- 1502f27: Enforce plan entitlements on the API. Feature gating folds into `authenticated({ feature })`, replacing the separate `restricted()` middleware, so identity and entitlement resolve in one pass. Early access and internal users keep their bypass, and it is now read from live Clerk metadata as well as the session claims, so entitlement no longer depends on the session template projecting the plan.

  Plan limits are enforced rather than advertised. Daily drop limits come from plan config instead of a fixed worker variable, and both the signed in and anonymous counters resolve through the same source. Creating a cloud vault or issuing an API key past the plan cap is refused with a message naming the limit, counted live from Turso and Clerk so nothing has to be reconciled locally.

  Plan limits, feature slugs and auth scopes now live in one place in shared config, and the pricing tiers page derives its copy from the same limits, so advertised numbers cannot drift from the ones actually enforced.

- Updated dependencies [1502f27]
- Updated dependencies [95d715c]
- Updated dependencies [1502f27]
  - shared@1.5.0

## 1.0.6

### Patch Changes

- Updated dependencies [0817197]
  - shared@1.4.0

## 1.0.5

### Patch Changes

- Updated dependencies [9786cb6]
  - shared@1.3.0

## 1.0.4

### Patch Changes

- Updated dependencies [6dfbfb2]
- Updated dependencies [bb15b91]
- Updated dependencies [6dfbfb2]
  - shared@1.2.0

## 1.0.3

### Patch Changes

- 84acb4f: Added a dedicated desktop app docs page and linked it from the
  overview, features, and CLI docs. Fixed the docs section-heading
  button, which looked clickable but had no handler wired up; clicking a
  section heading now copies a link to that section.
- Updated dependencies [84acb4f]
  - shared@1.1.0

## 1.0.2

### Patch Changes

- db51034: Fix `deadrop login` failing before the sign-in ticket reaches the CLI.
  The CLI no longer double-encodes the auth redirect URL, so the browser
  handoff completes instead of throwing an invalid-URL error. The web
  callback now surfaces token and redirect failures instead of silently
  redirecting with a bad token, and the sign-in token lifetime is widened
  to 60s to avoid spurious expiries.

## 1.0.1

### Patch Changes

- df322dc: Docs fixes and formatting updates: resolved an install-command
  injection issue and several broken/missing imports on the docs pages,
  refreshed FAQ/features/overview content, and documented the new
  `deadrop whoami` command and OS-keychain credential storage.

## 1.0.0

### Major Changes

- 3c4ef57: deadrop 1.0.0 — first stable platform release.

  Cloud vault subscription lifecycle: vaults are now locked (reads/writes
  blocked, tokens rotated) when a subscription is canceled and restored when
  it reactivates, driven by the Clerk billing webhook through a service-authed
  Worker endpoint. Turso provisioning + lifecycle helpers are consolidated into
  a single `shared/lib/turso` module.

### Patch Changes

- Updated dependencies [3c4ef57]
  - shared@1.0.0
