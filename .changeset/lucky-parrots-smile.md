---
'cli': minor
---

Add a `--debug` flag for verbose diagnostic output, and route stray `console` calls through it. `vault import` no longer prints the resolved `.env` path on every run, and failed logins, vault creations, and cloud replica deletions no longer dump raw errors or response bodies unless `--debug` is set.
