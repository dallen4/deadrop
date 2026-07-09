---
'cli': minor
---

Added a `deadrop inject -- <command>` command — runs a command with
the active (or selected) vault's secrets injected directly into its
environment. Secrets are decrypted in memory and never written to
disk, replacing the export-to-`.env`-then-source pattern for local
dev and CI/CD.

Supports `-v/--vault`, `-e/--environment`, `-c/--config` (explicit
config file, JSON or YAML, for CI), and `--no-override`. Forwards
SIGINT/SIGTERM/SIGHUP to the child and exits with its exit code.
