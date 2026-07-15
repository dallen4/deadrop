---
'worker': patch
---

Fix the worker rejecting valid Clerk session tokens with 401 (which broke
CLI/web sign-in at `/auth/token`). Clerk now issues v2-format session
tokens, and the worker's `@clerk/backend` was pinned to v2 by the
deprecated `@hono/clerk-auth`. Migrated to `@clerk/hono`, which pulls
`@clerk/backend@3.x` and validates v2 tokens. Context API is unchanged
(`c.var.clerkAuth()`, `c.get('clerk')`, `getAuth(c)`).
