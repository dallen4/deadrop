---
description: Research a topic across web, CLI, and vscode-extension surfaces, then emit a structured plan. Usage: /research <topic> [--web] [--cli] [--vscode] [--all]
allowed-tools: Bash(grep:*), Bash(find:*), Bash(git:*), Bash(node:*), Bash(mkdir:*), WebFetch(*), WebSearch(*), Glob(*), Grep(*), Read(*), Task(*), TodoWrite(*), Write(*)
---

## User Input

```text
$ARGUMENTS
```

## Goal

Research a feature, problem, or technology by gathering evidence from the codebase and web sources in parallel via agent teams, then synthesise the findings into a structured implementation plan that honours the project's multi-surface philosophy: identical capability across the web app, the CLI, and the vscode-extension, using JS/Web-platform primitives before reaching for third-party libraries. See [[web_core_isomorphism]] — the same `shared/` code must run unmodified on every surface; never fork it with surface-specific bridges.

## Arguments

- **topic** (required): What to research (feature name, bug description, technology question)
- **--web**: Scope output plan to the web (`web/`) surface only
- **--cli**: Scope output plan to the CLI (`cli/`) surface only
- **--vscode**: Scope output plan to the vscode-extension (`vscode-extension/`) surface only
- **--all** (default): Produce a plan covering every applicable surface with feature parity notes. Not every feature applies to every surface (e.g. vault UI is CLI + vscode-extension only, not web) — Phase 1 should note which surfaces are actually in scope for the topic, not blindly assume all three.

## Phase 1 — Parse & orient

Parse `$ARGUMENTS`:
- Extract the topic (everything before any `--` flags)
- Detect surface flags (`--web`, `--cli`, `--vscode`, `--all`); default to `--all`
- Derive a short slug from the topic (lowercase, hyphens) for the output file name
- If `--all` (or no flag), sanity-check which surfaces the topic actually touches before launching agents — don't manufacture web-surface work for a CLI/vscode-only feature just because `--all` is the default

Confirm the parse to the user in one line before continuing.

## Phase 2 — Parallel research via agent teams

Launch two agents in parallel using the `Task` tool. Do not wait for one before starting the other.

### Agent A — Codebase reconnaissance (subagent_type: Explore)

Instruct this agent to:

1. **Keyword search** — find all `.ts`/`.tsx` files mentioning the topic:
   ```bash
   grep -r "<topic>" . --include="*.ts" --include="*.tsx" -l \
     --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
   ```

2. **Shared layer audit** — list and read `shared/lib/` to map what already exists (crypto primitives, XState machines, utilities, types) that could serve the feature.

3. **Multi-surface entry points** — locate and read the parallel entry point for the topic on each applicable surface:
   - Web: `web/hooks/`, `web/pages/`
   - CLI: `cli/src/`
   - VS Code extension: `vscode-extension/src/` (extension host — Node/CommonJS, externalizes `vscode`) and `vscode-extension/views/src/` (webview — browser context, Vite). Note which side of the extension (host vs. webview) owns the capability, since they run in different runtimes and talk to each other only via `postMessage` (see `ExtensionMessageType`/`WebviewMessageType` in `vscode-extension/src/types.ts`).

4. **Dependency audit** — read root `package.json` and surface-level `package.json` files (including `vscode-extension/package.json`) to inventory what is already available before any new dependency is proposed.

5. **Gap table** — return a Markdown table:

   | Capability | `shared/` | `web/` | `cli/` | `vscode-extension/` | Native primitive? | Package needed? |
   |---|---|---|---|---|---|---|

   For the `vscode-extension/` column, distinguish extension-host support from webview support where they differ (e.g. `node:crypto` available in the host, Web Crypto in the webview).

   For each gap, state *why* a native primitive (`crypto.subtle`, `fetch`, `ReadableStream`, `URL`, `EventTarget`, Node built-ins) cannot close it before flagging a package.

### Agent B — External research (subagent_type: general-purpose)

Instruct this agent to answer open questions the codebase alone cannot resolve. Limit to 5 searches. Prioritise:

