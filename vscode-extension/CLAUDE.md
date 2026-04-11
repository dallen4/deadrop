# CLAUDE.md — vscode-extension

VS Code extension providing deadrop's e2e encrypted secret sharing directly in the editor. Two distinct runtimes: the **extension host** (Node.js, CommonJS, `src/`) and the **webview** (browser/React, ESM, `views/src/`). They communicate exclusively via `postMessage`.

## Commands

```bash
pnpm vscode:build          # Production build (esbuild + vite)
pnpm vscode:dev            # Watch mode for extension host only
pnpm vscode:package        # Package .vsix (vsce --no-dependencies)
pnpm vscode:publish        # Publish to marketplace (vsce --no-dependencies)
pnpm -F deadrop-vsc views:build   # Build webview only (Vite)
pnpm -F deadrop-vsc views:dev     # Vite dev server (HMR)
pnpm -F deadrop-vsc check-types   # Type check both src/ and views/
```

Press **F5** from the monorepo root to launch the Extension Development Host (runs `vscode:build` preLaunchTask automatically).

## Directory Structure

```
vscode-extension/
├── src/                          # Extension host (Node.js, CJS)
│   ├── extension.ts              # activate() — registers all providers + commands
│   ├── SidebarProvider.ts        # WebviewViewProvider for the sidebar panel
│   ├── VaultPanel.ts             # WebviewPanel (editor tab) for vault management
│   ├── types.ts                  # Enums + message type unions + ExtensionConfig
│   ├── lib/
│   │   ├── nonce.ts              # getNonce() — shared CSP nonce generator
│   │   ├── config.ts             # loadConfig / saveConfig via cosmiconfig (.deadroprc)
│   │   └── vault.ts              # DB ops: listSecretNames / fetchEncryptedSecret /
│   │                             #   addSecret / updateSecret / deleteSecret / createVaultDB
│   ├── auth/
│   │   └── clerk.ts              # getToken/storeToken/deleteToken (SecretStorage)
│   └── commands/
│       ├── drop.ts               # deadrop.drop — drops editor selection
│       ├── dropFile.ts           # deadrop.dropFile — drops active editor document
│       ├── dropExplorerFile.ts   # deadrop.dropExplorerFile — drops explorer file
│       ├── grab.ts               # deadrop.grab — prompts for drop ID
│       ├── openVault.ts          # deadrop.openVault — opens vault editor tab
│       ├── login.ts              # deadrop.login — OAuth flow
│       └── logout.ts             # deadrop.logout — clears token
├── views/                        # Webview source (browser, ESM/React)
│   ├── index.html                # Sidebar app Vite entry
│   ├── vault.html                # Vault tab Vite entry
│   └── src/
│       ├── main.tsx              # Sidebar React entry point
│       ├── vault.tsx             # Vault tab React entry point
│       ├── App.tsx               # Sidebar root (sections, mode toggle)
│       ├── index.css             # VS Code token-based styles (sidebar + vault)
│       ├── vscode.ts             # postMessage/onMessage wrappers (typed, generic)
│       ├── components/
│       │   ├── DropPane.tsx      # XState drop machine + UI
│       │   ├── GrabPane.tsx      # XState grab machine + UI
│       │   ├── VaultPane.tsx     # Sidebar vault section ("Open Vault" button)
│       │   └── VaultApp.tsx      # Full vault editor tab UI (two-column layout)
│       └── lib/
│           ├── peer.ts           # initPeerFromConfig() → createPeer()
│           └── session.ts        # cleanupSession()
├── scripts/
│   └── esbuild.js                # Extension host build config (env baking)
├── vite.config.ts                # Webview build config (two inputs: index + vault)
├── tsconfig.json                 # Extension host TS config (CommonJS)
└── tsconfig.views.json           # Webview TS config (ESM, jsx: react-jsx)
```

## Build System

Two separate build steps, both run by `pnpm vscode:build`:

### Extension Host — esbuild (`scripts/esbuild.js`)
- Entry: `src/extension.ts` → `dist/extension.js`
- Format: CommonJS, platform: Node
- `vscode` is external (provided by VS Code at runtime)
- Env vars baked at build time via esbuild `define` from `.env`:
  - `DEADROP_API_URL`, `PEER_SERVER_URL`, `TURN_USERNAME`, `TURN_PWD`, `CLERK_PUBLISHABLE_KEY`
- `@shared` alias → `../../shared` (relative from `scripts/`)
- Source maps in dev; minified in production (`--production` flag)

### Webview — Vite (`vite.config.ts`)
- Root: `views/`
- Two entries: `views/index.html` (sidebar) and `views/vault.html` (vault tab)
- Output: `views/dist/assets/{index,vault}.{js,css}`
- `@shared` alias → `../shared` (relative from `vscode-extension/`)
- HMR available via `views:dev`

## Message Protocol

All communication between host and webview is via `postMessage`. Use `postMessage` / `onMessage` from `views/src/vscode.ts`.

