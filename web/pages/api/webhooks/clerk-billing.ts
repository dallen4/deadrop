import {
  BillingSubscriptionItemWebhookEvent,
  BillingSubscriptionWebhookEvent,
  verifyWebhook,
} from '@clerk/nextjs/webhooks';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@shared/client';
import { SERVICE_TOKEN_HEADER } from '@shared/lib/constants';

// Must be public — no Clerk auth middleware on this route
export const config = { api: { bodyParser: false } };

type BillingWebhookEvent =
  | BillingSubscriptionWebhookEvent
  | BillingSubscriptionItemWebhookEvent;

type BillingPayer = BillingWebhookEvent['data']['payer'];

type VaultLifecycle = 'lock' | 'unlock';

function resolveUserId(payer: BillingPayer): string | null {
  if (payer?.user_id) return payer.user_id;

  return null;
}

async function callVaultLifecycle(
  action: VaultLifecycle,
  userId: string,
) {
  const client = createClient(
    process.env.NEXT_PUBLIC_DEADROP_API_URL!,
    {
      headers: {
        [SERVICE_TOKEN_HEADER]: process.env.WORKER_SERVICE_TOKEN!,
      },
    },
  );

  const res = await client.vault[action].$post({ json: { userId } });

  if (!res.ok) {
    throw new Error(
      `vault ${action} failed (${res.status}): ${await res.text()}`,
    );
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let event: BillingWebhookEvent;

  try {
    event = (await verifyWebhook(req)) as BillingWebhookEvent;
  } catch {
    return res
      .status(400)
      .json({ error: 'Invalid webhook signature' });
  }

  try {
    const userId = resolveUserId(event.data.payer);
    switch (event.type) {
      case 'subscription.active':
        // Subscription active/reactivated — unlock the user's vaults.
        if (userId) await callVaultLifecycle('unlock', userId);
        break;

      case 'subscriptionItem.canceled':
        // Subscription canceled — lock the user's cloud vaults.
        if (userId) await callVaultLifecycle('lock', userId);
        break;

      case 'subscription.created':
        // JWT is the source of truth — no local record needed.
        // Extend here for grace-period tracking or analytics.
        break;

      case 'subscription.pastDue':
        // TODO: flag user for grace period handling
        break;
    }
  } catch (err) {
    // Surface a 500 so Clerk retries delivery
    const message =
      err instanceof Error ? err.message : 'Unknown error';
    console.error('clerk-billing webhook failed:', message);
    return res
      .status(500)
      .json({ error: 'Vault lifecycle update failed' });
  }

  return res.status(200).json({ received: true });
}
