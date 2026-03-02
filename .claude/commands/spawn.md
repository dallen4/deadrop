---
description: Spawn a new worktree with a Claude agent in a dedicated iTerm2 pane. Usage: /spawn <branch> [task description]
allowed-tools: Bash(wt:*), Bash(it2:*)
---

## Arguments

```
$ARGUMENTS
```

## Goal

Create a new git worktree for the given branch and launch a Claude agent in a dedicated iTerm2 pane, optionally pre-loaded with a task prompt.

## Parse Arguments

Split `$ARGUMENTS` into:
- **branch**: first word (required) — the branch name to create
- **task**: remaining text (optional) — prompt to pass to the Claude agent

If no branch is provided, inform the user and stop.

## Steps

### 1. Create the worktree

```bash
wt switch --create <branch> --yes
```

### 2. Get the new worktree path

```bash
wt list --json 2>/dev/null | jq -r '.[] | select(.branch == "<branch>") | .path'
```

If `wt list --json` isn't available, derive the path from the worktree-path template pattern.

### 3. Open a new iTerm2 pane (vertical split)

```bash
it2 session split --vertical
```

Get the new session ID:
```bash
NEW_SESSION=$(it2 session list --json | jq -r 'sort_by(.id) | last | .id')
```

### 4. Name the pane after the branch

```bash
it2 session set-name "<branch>" -s $NEW_SESSION
```

### 5. Navigate to the worktree in the new pane

```bash
it2 session run "cd <worktree_path>" -s $NEW_SESSION
```

### 6. Launch Claude agent

If a task was provided:
```bash
it2 session run "claude '<task>'" -s $NEW_SESSION
```

If no task was provided:
```bash
it2 session run "claude" -s $NEW_SESSION
```

## Output

Confirm to the user:
- Branch name and worktree path
- Session name of the new pane
- Whether a task prompt was passed to the agent
