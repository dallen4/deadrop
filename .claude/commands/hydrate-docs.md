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

Staleness looks like: a roadmap item still marked 🧪/🛠️/📋 that has actually shipped; a command list missing a new subcommand; a directory-tree comment describing removed/replaced behavior (e.g. "filesystem" when it's now keychain-backed); a spec's checklist item not marked DONE when the code confirms it landed; **or the same feature described under different terminology in two places with different, contradictory status** (e.g. `features/index.mdx` calls it "multidrop" and marks it 🧪 Experimental, while `overview.mdx`'s compact list calls it "multi-user sharing" and marks it 📋 Planned, or `faqs.mdx` says it's "on the roadmap"). This last kind is invisible to PR-diffing — a fix to one file doesn't touch the others' wording — so it needs the dedicated sweep in Step 3b below, run regardless of PR window.

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

### 3b. Cross-file consistency sweep (always run, independent of PR window)

The PR-diff pass above only catches staleness triggered by a *recent* change. It's blind to older drift where one file's feature-status was already fixed but a duplicate description elsewhere was missed at the time — that fix is invisible to a keyword grep seeded from a different PR's vocabulary, since the two descriptions don't share words (e.g. "multidrop" vs "multi-user sharing" vs "multi-recipient drops"). This step is not scoped by the PR/commit window — always run it, every invocation, regardless of arguments.

`web/pages/docs/features/index.mdx` is the source of truth for feature status (✅ Shipped / 🧪 Experimental / 🛠️ In progress / 📋 Planned) — it's the only file with a formal status key. For every feature entry there:

1. Extract the feature's plain-language name(s) and current status.
2. Search `overview.mdx`'s compact Features list, `faqs.mdx`, and any other doc mentioning the same capability — under whatever synonym it's likely to use, not just the exact string from `features/index.mdx` (think through obvious rephrasings: a feature named "X — Y" in one doc might appear as "Y" or "multi-Z" elsewhere; check plausible alternate phrasings, not just literal substring matches).
3. Confirm the status/framing agrees. A ✅/🧪/🛠️ item must not appear elsewhere as "planned," "on the roadmap," "coming soon," or an unchecked box — and vice versa.
4. Fix every disagreement found this way, even if it traces back to a PR outside the current window.

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
- Any cross-file inconsistencies found by the Step 3b sweep, called out separately from PR-triggered changes since they aren't tied to the window
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
