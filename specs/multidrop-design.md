# Multidrop — One Secret, Many Grabbers

## Context

deadrop today is strictly **one dropper → one grabber**. The dropper opens a live P2P
session, exactly one grabber connects, the secret transfers, and the drop is deleted on
that first success. "Multidrop" generalizes this to **one dropper → many grabbers**: a
single secret fanned out to N grabbers over the same WebRTC session.

This spec is deep and self-contained enough that a single main agent can execute it by
**sharding work across git worktrees** — a foundation worktree that lands and *proves out*
the shared/worker contract plus minimal web, then surface worktrees (web quality-of-life,
cli, vscode) spun off in parallel against that frozen contract. Each surface slice is
written so a cheaper model (Haiku, or Sonnet at medium/high effort) can implement it
mechanically — the thinking is baked into the **Frozen Shared Contract** below.

### What the reconnaissance established

- **Crypto primitives are unchanged.** ECDH derives a *distinct* key per grabber (dropper
  keeps one keypair; each grabber brings its own). The dropper encrypts the payload **once
  per grabber** with that grabber's derived key. Reusing the single drop nonce across
  grabbers is safe because the key differs each time. `shared/lib/crypto/*` needs no
  changes — only the *handler orchestration* that calls it changes.
- **The 1:1 assumption lives in three places:** the drop machine
  (`shared/lib/machines/drop.ts`, linear single-grabber flow), the drop handler
  (`shared/handlers/drop.ts` `onConnection` actively *rejects* a second connection,
  `onMessage`/`sendMessage` assume one connection, `withMessageLock` is global), and each
  surface's UI (renders one grabber, one link, completes after one transfer).
- **The signaling Durable Object needs zero changes** — `PeerServerDO` already routes by
  destination peer id and supports one source fanning to many destinations.
- **The worker is nearly untouched.** Today the dropper deletes the drop on first success
  (`shared/handlers/drop.ts` cleanup → `DELETE /drop`). Multidrop defers that delete until
  the session ends. The only additive worker work is creation-time cap validation (the
  experimental gate). The 5-minute TTL is kept as-is — if a grabber misses the window, they
  re-request.
- **The grab side is already 1:1 by nature** and needs **no machine/handler changes** —
  each grabber instance is independent.

### Locked decisions

1. **Bounding model: optional cap + manual stop + TTL.** A multidrop ends when
   confirmed-grabber count reaches `maxGrabbers` (if set), OR the dropper hits "stop
   accepting", OR the 5-min TTL expires — whichever fires first. `maxGrabbers = null` means
   unbounded (stop/TTL only).
2. **Plan gating, server-enforced, experimental-only.** `POST /drop` validates the
   requested `maxGrabbers` against the user's plan limits. `maxGrabbers > 1` is gated to
   internal/experimental users via the existing `restricted()` early-access pattern. The
   default (cap 1) path is unchanged for everyone.
3. **All three surfaces** ship multidrop (web, cli, vscode-extension).
4. **`multidrop` is the feature branch.** Every worktree merges **into `multidrop`**, never
   into `alpha`. Whether/when `multidrop → alpha` lands is decided separately, outside this
   execution.

**Design consequence:** multidrop *generalizes* the existing flow. The drop machine is
collection-based always; `maxGrabbers = 1` is the degenerate case reproducing today's UX.
One code path, no legacy machine.

---

## Architecture Overview

```
Dropper (one peer, one keypair, one nonce, one payload hash)
  │  accepts N DataConnections (rejection removed)
  ├─ grabber A ── ECDH→keyA ── encrypt(payload, keyA, nonce) ── verify ── confirmed
  ├─ grabber B ── ECDH→keyB ── encrypt(payload, keyB, nonce) ── verify ── confirmed
  └─ grabber C ── ...
  Session ends when: confirmed == maxGrabbers │ "stop accepting" │ 5-min TTL
  On end → DELETE /drop (deferred from first-success to session-end)
```

