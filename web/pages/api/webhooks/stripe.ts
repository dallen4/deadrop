import { clerkClient } from '@clerk/nextjs/server';
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

// Must be public — no Clerk auth middleware on this route
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const KNOWN_PLANS = ['supporter', 'pro', 'org'] as const;
type Plan = (typeof KNOWN_PLANS)[number];

async function grantPlan(userId: string, plan: Plan) {
  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { plan },
  });
}

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res
      .status(400)
      .json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown error';
    return res
      .status(400)
      .json({ error: `Webhook error: ${message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const plan = session.metadata?.plan as Plan | undefined;
    if (userId && plan && KNOWN_PLANS.includes(plan)) {
      try {
        await grantPlan(userId, plan);
      } catch (err) {
        // Return 500 so Stripe retries the delivery rather than dropping the grant
        const message =
          err instanceof Error ? err.message : 'Unknown error';
        console.error('grantPlan failed:', message);
        return res
          .status(500)
          .json({ error: 'Failed to grant plan' });
      }
    }
  }

  return res.status(200).json({ received: true });
}
