---
description: Close the iTerm2 pane and remove the worktree for a branch. Either step failing is fine — safe to run multiple times. Usage: /teardown <branch>
allowed-tools: Bash(wt:*), Bash(it2:*)
---

## Arguments

```
$ARGUMENTS
```

## Goal

Clean up a branch by closing its iTerm2 session and removing its worktree. Each step is independent — partial success is fine. Safe to run repeatedly.

## Parse Arguments

Use the first word of `$ARGUMENTS` as the branch name. If none provided, inform the user and stop.

## Steps

### 1. Close the iTerm2 session (if it exists)

Find the session by name:
```bash
SESSION_ID=$(it2 session list --json | jq -r '.[] | select(.name == "<branch>") | .id')
```

If a session was found, close it:
```bash
it2 session close -s $SESSION_ID
```

If no session found, note it and continue — don't stop.

### 2. Remove the worktree (if it exists)

```bash
wt remove <branch> --yes
```

If this fails (worktree already gone, branch doesn't exist, etc.), note it and continue — don't stop.

## Output

Report each step's outcome independently:

```
iTerm2 session: closed (w0t1p0 "fix-nav")   ✓
  — or —
iTerm2 session: not found (already closed)   –

Worktree: removed (fix-nav)                  ✓
  — or —
Worktree: not found (already removed)        –
```

Never surface an error that stops the command — always attempt both steps and summarize what happened.
