# Agent Workspace Orchestration

Patterns for setting up and managing multi-agent terminal layouts with it2.

## Typical Agent Team Layout

A common setup: one orchestrator pane + N worker panes, all in one window.

```bash
# 1. Open a fresh window
it2 window new

# 2. Get the initial session ID
ORCH=$(it2 session list --json | jq -r '.[] | select(.is_active) | .id')

# 3. Split to create worker panes
it2 session split --vertical -s $ORCH
WORKER_A=$(it2 session list --json | jq -r '.[] | select(.is_active) | .id')

it2 session split -s $ORCH
WORKER_B=$(it2 session list --json | jq -r '.[] | select(.is_active) | .id')

# 4. Name each pane
it2 session set-name "Orchestrator" -s $ORCH
it2 session set-name "Worker A"     -s $WORKER_A
it2 session set-name "Worker B"     -s $WORKER_B

# 5. Start agents
it2 session run "claude" -s $ORCH
it2 session run "claude" -s $WORKER_A
it2 session run "claude" -s $WORKER_B
```

## Finding Sessions by Name (after setup)

```bash
# Get ID of a named session
it2 session list --json | jq -r '.[] | select(.name == "Worker A") | .id'
```

## Sending Instructions to a Specific Agent

```bash
WORKER_A=$(it2 session list --json | jq -r '.[] | select(.name == "Worker A") | .id')

# Run a command in that session
it2 session run "git status" -s $WORKER_A

# Send text without executing (agent reads it as staged input)
it2 session send "implement the auth module" -s $WORKER_A
```

## Broadcasting to All Agents

```bash
# Turn on broadcast — all typed input goes to every session in the tab
it2 app broadcast on

it2 session run "git pull"    # runs in all sessions simultaneously

it2 app broadcast off
```

## Inspecting Agent Output

```bash
# Capture a session's full scrollback for inspection
it2 session capture -s <id> -o /tmp/agent-a.txt --history

# Read last 50 lines of visible screen
it2 session read -s <id> -n 50

# Check for errors across all agents
for id in $ORCH $WORKER_A $WORKER_B; do
  echo "=== $id ==="
  it2 session capture -s $id -o /tmp/check-$id.txt --history
  grep -i "error\|fail" /tmp/check-$id.txt | tail -5
done
```

## Profile-Based Layouts

Use named iTerm2 profiles to visually distinguish agent roles:

```bash
# Orchestrator gets a distinct profile (different color scheme)
it2 session split --vertical --profile "Orchestrator"
it2 session split --profile "Worker"
```

Set up profiles in iTerm2 Preferences → Profiles.

## Teardown

```bash
# Close all sessions by name pattern
it2 session list --json | jq -r '.[] | select(.name | startswith("Worker")) | .id' \
  | xargs -I{} it2 session close -s {}

# Or close the whole window
it2 window close
```

## Tab-per-Agent Pattern (alternative to splits)

```bash
# Each agent gets its own tab
it2 tab new   # tab 1 → agent 1
it2 tab new   # tab 2 → agent 2
it2 tab new   # tab 3 → agent 3

# Navigate between them
it2 tab goto 0   # first tab
it2 tab next
it2 tab prev
```
