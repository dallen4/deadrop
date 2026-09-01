---
'cli': patch
---

Bind the `SIGINT`/`SIGTERM`/`SIGQUIT` handlers to the signals they were meant for. `for...in` iterated the array's indices, so they registered against `"0"`, `"1"`, and `"2"` and never fired.
