---
'cli': patch
---

`deadrop inject --ci` no longer needs `--no-sync`. A CI key mints a read-only token against a replica that gets thrown away at the end of the job, so there is nothing to replicate into and no permission to do it. Passing `--no-sync` alongside `--ci` still works and changes nothing.