1. MDN / WHATWG specs for any Web API primitives under consideration
2. Cloudflare Workers / KV / Durable Objects docs for backend constraints
3. PeerJS / WebRTC specs for P2P constraints
4. Prior art in this repo's GitHub issues/PRs (via `gh issue list` / `gh pr list`)

Return findings as a numbered list — one sentence per source — with the URL cited.

## Phase 3 — Synthesise

After both agents return, merge their findings:

- Resolve conflicts between what the codebase says and what external docs say
- Validate that every proposed primitive is available in both browser and Node.js (or note the shim required in the CLI)
- Confirm XState machine changes are scoped to `shared/lib/machines/` — no per-surface machine forks

## Phase 4 — Multi-surface plan

Produce a plan split into sections for every surface in scope:

### Shared (`shared/`)

Changes to crypto primitives, XState machines, types, or utilities that all in-scope surfaces will consume. No surface-specific code here.

### Web (`web/`)

Changes to pages, hooks, components, API routes. Each item must:
- reference the shared primitive or machine event it calls
- note any Mantine v8 component or Clerk auth concern

### CLI (`cli/`)

Changes to commands and prompt flows. Each item must:
- call the identical shared primitive as the other surfaces
- note any Node.js-specific shim needed (e.g. `@roamhq/wrtc`, `node:crypto`)

### VS Code Extension (`vscode-extension/`)

Changes to the extension host (`src/`) and/or webview (`views/src/`). Each item must:
- call the identical shared primitive as the other surfaces
- state which side owns it (host vs. webview) and, if both are touched, the `postMessage` event added/changed (extend the string enums in `src/types.ts` — don't invent ad-hoc message shapes)
- note any Node.js-specific shim needed on the host side (extension host runs like CLI, not like a browser) vs. Web Crypto/browser API on the webview side

### Parity checklist

A bullet per user-visible capability confirming it exists on every in-scope surface, or explaining an intentional exception with rationale (e.g. "vault UI is CLI + vscode-extension only; not exposed on web by design").

## Phase 5 — Write plan file

This repo tracks plans in `specs/`, not a `docs/` tree. Create the output directory if needed:

```bash
mkdir -p specs
```

Use the `Write` tool to create `specs/<slug>-plan.md` containing:

1. **Research summary** — gap table + external sources
2. **Implementation plan** — Shared / Web / CLI sections + parity checklist
3. **Open questions** — anything still unresolved after both agent passes

Confirm the file path and line count to the user.

## Output

Return a brief summary:
- Topic and surface scope
- Number of codebase files analysed (from Agent A)
- Number of external sources consulted (from Agent B)
- Key gap(s) identified
- Path to the written plan file

## Example Usage

```
/research end-to-end encryption key rotation
```

Researches key rotation across every applicable surface, writes `specs/end-to-end-encryption-key-rotation-plan.md`.

```
/research vault sync --cli
```

Researches vault sync scoped to the CLI only, writes `specs/vault-sync-plan.md`.

```
/research WebRTC reconnection --all
```

Researches WebRTC reconnection logic across every applicable surface.

```
/research vault secret display --vscode
```

Researches a vault-secret feature scoped to the vscode-extension only, writes `specs/vault-secret-display-plan.md`.

## Notes

- Never propose a third-party package if a Web Crypto / Fetch / Streams / URL / Node built-in covers the need
- All shared primitives go in `shared/lib/` — never duplicate crypto or machine logic per-surface
- Keep the XState contract stable: new events/states go through the machine, not ad-hoc side effects
- The Worker (`worker/`) is covered only when the feature requires a new Hono route or KV/Durable Object schema change
- If `--web`, `--cli`, or `--vscode` is passed alone, still note parity implications for the omitted surfaces in a "Future parity" section so they are not forgotten
- Not every feature spans all three surfaces (vault UI is CLI + vscode-extension; some web-only surface concerns like Vercel/Sentry config have no CLI or extension analog) — state scope explicitly in Phase 1 rather than forcing parity where none is intended
