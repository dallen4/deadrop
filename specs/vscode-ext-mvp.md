# VSCode Extension — deadrop Full MVP Plan

## Context

Two experimental branches explored a VS Code extension for deadrop:
- `feat/vscode-ext` — modern esbuild+Vite tooling, skeleton content only
- `vscode-extension` — older webpack tooling, functional DropPane/GrabPane + command handlers

Goal: merge the best of both into a clean pnpm workspace member (`vscode-extension/`) with full MVP scope: working drop/grab flows + Clerk auth.

**Key decisions:**
- P2P runs **in the webview** (browser-native WebRTC) — matches existing branch code, no new architecture needed
- Asset filenames are **stable/hash-free** so SidebarProvider can reference them without manifest parsing
- Auth uses VS Code `SecretStorage` API + URI handler OAuth callback
- Package name is `"vscode"` (filter: `pnpm -F vscode`)
- `esbuild` and `typescript` hoisted to root — shared with `cli`. Do not redeclare in extension.
- `@clerk/clerk-js`, `xstate`, `@xstate/react`, `peerjs` hoisted to root — do not redeclare in extension.
- `react`/`react-dom` declared in `vscode-extension/` (not in root)

---

## Status

### ✅ Phase 1 — Scaffolding (complete)

All config, build tooling, extension host skeleton, and webview skeleton are implemented and building.

**Builds verified:**
- `node scripts/esbuild.js --production` → `dist/extension.js` ✓
- `pnpm views:build` → `views/dist/assets/index.js` + `views/dist/assets/index.css` ✓

**Known issue:** `@vitejs/plugin-react-swc@^4.3.0` emits a deprecation warning about `esbuild` option → use `oxc`. Update the plugin before Phase 2.

### 🔲 Phase 2 — Port DropPane/GrabPane + Auth (pending)

---

## Directory Structure

```
vscode-extension/
├── .env                       # local env (gitignored)
├── .env.example
├── .vscodeignore
├── .vscode-test.mjs
├── .vscode/
│   ├── launch.json            # F5 → Extension Development Host
│   └── tasks.json             # preLaunchTask: build
├── media/
│   └── handshake.svg          # TODO: copy from vscode-extension branch
├── src/                       # Extension host (Node.js, esbuild → dist/extension.js)
│   ├── extension.ts           ✅
│   ├── SidebarProvider.ts     ✅
│   ├── types.ts               ✅ (ExtensionConfig, ExtensionMessage, WebviewMessage)
│   ├── auth/
│   │   └── clerk.ts           ✅ (SecretStorage wrappers — Clerk headless factory is Phase 2)
│   ├── commands/
│   │   ├── drop.ts            ✅
│   │   ├── dropFile.ts        ✅
│   │   ├── grab.ts            ✅
│   │   ├── login.ts           ✅ (URI handler wired — state nonce + full OAuth flow is Phase 2)
│   │   └── logout.ts          ✅
│   └── test/
│       └── extension.test.ts  ✅
├── views/                     # Webview React app (Vite → views/dist/)
│   ├── index.html             ✅
│   ├── vite-env.d.ts          ✅
│   └── src/
│       ├── main.tsx           ✅
│       ├── App.tsx            ✅ (tab switcher, waits for init config)
│       ├── vscode.ts          ✅ (acquireVsCodeApi bridge)
│       ├── index.css          ✅
│       ├── components/
│       │   ├── DropPane.tsx   🔲 Phase 2 (skeleton only)
│       │   └── GrabPane.tsx   🔲 Phase 2 (skeleton only)
│       └── lib/
│           ├── peer.ts        🔲 Phase 2
│           └── session.ts     🔲 Phase 2
├── scripts/
│   └── esbuild.js             ✅
├── package.json               ✅
├── tsconfig.json              ✅ (extension host: CommonJS, ES2020, no DOM)
├── tsconfig.views.json        ✅ (webview: ESNext, react-jsx, moduleResolution: bundler)
└── vite.config.ts             ✅
```

