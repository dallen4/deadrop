---
'cli': patch
'web': patch
'worker': patch
---

Fix `deadrop login` failing before the sign-in ticket reaches the CLI.
The CLI no longer double-encodes the auth redirect URL, so the browser
handoff completes instead of throwing an invalid-URL error. The web
callback now surfaces token and redirect failures instead of silently
redirecting with a bad token, and the sign-in token lifetime is widened
to 60s to avoid spurious expiries.
