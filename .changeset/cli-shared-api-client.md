---
'cli': patch
---

Commands that talk to the deadrop API now share one client, so being signed out reports the same "run `deadrop login`" message everywhere instead of a different one per command. `deadrop vault delete` checks up front rather than discovering it through a rejected request.
