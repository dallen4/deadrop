# Monitoring & Events

`it2 monitor` streams live events from iTerm2 sessions. Useful for watching agent output, detecting when a command finishes, or reacting to shell prompts.

## Commands

```bash
# Stream all output from the active session
it2 monitor output

# Stream output from a specific session
it2 monitor output -s <session-id>

# Monitor shell prompts (fires each time a new prompt appears)
# Requires shell integration to be installed in iTerm2
it2 monitor prompt

# Monitor keystrokes
it2 monitor keystroke

# Monitor session activity (fires on any activity)
it2 monitor activity

# Monitor a specific variable for changes
it2 monitor variable path        # fires when CWD changes
it2 monitor variable hostname
```

## Shell Integration Requirement

`it2 monitor prompt` and CWD variable monitoring require iTerm2 shell integration. Install via:

**iTerm2 menu → Install Shell Integration**

This adds a source line to your shell rc file (`.zshrc` / `.bashrc`):
```sh
source ~/.iterm2_shell_integration.zsh
```

## Practical Patterns

### Wait for a command to finish (prompt reappears)

```bash
# Start a long command in a session, monitor for prompt return
it2 session run "npm run build" -s <id>
it2 monitor prompt -s <id>   # blocks until next prompt — build is done
```

### Watch agent output live

```bash
it2 monitor output -s <id>
# Ctrl+C to stop
```

### Detect when CWD changes

```bash
it2 monitor variable path -s <id>
```

### Capture a snapshot when activity detected

```bash
# Trigger a capture whenever a session produces output
it2 monitor activity -s <id> && it2 session capture -s <id> -o /tmp/snapshot.txt
```

## Notes

- All `monitor` commands stream to stdout and block until Ctrl+C
- Use them in background subshells for non-blocking monitoring:
  ```bash
  it2 monitor output -s <id> > /tmp/agent-log.txt &
  MONITOR_PID=$!
  # ... do other things ...
  kill $MONITOR_PID
  ```
