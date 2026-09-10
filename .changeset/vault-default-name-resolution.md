---
'shared': minor
'worker': minor
---

Always give a vault a name suffix. A vault created without a name resolved to a bare `<hash13>` derived from the user id, and the ownership check requires the `<hash13>-` separator, so such a vault could never be recognised as owned by the person who created it. It rendered as read only in the desktop app, with no API keys section and no share button. An unnamed vault now resolves to `<hash13>-default`, and an empty or whitespace name resolves there too rather than silently collapsing to the bare form.

Listing a user's vaults keeps using the bare hash as a prefix filter, which is now a separate `vaultPrefixFromUserId` so plan caps and the billing lock and unlock sweeps still see every vault a user owns.

Existing API keys carry their resolved vault name in immutable claims, so any key issued without a name still points at the old bare database and needs reissuing.
