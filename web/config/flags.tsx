import { flag } from 'flags/next';
import { vercelAdapter } from '@flags-sdk/vercel';
import { useEffect, useState } from 'react';

export const PRICING_TIERS_KEY = 'user-plans';
const pricingTiersFlag = flag<boolean>({
  key: PRICING_TIERS_KEY,
  adapter: vercelAdapter(),
});

export const usePricingTiersActive = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    pricingTiersFlag().then((value) => setActive(value));
    return;
  }, []);

  return active;
};
