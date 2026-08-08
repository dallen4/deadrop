---
'desktop': patch
---

The vault page no longer silently creates a `default` vault on first visit — it now asks before setting one up. You can also import an existing vault created by the `deadrop` CLI or the VS Code extension (via its project-level `.deadroprc`) into the desktop app instead of starting from scratch.