Top-level drop machine collapses the old linear states into one stable `Accepting` state.
Per-grabber progress lives in `ctx.grabbers` (a map), updated by handler-emitted events.
Surfaces render `ctx.grabbers` as a list — 1 row for free users, N rows for experimental.

---

## Frozen Shared Contract

> This is the interface the foundation worktree implements and freezes. Surface worktrees
> code against *this section only* and must not need to read shared internals. The
> orchestrating agent copies this section verbatim into each surface's slice `.md`.

### Types — `shared/types/drop.ts` (+ `shared/types/common.ts`)

`BaseContext` (`shared/types/common.ts`) is **unchanged** — the grab side still uses its
singular `connection`/`keyPair`. The drop side stops using `BaseContext.connection` and adds
a grabbers collection:

```ts
// shared/types/drop.ts
export enum GrabberStatus {
  Connected = 'connected',       // DataConnection open, pre-handshake
  Transferring = 'transferring', // key exchanged, payload sent, awaiting verify
  Confirmed = 'confirmed',       // integrity verified + confirm sent (terminal success)
  Failed = 'failed',             // connection error / integrity mismatch (terminal)
}

export type GrabberRecord = {
  peerId: string;                 // grabber's PeerJS id (map key)
  connection: DataConnection;     // this grabber's channel
  dropKey: CryptoKey | null;      // per-grabber ECDH-derived key (null until handshake)
  status: GrabberStatus;
  connectedAt: number;            // Date.now()
  confirmedAt: number | null;
};

export type DropContext = BaseContext & {
  integrity: string | null;             // single payload hash (unchanged)
  keyPair: CryptoKeyPair | null;        // dropper's single keypair (unchanged)
  grabbers: Map<string, GrabberRecord>; // keyed by grabber peerId
  maxGrabbers: number | null;           // null = unbounded
  accepting: boolean;                   // false after stop / cap reached
};

// initDropContext: spread the existing base init, then:
//   integrity: null, keyPair: null, grabbers: new Map(),
//   maxGrabbers: 1 (default = today's single-grabber behavior), accepting: true
```

> The singular `DropContext.dropKey` is **removed** — per-grabber keys live in
> `GrabberRecord.dropKey`. The drop side no longer reads `ctx.connection`.

### State machine — `shared/lib/machines/drop.ts` + `shared/lib/constants.ts`

States collapse to `Initial → Ready → Accepting → Completed` (+ `Error`). Remove `Waiting`,
`Connected`, `AwaitingHandshake`, `Acknowledged`, `AwaitingConfirmation`.

```ts
// shared/lib/constants.ts
export enum DropState {
  Initial = 'initial',
  Ready = 'ready',
  Accepting = 'accepting',   // stable; grabbers come and go here
  Completed = 'completed',
  Error = 'error',
}

export enum DropEventType {
  Init = 'INITIALIZE',
  Wrap = 'WRAP',
  Ready = 'READY',
  GrabberConnected = 'GRABBER_CONNECTED',   // { grabberId }
  GrabberProgress = 'GRABBER_PROGRESS',     // { grabberId, status }
  GrabberConfirmed = 'GRABBER_CONFIRMED',   // { grabberId }
  GrabberFailed = 'GRABBER_FAILED',         // { grabberId }
  StopAccepting = 'STOP_ACCEPTING',
}
```

Machine behavior (XState v4 vanilla — **no spawned child actors**; per-grabber state is
context, not machine state):

- `Accepting`:
  - `GRABBER_CONNECTED` → `assign` add `GrabberRecord` (only if `accepting`, and when
    `maxGrabbers != null`, confirmed+inflight < cap). Stays.
  - `GRABBER_PROGRESS` → `assign` update that grabber's `status`. Stays.
  - `GRABBER_CONFIRMED` → `assign` mark confirmed + `confirmedAt`. Guard `reachedCap`
    (`maxGrabbers != null && confirmedCount >= maxGrabbers`) → `Completed`, else stays.
  - `GRABBER_FAILED` → `assign` mark failed. Stays.
  - `STOP_ACCEPTING` → `assign accepting=false` → `Completed`.
