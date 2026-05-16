import { useCallback } from 'react';
import { Modal } from '@mantine/core';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

type Props = {
  opened: boolean;
  onClose: () => void;
};

export function SupporterCheckoutModal({ opened, onClose }: Props) {
  const fetchClientSecret = useCallback(async () => {
    const res = await fetch('/api/stripe/checkout', { method: 'POST' });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'failed' }));
      throw new Error(error ?? 'Failed to start checkout');
    }
    const { clientSecret } = await res.json();
    return clientSecret as string;
  }, []);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Become a Supporter"
      size="lg"
      centered
    >
      {opened && (
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ fetchClientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      )}
    </Modal>
  );
}
