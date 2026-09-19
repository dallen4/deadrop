---
'desktop': minor
'worker': minor
'shared': minor
'cli': patch
---

Show and set API key injection claims in the desktop vault pane. API key rows expand to reveal the `prefix` and `only` claims they carry, and the create flow sets both against a live preview of the variables the key will inject, picking secrets from the environment rather than typing names.

Issuance now rejects an empty `only` list. Stamped onto a key it would have shaped every run down to nothing while still exiting 0. `inject` refuses such a key too, for any minted before the rule.

A prefix is checked for what the platform actually requires, so `=` and whitespace are refused and nothing else is. Names that a shell cannot reach with `$NAME` still arrive in the environment, so the desktop preview warns about them instead of blocking them. The desktop checks a prefix against that same rule before it will issue, and shows the worker's own reason when issuance is refused, rather than one generic message for a plan cap and a bad claim alike.

Listing keys validates the whole claim rather than just the vault and environment it filters on, so a claim hand-edited to the wrong shape in Clerk's dashboard is dropped from the list instead of being handed to a client to render.