- `Completed`: final. Entry action triggers cleanup (delete drop, close peer).

Only **confirmed** grabbers count toward `maxGrabbers`. Connected-but-unconfirmed grabbers
never block completion; stop/TTL are the escape hatches.

### Handler — `shared/handlers/drop.ts`

Public factory signature is **unchanged** (`createDropHandlers({...})` returning
`{ init, stagePayload, startSession, stopAccepting }`) so surfaces keep their wiring shape.
Internal changes:

- `onConnection(newConnection)`: **remove the rejection branch.** Add the grabber to
  `ctx.grabbers` keyed by `newConnection.peer`; attach a per-grabber `data` listener using a
  **per-grabber** message lock; emit `GRABBER_CONNECTED { grabberId }`; kick off the
  handshake for *this* grabber.
- `onMessage(grabberId, msg)`:
  - `Handshake` → derive `GrabberRecord.dropKey` from this grabber's pubkey + dropper
    privkey; `encryptRaw(payload, dropKey, ctx.nonce)` (per-grabber); send `DropMessage`;
    emit `GRABBER_PROGRESS { grabberId, Transferring }`.
  - `Verify` → compare `msg.integrity === ctx.integrity`; send `ConfirmIntegrityMessage`;
    on match emit `GRABBER_CONFIRMED`, else `GRABBER_FAILED`.
- `withMessageLock` (`shared/lib/messages.ts`): change from one global lock to a
  **per-grabberId lock map** so concurrent grabbers don't serialize against each other.
- `sendMessage(grabberId, msg)`: send to a specific grabber's connection (was singular
  `ctx.connection`).
- Cleanup / delete: **defer `DELETE /drop`** until the machine reaches `Completed` (session
  end), not on first confirm. Close all grabber connections + peer on cleanup.
- `stopAccepting()`: new exported handler that raises `STOP_ACCEPTING`.

### Grab side — **no changes**

`shared/lib/machines/grab.ts`, `shared/handlers/grab.ts`, `shared/types/grab.ts`, and
`shared/lib/peer.ts` are untouched. Each grabber is an independent 1:1 instance.

### Worker contract — `worker/`

- `POST /drop` (`worker/src/routers/drop.ts`): accept optional `maxGrabbers?: number`.
  Validate against plan via billing (below). `maxGrabbers > 1` requires the experimental
  allowlist — reuse the `restricted()`-style middleware used by vault share routes. Reject
  with 403 if a non-experimental user requests > their plan cap. Persist `maxGrabbers`
  (default 1).
- `DropDetails` (`shared/types/common.ts`): add `maxGrabbers: number`. KV/Redis hash gains
  the field (lazy-default old records to 1).
- Billing (`worker/src/lib/billing.ts`): add `maxGrabbersPerDrop` to `PLAN_LIMITS` (free =
  1; supporter/pro/org = higher or unlimited) and an experimental-user check that unlocks
  caps > the plan default.
- `GET /drop` / `DELETE /drop`: unchanged (DELETE still dropper-driven, just called later).
- `PeerServerDO` (`worker/src/lib/durable_objects/PeerServer.ts`): **no changes.**
- **No TTL refresh.** The existing 5-minute window stands.

---

## Worktree Plan & Orchestration

**Feature branch:** `multidrop` (cut from `alpha`). All worktrees merge into `multidrop`.
No `alpha` PR in scope.

| # | Worktree branch        | Scope                                                | Depends on |
|---|------------------------|------------------------------------------------------|------------|
| A | `multidrop-foundation` | `shared/` + `worker/` + **minimal web** (prove-out)  | —          |
| B | `multidrop-web`        | web quality-of-life polish                           | A merged   |
| C | `multidrop-cli`        | `cli/` drop flow                                     | A merged   |
| D | `multidrop-vscode`     | `vscode-extension/` drop pane                        | A merged   |

