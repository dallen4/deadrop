---
'deadrop-vsc': patch
---

Republish the extension so every platform target is available. The 0.1.9 publish timed out against the marketplace API partway through uploading the per-platform builds, leaving `linux-x64` and `win32-x64` missing. Every vsix is platform specific, so there was no universal build for those users to fall back to and the extension could not be installed on Windows or on the most common Linux target. No extension code changes.
