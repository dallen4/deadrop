---
'cli': minor
---

`deadrop inject` gains `--only` and `--prefix`, so one environment can serve jobs that need different slices of it. `--only NAME,NAME` injects just those secrets and fails on a name the environment does not have, rather than silently injecting nothing. `--prefix VITE_` renames every injected variable, so a value can be stored once and handed to a bundler that expects its own prefix.

`--only` matches the names as stored, so the list reads the same as `vault env list`; `--prefix` applies afterwards.
