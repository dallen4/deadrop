---
'shared': minor
'cli': patch
'web': patch
'desktop': patch
'deadrop-vsc': patch
---

Drops and grabs now relay through Cloudflare's TURN network using short-lived credentials issued for each session, instead of a shared relay credential baked into every build. Connections behind restrictive networks should be more reliable, and no long-lived relay secret ships in the CLI, desktop app, extension, or web bundle anymore.

The `TURN_USERNAME` and `TURN_PWD` environment variables are no longer read and can be removed.
