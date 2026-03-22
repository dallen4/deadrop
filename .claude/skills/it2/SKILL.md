---
name: it2
description: Control iTerm2 from the command line — manage sessions, windows, tabs, profiles, and broadcast input across panes. Use when the user needs to split panes, open new windows/tabs, run commands in specific sessions, send text to terminals, read session output, or orchestrate multi-pane agent workspaces.
allowed-tools: Bash(it2:*)
---

# iTerm2 Control with it2

## Quick start

```bash
# List all open sessions
it2 session list --json

# Split current pane vertically
it2 session split --vertical

# Run a command in the active session
it2 session run "npm run dev"

# Send text without newline (useful for staged input)
it2 session send "some text"

# Open a new window
it2 window new

# Open a new tab
it2 tab new

# Read what's currently on screen
it2 session read

# Capture screen to file (for logging/inspection)
it2 session capture -o /tmp/session-dump.txt --history
```

## Sessions

```bash
# List all sessions (use --json for structured output)
it2 session list
it2 session list --json

# Split the active pane
it2 session split                        # horizontal
it2 session split --vertical             # vertical
it2 session split --profile "Dev"        # with a specific profile
it2 session split -s <session-id>        # split a specific session

# Run a command (sends text + newline)
it2 session run "ls -la"
it2 session run "npm test" -s <session-id>
it2 session run "echo hi" --all          # run in ALL sessions

# Send text without newline
it2 session send "partial input"
it2 session send "text" -s <session-id>
it2 session send "broadcast" --all

# Read screen contents
it2 session read
it2 session read -n 50                   # last 50 lines
it2 session read -s <session-id>

# Capture to file
it2 session capture -o /tmp/out.txt
it2 session capture -o /tmp/out.txt --history   # include scrollback
it2 session capture -s <session-id> -o /tmp/out.txt

# Name, focus, restart, close
it2 session set-name "Agent Worker 1"
it2 session focus -s <session-id>
it2 session restart
it2 session close -s <session-id>

# Session variables
it2 session get-var <variable>
it2 session set-var <variable> <value>
```

## Windows

```bash
# List windows
it2 window list

# New window (optionally with profile or command)
it2 window new
it2 window new --profile "Dev"
it2 window new --command "htop"

# Focus, resize, move
it2 window focus
it2 window resize 220 50              # columns x rows
it2 window move <x> <y>

# Fullscreen toggle
it2 window fullscreen

# Arrange / close
it2 window arrange
it2 window close
```

## Tabs

```bash
# List tabs
it2 tab list

# New tab
it2 tab new

# Navigate tabs
it2 tab next
it2 tab prev
it2 tab goto 2                        # zero-indexed

# Select by ID or index
it2 tab select -s <tab-id>

# Move tab to its own window
it2 tab move

# Close tab
it2 tab close
```

## Profiles

```bash
# List available profiles
it2 profile list

# Show a profile's properties
it2 profile show "Default"

# Apply a profile to the current session
it2 profile apply "Dev"

# Set a profile property
it2 profile set <profile> <property> <value>
```

## App / Global

```bash
# Bring iTerm2 to front
it2 app activate

# Hide iTerm2
it2 app hide

# Theme
it2 app theme               # show current theme
it2 app theme dark
it2 app theme light

# Version
it2 app version

# Focus info (what window/tab/session is active)
it2 app get-focus

# Quit
it2 app quit
```

## Broadcasting (send input to multiple sessions at once)

```bash
# Enable broadcast to all sessions in current tab
it2 app broadcast on

# Disable broadcast
it2 app broadcast off

# Broadcast to a specific group of sessions
it2 app broadcast add <session-id> <session-id> ...
```

## Monitoring

```bash
# Monitor session output (streams live)
it2 monitor output

# Monitor shell prompts (requires shell integration in iTerm2)
it2 monitor prompt

# Monitor keystrokes
it2 monitor keystroke

# Monitor session activity
it2 monitor activity

# Monitor variable changes
it2 monitor variable <variable-name>
```

## Config & Aliases

```bash
# Show config file path (~/.it2rc.yaml)
it2 config-path

# Reload config after editing
it2 config-reload

# Run a named alias from ~/.it2rc.yaml
it2 alias <alias-name>
```

## Common Patterns

### Multi-agent workspace setup

**Layout rule: max 2 columns wide.** Fill panes in this order:

```
Step 1        Step 2        Step 3        Step 4 (full)
┌───────┐    ┌────┬────┐   ┌────┬────┐   ┌────┬────┐
│  p1   │ →  │ p1 │ p2 │ → │ p1 │ p2 │ → │ p1 │ p2 │
│       │    │    │    │   │    ├────┤   ├────┼────┤
│       │    │    │    │   │    │ p3 │   │ p4 │ p3 │
└───────┘    └────┴────┘   └────┴────┘   └────┴────┘
  start     split vert   split right H  split left H
```

Split order: **vertical → right-horizontal → left-horizontal → done (2×2)**

```bash
# 1. Open a fresh window (pane1, left column)
it2 window new
P1=$(it2 session list --json | jq -r '.[-1].id')

# 2. Split LEFT vertically → pane2 on the right
it2 session split --vertical -s "$P1"
P2=$(it2 session list --json | jq -r '.[-1].id')

# 3. Split RIGHT pane horizontally → pane3 below pane2
it2 session split -s "$P2"
P3=$(it2 session list --json | jq -r '.[-1].id')

# 4. Split LEFT pane horizontally → pane4 below pane1 (2×2 complete)
it2 session split -s "$P1"
P4=$(it2 session list --json | jq -r '.[-1].id')

# Name and start agents
it2 session set-name "Orchestrator" -s "$P1"
it2 session set-name "Worker A"     -s "$P2"
it2 session set-name "Worker B"     -s "$P3"
it2 session set-name "Worker C"     -s "$P4"

it2 session run "claude" -s "$P1"
it2 session run "claude" -s "$P2"
it2 session run "claude" -s "$P3"
it2 session run "claude" -s "$P4"
```

For more than 4 agents, open a new window/tab rather than adding a
third column.

### Read output from a session

```bash
# Capture last 100 lines of a session to inspect
it2 session capture -s <session-id> -o /tmp/agent-output.txt --history
cat /tmp/agent-output.txt | tail -50
```

### Broadcast a command to all agent sessions

```bash
it2 app broadcast on
it2 session run "git status"    # runs in all sessions
it2 app broadcast off
```

### Get session IDs for scripting

```bash
# Extract session IDs from JSON output
it2 session list --json | jq '.[].id'
```
