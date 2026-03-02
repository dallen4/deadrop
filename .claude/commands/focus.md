---
description: Focus the iTerm2 pane for a given branch/worktree. Usage: /focus <branch>
allowed-tools: Bash(it2:*)
---

## Arguments

```
$ARGUMENTS
```

## Goal

Find the iTerm2 session named after the given branch and bring it into focus.

## Steps

### 1. Parse branch name

Use the first word of `$ARGUMENTS` as the branch name. If none provided, list available sessions and ask.

### 2. Find matching session

```bash
it2 session list --json | jq -r '.[] | select(.name == "<branch>") | .id'
```

### 3. Focus the session

```bash
it2 session focus -s <session-id>
```

Also activate the iTerm2 app window:
```bash
it2 app activate
```

### 4. Handle no match

If no session matches the branch name, list all sessions so the user can identify the right one:

```bash
it2 session list --json | jq -r '.[] | "\(.id)  \(.name)"'
```

Inform the user which sessions are available.

## Output

Confirm: "Focused session `<session-id>` → `<branch>`"
