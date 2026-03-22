---
description: List all active worktrees and their corresponding iTerm2 sessions side-by-side
allowed-tools: Bash(wt:*), Bash(it2:*)
---

## Goal

Show a unified view of all git worktrees alongside their matching iTerm2 sessions (matched by branch/session name), so the user can see what's running where at a glance.

## Steps

### 1. Get all worktrees

```bash
wt list
```

### 2. Get all iTerm2 sessions

```bash
it2 session list
```

### 3. Correlate and display

Match sessions to worktrees by name (session name should match branch name if spawned via `/spawn`).

Present a clean table showing:
- Branch name
- Worktree path (shortened — show relative to home or repo parent)
- Worktree status (from `wt list` output: changes, ahead/behind)
- iTerm2 session ID and name if matched (or "no session" if unmatched)
- Active indicator for the current worktree (`@`) and active iTerm2 session

## Output Format

Example output:
```
Worktrees & Sessions
────────────────────────────────────────────────────────
@ main          ../deadrop                 !? ⇡    session: E345D769 (active)
  fix-nav       ../deadrop-workbench/…     clean   session: 30C13B2B "fix-nav"
  feat-music    ../deadrop-workbench/…     +3      no session
────────────────────────────────────────────────────────
3 worktrees · 2 sessions
```
