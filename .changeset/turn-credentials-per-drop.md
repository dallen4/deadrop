---
'shared': minor
'worker': minor
---

The worker now mints short-lived TURN credentials from Cloudflare's Realtime API and returns them alongside drop details on both create and fetch, so each dropper and grabber gets its own relay credential pair. This is additive and backward compatible: the field is new and existing clients ignore it.

A drop with no relay credentials can silently fail to connect for a grabber behind a restrictive NAT, so a failed mint (bad key, quota, provider outage) now fails the request with a clean 500 rather than either an unhandled crash or a drop that looks successful but can't actually relay.