**Execution sequence the main agent runs:**

1. Write this master spec to project root `multidrop-design.md`; create the `multidrop`
   feature branch from `alpha`; commit the spec on `multidrop`.
2. **Foundation / prove-out first (blocking).** Cut a `foundation.md` slice (Frozen Shared
   Contract + worktree A's file list + acceptance) and `/spawn multidrop-foundation` with
   it. It implements the contract + worker + **minimal functional web** (wire `use-drop` to
   the new contract, a bare unstyled grabbers list, a stop control — enough to demonstrate
   and e2e two grabbers; no copy buttons / badges / polish). Runs shared + worker + web
   tests and the 2-grabber e2e green, **proves it out**, then merges to `multidrop`.
   **Freeze the contract here.**
3. **Surfaces in parallel.** After A is merged and green, for each of B/C/D cut a focused
   slice `.md` (Frozen Shared Contract verbatim + that surface's file list + acceptance)
   and `/spawn` the worktree off the updated `multidrop`. They run in parallel, each merging
   back into `multidrop`:
   - **B `multidrop-web`** — the deferred QoL: copy buttons, `GrabbersList` styling, status
     badges, accepting/confirmed feedback, max-grabbers input UX.
   - **C `multidrop-cli`** — full cli drop flow.
   - **D `multidrop-vscode`** — full vscode drop pane.
4. **Integration.** On `multidrop`: full `pnpm test`, then cross-platform e2e
   (`tests/` workspace) including the multidrop case. Fix integration issues on `multidrop`.

**Slice-cutting:** the orchestrating agent is the only one that reads the whole
`multidrop-design.md`. For each spawned worktree it extracts that worktree's sections into a
standalone `.md` it hands off, so each cheap-model agent sees only its slice plus the frozen
contract.

Foundation (A) is the load-bearing work (per-grabber locks, per-grabber key derivation,
deferred cleanup, contract design) — run it at higher effort. Surfaces B/C/D are the
cheap-model targets.

---

## Per-Worktree Slices

### A — Foundation / prove-out (`shared/` + `worker/` + minimal web)

**Files:**
- `shared/types/drop.ts` — `GrabberStatus`, `GrabberRecord`, new `DropContext`,
  `initDropContext`; remove singular `dropKey`.
- `shared/types/common.ts` — extend `DropDetails` with `maxGrabbers`.
- `shared/lib/constants.ts` — new `DropState`/`DropEventType` enums.
- `shared/lib/machines/drop.ts` — collection-based machine (Accepting state, assign
  actions, `reachedCap` guard).
- `shared/handlers/drop.ts` — multi-connection `onConnection`/`onMessage`/`sendMessage`,
  per-grabber handshake/encrypt, deferred delete, `stopAccepting`.
- `shared/lib/messages.ts` — per-grabber `withMessageLock`.
- `worker/src/routers/drop.ts` — `maxGrabbers` validation + experimental gating.
- `worker/src/lib/billing.ts` — `maxGrabbersPerDrop` limits + experimental check.
- `web/hooks/use-drop.tsx` — expose `grabbers`, `accepting`, `maxGrabbers`,
  `setMaxGrabbers`, `stopAccepting`; drive new events.
- `web/organisms/DropFlow.tsx` — map collapsed states; render a **bare** grabbers list +
  stop control (functional, unstyled — polish deferred to worktree B).

**Acceptance:**
- `pnpm vitest run --project shared`, `--project worker`, `--project web` green.
- New unit tests: drop machine accepts N grabbers and completes on cap/stop; handler derives
  distinct keys per grabber and encrypts per-grabber; `withMessageLock` isolates grabbers;
  worker rejects `maxGrabbers > 1` for non-experimental users, accepts for experimental.
- `maxGrabbers = 1` path is behavior-identical to today (regression guard; existing e2e
  passes untouched).
- Prove-out: a manual/e2e run with `maxGrabbers = 2` shows two grabbers both receive and
  verify the same secret and the session completes after the second confirm.

### B — Web quality-of-life (`web/`)

Builds on the minimal web from A. Code against the Frozen Shared Contract.

**Files:**
- **New** `web/molecules/GrabbersList.tsx` — styled list with per-grabber status badge.
- `web/molecules/SharePane.tsx` — copy-link button, "accepting (X confirmed)" badge,
  max-grabbers input (enabled only for experimental users via the plan/feature flag the app
  already reads).
- `web/organisms/DropFlow.tsx` — swap the bare list for `GrabbersList`; polished feedback.

**Acceptance:** `pnpm vitest run --project web` green; free user sees a 1-row list and the
flow completes as before; experimental user can set a cap, see multiple rows, copy the link.

### C — CLI (`cli/`)

**Files:**
- `cli/actions/drop.ts` — optional "max grabbers" prompt (experimental only).
- `cli/logic/drop.ts` — replace the single blocking wait with a live-updating grabber list
  re-rendered on each `GRABBER_*` event; keypress / Ctrl-C → `stopAccepting`; exit when the
  machine reaches `Completed`.
- `cli/lib/log/loader.ts` — helper to render the grabber list/table (chalk; no new deps).

**Acceptance:** `pnpm vitest run --project cli` green; default invocation behaves like today
(one grabber, then exits); with a cap, CLI shows live rows and exits on cap/stop.

### D — VS Code Extension (`vscode-extension/`)

**Files:**
- `vscode-extension/src/types.ts` — add webview/extension message discriminants for grabber
  updates + stop (follow the existing string-enum convention).
- `vscode-extension/views/src/organisms/DropPane.tsx` — render a grabber table, optional max
  input (experimental), "stop accepting" button; drive new events from the shared machine.
- `vscode-extension/src/SidebarProvider.ts` — relay any new messages.
- **New** `vscode-extension/views/src/molecules/GrabberTable.tsx`.

**Acceptance:** extension builds (`pnpm vscode:build`); default path unchanged; experimental
path shows the table.

### Integration / e2e (on `multidrop`)

Add a multidrop case to the cross-platform e2e `tests/` workspace: a dropper with
`maxGrabbers = 2`, two grabbers connect, **both** receive and verify the same secret, and
the session completes after the second confirm. Use the stable `DROP_TEST_TOKEN` /
experimental bypass so the cap is permitted in CI. Keep the existing single-grabber e2e
passing unchanged. (The foundation worktree introduces this case for its prove-out; the
integration step runs the full suite on the merged branch.)

---

## Verification

- **Per worktree:** the workspace-scoped `pnpm vitest run --project <ws>` plus the
  acceptance checks above.
- **Foundation regression:** confirm `maxGrabbers = 1` reproduces current single-grabber
  behavior (existing e2e must pass untouched).
- **Integration on `multidrop`:** `pnpm test` (all unit), then cross-platform e2e including
  the new 2-grabber case. Manually exercise web `drop` with a cap of 2 in two browser tabs:
  both grabbers receive the secret and the dropper sees both confirm.
- **Worker:** verify `POST /drop` rejects `maxGrabbers > 1` for a non-experimental token and
  accepts it for an experimental one.

---

## Handoff Notes (model tiering)

- **Foundation (A):** higher-effort model — defines the frozen contract and the trickiest
  concurrency (per-grabber locks, per-grabber key derivation, deferred cleanup).
- **Surfaces (B/C/D):** Haiku or Sonnet-medium. Each receives a slice `.md` embedding the
  **Frozen Shared Contract** verbatim plus concrete file paths and acceptance, so it never
  needs to read or reason about shared internals.
- Master spec lives at project root `multidrop-design.md`; the orchestrating agent cuts the
  per-worktree slices from it at spawn time.
