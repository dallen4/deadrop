import { useCallback } from 'react';
import { Modal } from '@mantine/core';
import { useMobile } from 'hooks/use-mobile';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CHECKOUT_SECRET_KEY } from 'config/cookies';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

type Props = {
  opened: boolean;
  onClose: () => void;
};

export function SupporterCheckoutModal({ opened, onClose }: Props) {
  const isMobile = useMobile();

  const fetchClientSecret = useCallback(async () => {
    const cached = sessionStorage.getItem(CHECKOUT_SECRET_KEY);
    if (cached) return cached;

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
    });
    if (!res.ok) {
      const { error } = await res
        .json()
        .catch(() => ({ error: 'failed' }));
      throw new Error(error ?? 'Failed to start checkout');
    }
    const { clientSecret } = await res.json();
    sessionStorage.setItem(CHECKOUT_SECRET_KEY, clientSecret);
    return clientSecret as string;
  }, []);

  const handleComplete = () => {
    sessionStorage.removeItem(CHECKOUT_SECRET_KEY);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Become a Supporter"
      size="lg"
      centered
      fullScreen={isMobile}
    >
      {opened && (
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{
            fetchClientSecret,
            onComplete: handleComplete,
          }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      )}
    </Modal>
  );
}
