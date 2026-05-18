import { verifyWebhook } from '@clerk/nextjs/webhooks';
import type { NextApiRequest, NextApiResponse } from 'next';

// Must be public — no Clerk auth middleware on this route
export const config = { api: { bodyParser: false } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(req);
  } catch {
    return res
      .status(400)
      .json({ error: 'Invalid webhook signature' });
  }

  switch (event.type) {
    case 'subscription.created':
    case 'subscription.active':
      // JWT is the source of truth — no local record needed.
      // Extend here for grace-period tracking or analytics.
      break;

    case 'subscription.pastDue':
      // TODO: flag user for grace period handling
      break;

    case 'subscriptionItem.canceled':
      // TODO: lock cloud vaults for the affected user/org
      break;
  }

  return res.status(200).json({ received: true });
}