### Sidebar (SidebarProvider ↔ App / DropPane / GrabPane / VaultPane)

| Direction | Enum | Payload |
|-----------|------|---------|
| webview → host | `ExtensionMessageType.Ready` | — |
| webview → host | `ExtensionMessageType.SecretReceived` | `payload: string` |
| webview → host | `ExtensionMessageType.OnInfo` | `message: string` |
| webview → host | `ExtensionMessageType.OnError` | `message: string` |
| webview → host | `ExtensionMessageType.OpenVault` | — |
| host → webview | `WebviewMessageType.Init` | `config: ExtensionConfig` |
| host → webview | `WebviewMessageType.StartDrop` | `data: string, mode: DropMode` |
| host → webview | `WebviewMessageType.StartGrab` | `dropId: string` |

### Vault Tab (VaultPanel ↔ VaultApp)

| Direction | Enum | Payload |
|-----------|------|---------|
| webview → host | `VaultExtensionMessageType.Ready` | — |
| webview → host | `VaultExtensionMessageType.CreateVault` | `name: string` |
| webview → host | `VaultExtensionMessageType.CreateEnvironment` | `name: string` |
| webview → host | `VaultExtensionMessageType.FetchSecret` | `name: string, environment: string` |
| webview → host | `VaultExtensionMessageType.AddSecret` | `name: string, value: string, environment: string` |
| webview → host | `VaultExtensionMessageType.UpdateSecret` | `name: string, value: string, environment: string` |
| webview → host | `VaultExtensionMessageType.DeleteSecret` | `name: string, environment: string` |
| webview → host | `VaultExtensionMessageType.OnInfo` | `message: string` |
| webview → host | `VaultExtensionMessageType.OnError` | `message: string` |
| host → webview | `VaultWebviewMessageType.Init` | `config: ExtensionConfig` |
| host → webview | `VaultWebviewMessageType.SecretNames` | `names: { name, environment }[]` |
| host → webview | `VaultWebviewMessageType.SecretPayload` | `name, environment, encryptedValue: string` |
| host → webview | `VaultWebviewMessageType.SecretAdded` | `name, environment: string` |
| host → webview | `VaultWebviewMessageType.SecretUpdated` | `name, environment: string` |
| host → webview | `VaultWebviewMessageType.SecretDeleted` | `name, environment: string` |
| host → webview | `VaultWebviewMessageType.EnvironmentCreated` | `name: string, key: string` |

**Important:** The vault webview never decrypts secrets or writes to the clipboard directly. All DB operations (read, write, delete) go through the extension host via messages. The webview receives an encrypted value via `SecretPayload` and must decrypt it client-side using the environment key from `config.vaultEnvironmentKeys`.

## Vault Architecture

### Extension Host Side (`src/VaultPanel.ts`, `src/lib/vault.ts`)

`VaultPanel` is a singleton — `VaultPanel.currentPanel` holds the single open instance. `createOrShow()` reveals the existing panel if already open.

- `_activeVault: VaultDBConfig | null` — currently loaded vault config (location, encryption key, environment keys)
- `_activeVaultName: string | null` — name of the active vault (matches key in `.deadroprc`)
- DB operations in `src/lib/vault.ts` use **Drizzle ORM + libsql** (SQLite, encrypted with per-vault key)
- Vault config is persisted in `.deadroprc` in the workspace root via `cosmiconfig` (`src/lib/config.ts`)
- `loadConfig()` / `saveConfig()` wrap cosmiconfig; `explorer.clearCaches()` is called after writes to avoid stale reads

### Webview Side (`views/src/components/VaultApp.tsx`)

Two-column layout:
- **Left sidebar** (`vault-sidebar`): list of environments; `+` button to create a new environment; selecting an env filters the secrets list
- **Right main** (`vault-main`): filtered secrets list + add-secret form at the bottom

`SecretRow` component (self-contained):
- Local state: `revealed`, `editMode`, `fetching`
- `pendingAction` ref (`'reveal' | 'copy'`) disambiguates `FetchSecret` round-trips (reveal shows inline, copy writes to clipboard via `navigator.clipboard`)
- Reveal auto-hides after 15 seconds
- Edit mode: inline password input + Save/Cancel (also Escape to cancel); posts `UpdateSecret`

Environments are **dynamic** — derived from `config.vaultEnvironmentKeys` on `Init`. No hardcoded environment names. Vaults start with only `development`; users create additional environments via the `+` button. `EnvironmentCreated` adds the new key to local state and `configRef`.

### Vault Config (`.deadroprc`)

```yaml
active_vault:
  name: my-vault
  environment: development
vaults:
  my-vault:
    location: /path/to/.deadrop/my-vault.db
    key: <base64 db encryption key>
    environments:
      development: <base64 AES-256-GCM key>
      staging: <base64 AES-256-GCM key>
```

Environment keys are generated via `initEnvKey()` from `@shared/lib/vault` (AES-256-GCM, exported as base64). DB files are stored in `.deadrop/` inside the workspace root.

## Enums Pattern

