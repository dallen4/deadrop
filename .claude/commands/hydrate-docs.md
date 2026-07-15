---
description: Reconcile docs (web docs pages, CLAUDE.md files, tracking specs) against recently merged PRs — find and fix stale feature/roadmap claims. Usage: /hydrate-docs [PR count | since <ref>]
allowed-tools: Bash(gh:*), Bash(git:*), Bash(grep:*), Bash(find:*), Glob(*), Grep(*), Read(*), Edit(*), Write(*), Task(*)
---

## User Input

```text
$ARGUMENTS
```

## Goal

Find documentation that has gone stale relative to what actually shipped, and fix it in place. "Documentation" here means three tiers, in priority order:

1. **User-facing docs** — `web/pages/docs/**/*.mdx` (overview, features/index roadmap, features/cli, features/vscode, faqs)
2. **Agent/dev docs** — root `CLAUDE.md` and each workspace's `CLAUDE.md` (command lists, directory trees, architecture notes)
3. **Internal tracking specs** — `specs/*.md`, especially any doc that tracks open/in-progress/done items (e.g. `post-v1-fast-follows.md`)

Staleness looks like: a roadmap item still marked 🧪/🛠️/📋 that has actually shipped; a command list missing a new subcommand; a directory-tree comment describing removed/replaced behavior (e.g. "filesystem" when it's now keychain-backed); a spec's checklist item not marked DONE when the code confirms it landed.

## Arguments

- **No argument** — look at merged PRs since the last commit that touched any doc file in scope (see Step 1)
- **A number** (e.g. `/hydrate-docs 10`) — look at the last N merged PRs
- **`since <ref>`** (e.g. `/hydrate-docs since v1.0.0` or `/hydrate-docs since main`) — look at everything merged after `<ref>`

## Execution Steps

### 1. Determine the PR/commit window

If no argument, find the last commit touching any in-scope doc path and use it as the boundary:

```bash
git log -1 --format=%H -- CLAUDE.md '*/CLAUDE.md' 'web/pages/docs/**' 'specs/*.md'
```

Then list what merged after that commit:

```bash
gh pr list --state merged --limit 30 --json number,title,url,mergedAt
git log --oneline <boundary-commit>..HEAD
```

If a number N was given, use `gh pr list --state merged --limit N`. If `since <ref>` was given, use `git log <ref>..HEAD --oneline` and cross-reference merged PRs in that range.

### 2. Classify each PR/commit

For each merged PR (skip `chore: version packages` / changeset-bot PRs), pull the files changed:

```bash
gh pr view <number> --json title,body,files -q '.files[].path'
```

Classify as:
- **User-facing feature/behavior change** — new command, new flag, new UI surface, auth/storage mechanism change, plan/billing change → likely needs doc updates in all three tiers
- **Internal fix/refactor** — bug fix, CI change, dependency bump, internal-only refactor with no visible behavior change → usually no doc impact, skip unless it changes something a doc explicitly describes (e.g. a doc says "token cache lives on disk" and the fix moved it)
- **Docs-only PR** — already updated docs itself; use it as a reference for what "done" looks like, don't re-touch

Don't trust the PR title alone — a title like "fix: X" can still ship a new capability worth documenting (check the diff).

### 3. Cross-reference against the three doc tiers

For every user-facing PR identified in Step 2, search each tier for references to the area it touched:

```bash
grep -rn "<feature/command/area keyword>" web/pages/docs/ CLAUDE.md */CLAUDE.md specs/*.md
```

For each hit, read enough surrounding context to judge: does this line still accurately describe current behavior? Specifically check for:
- Status emoji/labels (✅/🧪/🛠️/📋, "in progress", "planned", "coming soon") that no longer match reality
- Command/flag lists missing something new, or listing something removed
- Prose describing a mechanism (storage backend, auth flow, API shape) that changed
- Directory-tree comments in `CLAUDE.md` files describing file purposes that no longer hold
- Tracking-spec checklist items (`specs/*.md`) not marked DONE/resolved when the code confirms they landed

Verify claims against the actual code before editing — grep for the function/file/flag the doc mentions to confirm current state, don't infer purely from the PR title.

### 4. Apply fixes

Edit stale lines directly (this command applies fixes, it does not just report). For each edit:
- Prefer minimal, surgical changes — reclassify a status emoji, add a missing command, correct a mechanism description
- If a roadmap "in progress" section becomes empty after moving its item to shipped, backfill it with whatever is confirmed to be the actual next in-progress item (check `specs/*.md` tracking docs or grep the code for partial/gated implementations) — don't leave a heading with no content
- Keep prose style consistent with the surrounding doc (emoji conventions, tone, terseness)
- For internal tracking specs, mark items DONE with a one-line pointer to the landing PR rather than deleting the historical entry

### 5. Report

Summarize:
- PR/commit window covered
- Which PRs triggered doc changes, and why (one line each)
- Files touched, grouped by tier (user-facing / CLAUDE.md / specs)
- Anything you found stale but deliberately left alone (e.g. ambiguous roadmap classification, or a PR whose user-facing impact was unclear) — flag these for the user rather than guessing

Do not commit. Leave staged/unstaged changes for the user to review.

## Example Usage

```
/hydrate-docs
```
Finds the last doc-touching commit, reconciles everything merged since.

```
/hydrate-docs 15
```
Reviews the last 15 merged PRs regardless of doc history.

```
/hydrate-docs since main
```
Reconciles docs against everything merged into the current branch after `main`.

## Notes

- This command edits files directly — it's a hydration pass, not a dry-run report. Review the diff before committing.
- Never invent roadmap status — if you can't confirm whether something shipped, grep the code for the concrete artifact (function, route, flag) rather than trusting a PR title or commit message.
- `chore: version packages` PRs (changesets release bot) carry no doc-relevant change themselves — skip them, but the changesets they bundle are a fast way to see what shipped in that batch (`.changeset/*.md` summaries are already user-facing prose).
