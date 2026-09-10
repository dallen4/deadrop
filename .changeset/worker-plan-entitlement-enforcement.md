---
'worker': minor
'shared': minor
'web': patch
---

Enforce plan entitlements on the API. Feature gating folds into `authenticated({ feature })`, replacing the separate `restricted()` middleware, so identity and entitlement resolve in one pass. Early access and internal users keep their bypass, and it is now read from live Clerk metadata as well as the session claims, so entitlement no longer depends on the session template projecting the plan.

Plan limits are enforced rather than advertised. Daily drop limits come from plan config instead of a fixed worker variable, and both the signed in and anonymous counters resolve through the same source. Creating a cloud vault or issuing an API key past the plan cap is refused with a message naming the limit, counted live from Turso and Clerk so nothing has to be reconciled locally.

Plan limits, feature slugs and auth scopes now live in one place in shared config, and the pricing tiers page derives its copy from the same limits, so advertised numbers cannot drift from the ones actually enforced.
