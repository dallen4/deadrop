# Config & Aliases

`it2` supports a YAML config file at `~/.it2rc.yaml` for named aliases — reusable command sequences you can trigger with `it2 alias <name>`.

## Config File

```bash
# Find the config path
it2 config-path
# → Configuration file: /Users/you/.it2rc.yaml

# Create it if it doesn't exist
touch ~/.it2rc.yaml

# Reload after editing
it2 config-reload
```

## Alias Format

```yaml
# ~/.it2rc.yaml
aliases:
  dev-layout:
    description: "3-pane dev layout: editor, server, logs"
    commands:
      - session split --vertical
      - session split
      - session run "npm run dev" -s active
      - session run "npm run logs"

  agent-team:
    description: "Spin up 3 Claude agent panes"
    commands:
      - window new
      - session split --vertical
      - session split
      - session set-name "Orchestrator"
      - session run "claude"

  broadcast-status:
    description: "Run git status in all sessions"
    commands:
      - app broadcast on
      - session run "git status"
      - app broadcast off
```

## Running Aliases

```bash
it2 alias dev-layout
it2 alias agent-team
it2 alias broadcast-status
```

## Profiles Section

You can also define load-able profile presets in the config:

```yaml
profiles:
  focus:
    description: "Minimal single-pane focus mode"
    window:
      fullscreen: true
    session:
      profile: "Focus"

  coding:
    description: "Coding layout with two vertical panes"
    layout:
      - split: vertical
        profile: "Dev"
```

Load with:
```bash
it2 load focus
it2 load coding
```