---

## Phase 2 — What Remains

### `vscode-extension/views/src/components/DropPane.tsx`
- Port from `vscode-extension` branch
- Accept `config: ExtensionConfig` prop instead of `process.env`
- Use `@shared/lib/machines/drop`, `@shared/handlers/drop`
- Use `@shared/lib/crypto/operations` directly (no `browser.ts` wrapper needed)
- `logger` posts messages to extension host via `postMessage`
- Listen for `{ type: 'startDrop', data, mode }` to pre-fill content

### `vscode-extension/views/src/components/GrabPane.tsx`
- Port from `vscode-extension` branch
- Accept `config: ExtensionConfig` prop
- Use `@shared/lib/machines/grab`, `@shared/handlers/grab`
- Listen for `{ type: 'startGrab', dropId }` to auto-start grab
- On `GrabState.Confirmed`: `postMessage({ type: 'secretReceived', payload })`

### `vscode-extension/views/src/lib/peer.ts`
- `initPeerFromConfig(config)` — calls `createPeer(config.peerServerUrl, { username, credential })`
- Browser WebRTC only (no `@roamhq/wrtc` in webview context)

### `vscode-extension/views/src/lib/session.ts`
- Webview-side peer/connection cleanup on unmount

### `vscode-extension/src/commands/login.ts` (complete OAuth flow)
- Add state nonce generation
- Pass `?state=<nonce>` to `${DEADROP_API_URL}/auth/vscode`
- Validate returned state in URI handler before storing token

### `media/handshake.svg`
- Copy from either branch

### Auth OAuth Callback — Required Web Change
A `web/pages/auth/vscode.tsx` page that:
1. Signs user in with Clerk
2. Redirects to `vscode://deadrop.vscode-extension?token=<session_token>&state=<state>`

---

## Key Reuse from Existing Code

| What | Source | Notes |
|------|--------|-------|
| `shared/lib/machines/drop.ts` | shared | Use as-is |
| `shared/lib/machines/grab.ts` | shared | Use as-is |
| `shared/handlers/drop.ts` | shared | Use as-is |
| `shared/handlers/grab.ts` | shared | Use as-is |
| `shared/lib/peer.ts` | shared | Webview only |
| `shared/lib/crypto/operations.ts` | shared | Webview only |
| `shared/client.ts` | shared | Use as-is |
| `cli/actions/login.ts` | cli | Pattern ref for Clerk headless |
| `vscode-extension` branch `src/components/DropPane.tsx` | branch | Port with config prop |
| `vscode-extension` branch `src/components/GrabPane.tsx` | branch | Port with config prop |
| `media/handshake.svg` | either branch | Copy as-is |

---

## Commands

```bash
pnpm vscode:build        # full build (extension host + webview)
pnpm vscode:dev          # watch mode (extension host only)
pnpm -F vscode views:build   # webview only
pnpm -F vscode check-types   # type check both tsconfigs
pnpm -F vscode test          # run extension tests
```

---

## Verification Checklist

- [x] `pnpm install` from root — workspace recognized, deps hoisted
- [ ] `pnpm -F vscode check-types` — zero TS errors on both tsconfigs
- [x] `pnpm -F vscode build` — produces `dist/extension.js` + `views/dist/assets/index.js`
- [ ] Open `vscode-extension/` in VS Code, press F5 → Extension Development Host opens
- [ ] deadrop icon appears in Activity Bar
- [ ] Sidebar renders with Drop/Grab tabs
- [ ] Right-click text in editor → "deadrop: Start Drop" → sidebar shows with selection pre-filled
- [ ] Complete a drop/grab flow end-to-end (requires running worker)
- [ ] `deadrop.login` → browser opens → token stored in SecretStorage
- [ ] `pnpm -F vscode test` → extension tests pass
- [ ] Check webview DevTools → no CSP violations
