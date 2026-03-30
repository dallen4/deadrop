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
wt list
```

Find the row matching `<branch>` and extract the path from the Path column.

### 3. Count existing spawned panes and choose split direction

List sessions to determine how many agent panes already exist:
```bash
it2 session list
```

Count the panes in the current tab (excluding the main session). Use this to decide split direction for a **2x2 grid layout**:

- **Pane 1** (0 agent panes exist): split the main pane **vertically** → creates a right column.
  ```bash
  it2 session split --vertical
  ```
- **Pane 2** (1 agent pane exists): split the **main pane** (left column) **horizontally** → creates bottom-left.
  ```bash
  it2 session split -s <main-session-id>
  ```
- **Pane 3** (2 agent panes exist): split the **first agent pane** (top-right) **horizontally** → creates bottom-right.
  ```bash
  it2 session split -s <first-agent-session-id>
  ```

This produces a 2x2 grid:
```
┌─────────────┬─────────────┐
│  main (TL)  │  pane 1 (TR)│
├─────────────┼─────────────┤
│  pane 2 (BL)│  pane 3 (BR)│
└─────────────┴─────────────┘
```

For 4+ panes, continue splitting existing panes vertically or horizontally as appropriate.

### 4. Get the new session ID

The `it2 session split` command outputs the new session ID directly. Capture it:
```
Created new pane: <SESSION_ID>
```

### 5. Name the pane after the branch

```bash
it2 session set-name "<branch>" -s <SESSION_ID>
```

### 6. Navigate to the worktree in the new pane

```bash
it2 session run "cd <worktree_path>" -s <SESSION_ID>
```

### 7. Launch Claude agent

If a task was provided:
```bash
it2 session run "claude '<task>'" -s <SESSION_ID>
```

If no task was provided:
```bash
it2 session run "claude" -s <SESSION_ID>
```

## Output

Confirm to the user:
- Branch name and worktree path
- Session name and grid position (e.g., "top-right", "bottom-left")
- Whether a task prompt was passed to the agent
