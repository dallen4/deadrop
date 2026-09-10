# Migrate Stripe Webhook from web/ to worker/

**Status:** deferred — do after the one-time-purchase Supporter flow is working end-to-end on `web/`.

**Why:** consolidate backend logic in the Worker. The original concern (needing `nodejs_compat`) turned out to be unfounded — modern Stripe SDK + `constructEventAsync` runs natively on Workers.

## Evidence this works without nodejs_compat

- Stripe's own sample: https://github.com/stripe-samples/stripe-node-cloudflare-worker-template
- `wrangler.toml` in that sample has **no compatibility flags** — only `compatibility_date = "2023-01-01"`
- Uses `stripe` SDK directly (`^15.8.0` in the sample; we're on `^22.1.1` which is also fine)
- Key Workers-specific call: **`stripe.webhooks.constructEventAsync(...)`** (the sync `constructEvent` uses Node crypto and will fail in Workers)
- Cloudflare blog: https://blog.cloudflare.com/announcing-stripe-support-in-workers/ — mentions `Stripe.createFetchHttpClient()`, but the newer sample omits it (SDK auto-detects runtime).

## Steps

### 1. Add Stripe to the Worker

- `pnpm -F worker add stripe`
- Match the version pinned in `web/package.json` (currently `^22.1.1`) to avoid divergence.

### 2. Add the webhook route in `worker/src/routers/`

New file `worker/src/routers/stripe.ts` (or fold into an existing billing router if one exists by then):

```ts
import { Hono } from 'hono';
import Stripe from 'stripe';
import { createClerkClient } from '@clerk/backend';
import { Session } from 'stripe/cjs/resources/Checkout';

const router = new Hono<{ Bindings: Env }>();

router.post('/webhook', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
  const signature = c.req.raw.headers.get('stripe-signature');
  if (!signature) return c.json({ error: 'missing signature' }, 400);

  const body = await c.req.text();
  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      c.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return c.json({ error: `Webhook error: ${message}` }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Session;
    const userId = session.client_reference_id;
    if (!userId) {
      return c.json({ received: true, note: 'no client_reference_id' }, 200);
    }
    const clerk = createClerkClient({ secretKey: c.env.CLERK_SECRET_KEY });
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: { plan: 'supporter' },
    });
  }

  return c.json({ received: true }, 200);
});

export default router;
```

Mount it in `worker/src/index.ts` (or wherever routers are wired) at `/stripe`.

### 3. Worker bindings

In `worker/wrangler.toml`:
- `STRIPE_SECRET_KEY` — `wrangler secret put STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` — `wrangler secret put STRIPE_WEBHOOK_SECRET`
- `CLERK_SECRET_KEY` — likely already set; verify with `wrangler secret list`

Update the `Env` type in `worker/src/types.ts` (or wherever it lives) to include these three.

### 4. Clerk Backend SDK

`@clerk/backend` works in Workers. If it's not already in `worker/package.json`, add it:
- `pnpm -F worker add @clerk/backend`

(`@clerk/nextjs/server` won't work here — it pulls in Next.js internals.)

### 5. Update Stripe dashboard

Repoint the webhook endpoint from `https://deadrop.dev/api/webhooks/stripe` to `https://<worker-domain>/stripe/webhook` (or whatever the route ends up being). Local dev forwards to the Worker's `wrangler dev` port instead of localhost:3000.

### 6. Update the local dev `stripe:listen` script

`web/package.json` `stripe:listen` script currently points at `localhost:3000/api/webhooks/stripe`. Move it to `worker/package.json` and point at `localhost:8787/stripe/webhook` (default wrangler dev port).

### 7. Delete the old web route

- `rm web/pages/api/webhooks/stripe.ts`
- `pnpm -F web remove stripe` (only if no other web code uses it — check first)

### 8. Verification

- `pnpm -F worker dev` + `stripe listen --forward-to localhost:8787/stripe/webhook`
- Trigger a test checkout from `/pricing`
- Confirm Worker logs show the event and Clerk metadata updates

## Open questions (resolve when picking this up)

1. Is there already a `worker/src/lib/billing.ts` doing something with Clerk Billing? If so, this webhook may belong adjacent to it rather than in a new router.
2. Embedded Checkout path: if we add `/api/stripe/checkout` to create Checkout Sessions, that should also move to the Worker for the same reasons.
3. Refund handling (`charge.refunded`) — still out of scope, but the Worker is the right place for it when we get there.
