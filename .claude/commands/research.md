---
description: Research a topic across web and CLI surfaces, then emit a structured plan. Usage: /research <topic> [--web] [--cli] [--both]
allowed-tools: Bash(grep:*), Bash(find:*), Bash(git:*), Bash(node:*), Bash(mkdir:*), WebFetch(*), WebSearch(*), Glob(*), Grep(*), Read(*), Task(*), TodoWrite(*), Write(*)
---

## User Input

```text
$ARGUMENTS
```

## Goal

Research a feature, problem, or technology by gathering evidence from the codebase and web sources in parallel via agent teams, then synthesise the findings into a structured implementation plan that honours the project's dual-surface philosophy: identical capability on the web app and the CLI, using JS/Web-platform primitives before reaching for third-party libraries.

## Arguments

- **topic** (required): What to research (feature name, bug description, technology question)
- **--web**: Scope output plan to the web (`web/`) surface only
- **--cli**: Scope output plan to the CLI (`cli/`) surface only
- **--both** (default): Produce a plan covering both surfaces with feature parity notes

## Phase 1 — Parse & orient

Parse `$ARGUMENTS`:
- Extract the topic (everything before any `--` flags)
- Detect surface flags (`--web`, `--cli`, `--both`); default to `--both`
- Derive a short slug from the topic (lowercase, hyphens) for the output file name

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

3. **Dual-surface entry points** — locate and read the parallel hook/handler for the topic on each surface:
   - Web: `web/hooks/`, `web/pages/`
   - CLI: `cli/src/`

4. **Dependency audit** — read root `package.json` and surface-level `package.json` files to inventory what is already available before any new dependency is proposed.

5. **Gap table** — return a Markdown table:

   | Capability | `shared/` | `web/` | `cli/` | Native primitive? | Package needed? |
   |---|---|---|---|---|---|

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

## Phase 4 — Dual-surface plan

Produce a plan split into three sections:

### Shared (`shared/`)

Changes to crypto primitives, XState machines, types, or utilities that both surfaces will consume. No surface-specific code here.

### Web (`web/`)

Changes to pages, hooks, components, API routes. Each item must:
- reference the shared primitive or machine event it calls
- note any Mantine v8 component or Clerk auth concern

### CLI (`cli/`)

Changes to commands and prompt flows. Each item must:
- call the identical shared primitive as the web counterpart
- note any Node.js-specific shim needed (e.g. `@roamhq/wrtc`, `node:crypto`)

### Parity checklist

A bullet per user-visible capability confirming it exists on both surfaces, or explaining an intentional exception with rationale.

## Phase 5 — Write plan file

Create the output directory if needed:

```bash
mkdir -p docs/plans
```

Use the `Write` tool to create `docs/plans/<slug>-plan.md` containing:

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

Researches key rotation across both web and CLI surfaces, writes `docs/plans/end-to-end-encryption-key-rotation-plan.md`.

```
/research vault sync --cli
```

Researches vault sync scoped to the CLI only, writes `docs/plans/vault-sync-plan.md`.

```
/research WebRTC reconnection --both
```

Researches WebRTC reconnection logic for both surfaces.

## Notes

- Never propose a third-party package if a Web Crypto / Fetch / Streams / URL / Node built-in covers the need
- All shared primitives go in `shared/lib/` — never duplicate crypto or machine logic per-surface
- Keep the XState contract stable: new events/states go through the machine, not ad-hoc side effects
- The Worker (`worker/`) is covered only when the feature requires a new Hono route or KV/Durable Object schema change
- If `--web` or `--cli` is passed alone, still note parity implications in a "Future parity" section so the omitted surface is not forgotten
