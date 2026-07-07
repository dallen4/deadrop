export const PRICING_TIERS_KEY = 'user-plans';

export const usePricingTiersActive = () =>
  process.env.NEXT_PUBLIC_PRICING_TIERS_ENABLED === 'true';
