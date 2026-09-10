# Release Prep Handoff

Session handoff for prepping a full release. Snapshot taken 2026-07-20.

## What landed on `alpha` this session

| Commit | What | Verified |
|---|---|---|
| `1d9518d` | PR #128: seed dev+prod vault environments + `deadrop vault env` commands | CI green |
| `4b82c35` | PR #129: `POST /vault/tokens` minting + validated `deadrop inject` (Phase 1) | CI green |
| `8858137` | multidrop e2e: `setTimeout(120_000)` margin | CI green |
| `ca8877a` | e2e P2P specs run each project's real engine; webkit scoped out of P2P | CI green, first attempt |

Both PRs squash-merged. Their worktrees/branches (`vault-env-defaults`, `inject-token-mint`) were removed via `wt remove` plus a manual branch delete (squash merges are not detected as merged by worktrunk).

## Release-blocking / must-check before promoting `alpha` to `main`

1. #129 live validation gate is NOT done. The worker route rename `Share` to `Tokens` and `restricted({ allowApiKey: true })` minting only go live on merge to `main` (worker auto-deploys there, not on alpha). Needs a real cloud vault plus a signed-in internal identity smoke test right after promotion. Explicitly deferred in the PR.
2. CLI release mechanics (from prior notes, re-verify):
   - `release.yml` dispatches the binary build before creating the `deadrop@x` tag, causing a 422 so binaries silently skip. Hand-push the tag until fixed.
   - CLI publish/release bakes live values from same-named SECRETS (env var vs secret split). Confirm those secrets are set or the release build fails.

## CI health on `alpha` (current)

- Unit, CLI E2E, Cross-Platform E2E: green.
- Playwright: green first attempt, but 2 flaky remain: `stripe-checkout.spec.ts > POST returns a clientSecret` (chromium + firefox). Root cause is the Clerk FAPI testing-token handshake returning HTML instead of JSON against `alpha.deadrop.io` (`CLERK_WEBHOOK_SIGNING_SECRET` empty in CI; handshake targets `/pricing`). Pre-existing, unrelated to this session's merges.
- The multidrop/drop-flow P2P flake that started the investigation is fully resolved (0 P2P flaky now, was 6). Verified locally against live alpha with `--repeat-each=2 --retries=0` (19/19 passed).

### Context on the e2e engine fix (ca8877a)

The P2P specs previously ran chromium on every project because `dropBrowser`/`grabBrowser` defaulted to `'chromium'`, so firefox/webkit/mobile projects silently launched chromium. The fix defaults those options to `undefined` and adds `createPeerPage`, so each project uses its real engine with an isolated context per peer. Making webkit honest revealed Playwright's WebKit has no working WebRTC, so P2P specs are now excluded from webkit and Mobile Safari (those still run the non-P2P device specs). drop-flow now runs on chromium, firefox, Mobile Chrome, and both cross pairings; multidrop on chromium plus both cross pairings.

## Loose ends (not release-blocking)

- `cli-inject-ci` worktree: superseded by #129 except the deferred `--github-env` implementation (`cli/lib/githubEnv.ts` + test, clean, ~53 lines). Plan is salvage-then-toss. Not yet actioned. This is the intended `inject` Phase 2 follow-up.
- `tauri-experiment` worktree: rebased onto current alpha (was 162 behind), desktop Tauri app committed, lockfile regenerated. Now 0 behind / 4 ahead. Not pushed, no PR. A real `tauri build` needs the Rust toolchain locally.
- Clerk FAPI / stripe-checkout flake (the 2 flaky above): real but pre-existing and separate. Chase down if you want a clean run.

## Suggested release sequence

1. Resolve or accept the 2 Clerk-flaky stripe tests (or land the FAPI fix).
2. Promote `alpha` to `main` (worker deploys; web via Vercel).
3. Run the #129 live vault-token/inject smoke test against prod.
4. Cut the CLI changeset release, and hand-push the `deadrop@x` tag to avoid the binary-skip bug.
