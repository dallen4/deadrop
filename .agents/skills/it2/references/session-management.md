# Session Management

Sessions are the core unit in iTerm2 — each terminal pane is a session. Most commands default to the **active session** but accept `-s <session-id>` for targeting.

## Getting Session IDs

Always use `--json` to get machine-readable session data for scripting:

```bash
it2 session list --json
```

Example output:
```json
[
  {
    "id": "w0t0p0",
    "name": "bash",
    "window_id": "w0",
    "tab_id": "t0",
    "is_active": true
  },
  {
    "id": "w0t0p1",
    "name": "Agent Worker",
    "window_id": "w0",
    "tab_id": "t0",
    "is_active": false
  }
]
```

Extract IDs for scripting:
```bash
# All session IDs
it2 session list --json | jq -r '.[].id'

# Active session ID
it2 session list --json | jq -r '.[] | select(.is_active) | .id'

# Session ID by name
it2 session list --json | jq -r '.[] | select(.name == "Agent Worker") | .id'
```

## Targeting Sessions

```bash
# Default: active session
it2 session run "ls"

# Specific session by ID
it2 session run "ls" -s w0t0p1

# All sessions at once
it2 session run "ls" --all
```

## Session Lifecycle

```bash
# Create via split (horizontal by default)
it2 session split
it2 session split --vertical
it2 session split --profile "Dev" --vertical

# Name it
it2 session set-name "My Pane"

# Focus it
it2 session focus -s <id>

# Restart (kills current process, starts fresh shell)
it2 session restart -s <id>

# Close
it2 session close -s <id>
```

## Reading Session Content

`it2 session read` reads visible screen contents. For full history, use `capture`:

```bash
# Read visible screen (active session)
it2 session read

# Read last N lines
it2 session read -n 100

# Full capture with scrollback to file
it2 session capture -o /tmp/dump.txt --history -s <id>
```

Use `capture` for inspection patterns — read the file after:
```bash
it2 session capture -s <id> -o /tmp/out.txt --history
grep "ERROR" /tmp/out.txt
```

## Session Variables

iTerm2 sessions expose variables (shell integration required for some):

```bash
# Get a variable
it2 session get-var pid
it2 session get-var hostname
it2 session get-var username
it2 session get-var path          # current working directory

# Set a custom variable
it2 session set-var myKey myValue
```

Common built-in variables: `pid`, `hostname`, `username`, `path`, `name`, `id`, `columns`, `rows`

## Run vs Send

| Command | Behavior | Use when |
|---|---|---|
| `it2 session run "cmd"` | sends text + newline (executes) | running shell commands |
| `it2 session send "text"` | sends text only (no newline) | staged input, passwords, partial commands |

```bash
# Execute immediately
it2 session run "npm run dev" -s <id>

# Stage input without executing (user presses Enter)
it2 session send "git commit -m 'wip'" -s <id>
```
