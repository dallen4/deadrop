---
'cli': minor
---

`deadrop apiKeys create` now shows the key on an alternate screen — the same one `less` and `vim` use — so it leaves nothing behind in your terminal scrollback once you dismiss it. Press Enter after copying and it is gone.

Two escapes for when you want the raw value: `--copy` puts it straight on your clipboard without displaying it at all, and `--print` writes it to stdout so it can be piped. Writing a key to a non-interactive stream now requires `--print` rather than happening by default, so a script or agent capturing output cannot pick one up by accident.
