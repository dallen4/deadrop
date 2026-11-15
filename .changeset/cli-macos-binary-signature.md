---
'cli': patch
---

macOS standalone binaries launch again. They shipped with a broken signature that Apple Silicon kills on start, so `deadrop` exited with `killed` before running any command.
