---
'worker': minor
'shared': minor
---

Move drop session storage from Upstash Redis to Cloudflare KV. The worker reads the `DROP_STORE` binding straight off `c.env` instead of a `redis()` middleware, drop details are one JSON value under `formatDropKey(dropId)` with a TTL, and the daily counters are plain numeric entries. No Redis client reaches the Worker bundle any more.

Readers outside the worker (the web captcha route, the three e2e suites, the nightly token rotation) go through a new `shared/lib/kv.ts` wrapper over the Cloudflare REST SDK. It needs `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_KV_NAMESPACE_ID` wherever `REDIS_REST_URL`/`REDIS_REST_TOKEN` used to be set.

The nightly test-token rotation writes the same token to both KV and Redis for now. The deployed worker still validates against Redis while this worker validates against KV, so both stores have to agree for either to authorize a test drop. That keeps the deploy order free: seed, deploy, and re-run in any sequence. The Redis half comes out once the KV worker is live.

`getTestToken` and `verifyTestToken` now live in `shared/tests/token.ts`. `web/pages/api/captcha.ts` previously reached into `web/tests/e2e/util.ts` for the verifier, which forced a `@tests/*` alias into the web tsconfig and pulled a Playwright import into a production route; that alias is removed.

ICE servers now come from Cloudflare's STUN/TURN.
