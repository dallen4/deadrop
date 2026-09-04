---
'cli': minor
---

`deadrop apiKeys create` now hands back both variables a pipeline needs — the API key and the environment's `DEADROP_VAULT_KEY` — instead of leaving you to dig the second out of `.deadroprc`. They are shown on an alternate screen, the same one `less` and `vim` use, so nothing is left in your terminal scrollback once you dismiss it.

`--copy` puts both on your clipboard without displaying them, and `--print` writes them to stdout so they can be piped. Writing to a non-interactive stream now requires `--print` rather than happening by default, so a script or agent capturing output cannot pick a key up by accident.