All message type discriminants use string enums (following `shared/lib/constants.ts`):

```typescript
// src/types.ts
export enum ExtensionMessageType { Ready = 'ready', ... }
export enum WebviewMessageType { Init = 'init', ... }
export enum DropMode { Text = 'text', File = 'file' }
export enum VaultExtensionMessageType { ... }
export enum VaultWebviewMessageType { ... }
```

Always use enum values in switch statements and message construction — never raw string literals.

## CSP Nonce Pattern

Both `SidebarProvider._getHtmlForWebview()` and `VaultPanel._getHtmlForWebview()` use `getNonce()` from `src/lib/nonce.ts`:
1. Generate a 32-char alphanumeric nonce
2. Set `script-src 'nonce-${nonce}'` in the CSP meta tag
3. Add `nonce="${nonce}"` to the `<script>` tag

The vault tab CSP `connect-src` includes the API URL for any outbound requests from the webview.

## Isomorphic Crypto

All crypto in `shared/lib/crypto/` must use `getCrypto()` (from `shared/lib/crypto/index.ts`) instead of the bare global `crypto`. This works in both browser (webview) and Node.js (extension host / CLI).

```typescript
// WRONG — breaks in some Node.js contexts
crypto.getRandomValues(bytes);

// CORRECT — isomorphic
import { getCrypto } from './crypto';
getCrypto().getRandomValues(bytes);
```

## Path Aliases

| Alias | Resolves to | Config |
|-------|------------|--------|
| `@shared/*` | `../../shared/*` | esbuild (`scripts/esbuild.js`, relative from `scripts/`) |
| `@shared/*` | `../shared/*` | Vite (`vite.config.ts`, relative from `vscode-extension/`) |
| `@shared/*` | `../shared/*` | TypeScript (`tsconfig.views.json`) |
| `@ext/*` | `src/*` | Vite + TypeScript (`tsconfig.views.json`) — use in webview code to import from the extension host's `src/` (e.g. `@ext/types`) |

## Payload Size Limit

```typescript
import { MAX_PAYLOAD_SIZE, ACCEPTED_FILE_TYPES } from '@shared/config/files';
// MAX_PAYLOAD_SIZE = 16_000 bytes (ref: RFC 8831 §6.6)
// ACCEPTED_FILE_TYPES = ['.json', '.yml', '.yaml', '.env']
```

Always check both in `dropExplorerFile.ts` before sending to the sidebar.

## How to Add a New Command

1. Create `src/commands/<name>.ts` exporting `registerXxxCommand(context, [sidebar]): vscode.Disposable`
2. Register in `extension.ts` inside `activate()`, push the return value to `context.subscriptions`
3. Add `{ "command": "deadrop.<name>", "title": "..." }` to `contributes.commands` in `package.json`
4. Add menu entry to `contributes.menus` if needed (`editor/context`, `explorer/context`, etc.)
5. Use `sidebar.sendMessage({ type: WebviewMessageType.X, ... })` if the command needs to trigger webview actions

## How to Add a New Sidebar Pane

1. Create `views/src/components/XxxPane.tsx` with `{ config: ExtensionConfig }` props
2. Mount it in `App.tsx` inside the appropriate section body
3. Use `onMessage` from `vscode.ts` in a `useEffect` for incoming messages
4. Add new message types to the enums in `src/types.ts` if needed

## How to Add a New Vault Message

1. Add the discriminant to `VaultExtensionMessageType` or `VaultWebviewMessageType` in `src/types.ts`
2. Add the message shape to `VaultExtensionMessage` or `VaultWebviewMessage` union types
3. Add a `case` in `VaultPanel` constructor's `onDidReceiveMessage` switch (for webview→host)
4. Add a handler method `_onXxx()` on `VaultPanel`
5. In the webview, post via `postMessage(...)` and handle via `onMessage(...)` in `VaultApp.tsx`

## Debug Workflow

- **F5** from monorepo root → runs `vscode:build` task, opens Extension Development Host
- Extension host logs: "Extension Host" output channel in the dev host window
- Webview logs: Ctrl+Shift+I on the webview (browser DevTools)
- After editing `src/`: rebuild with `pnpm vscode:build`, then Ctrl+R in dev host
- After editing `views/src/`: run `pnpm -F deadrop-vsc views:dev`, reload webview via Ctrl+Shift+P → "Developer: Reload Webview"

## Constraints

- Never import `vscode` from webview code — only available in the extension host
- Never put secret values in the esbuild `define` config (env vars are build-time constants, not secrets)
- Use `vscode.workspace.fs.readFile(uri)` (not Node `fs`) for file reads in commands — supports virtual filesystems (SSH remote, etc.)
- All XState machine logic lives in `shared/lib/machines/` — do not duplicate in React state
- Vault DB operations always go through the extension host — the webview has no direct DB access
- `vsce publish` must use `--no-dependencies` (see `package.json` scripts) due to pnpm workspace hoisting
- Always use isomorphic crypto patterns (`getCrypto()`) — never bare `crypto` global
