---
'shared': minor
'worker': minor
---

The worker now mints short-lived TURN credentials from Cloudflare's Realtime API and returns them alongside drop details on both create and fetch, so each dropper and grabber gets its own relay credential pair. This is additive and backward compatible: the field is new, existing clients ignore it, and P2P connectivity is unchanged until a client is updated to use it.
