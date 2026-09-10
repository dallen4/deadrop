import { PLAN_LIMITS } from './plans';

const { free, supporter, pro } = PLAN_LIMITS;

// Tier copy is derived from PLAN_LIMITS so advertised numbers cannot
// drift from the limits actually enforced.
const count = (n: number) => (n === Infinity ? 'Unlimited' : `${n}`);

export type FeatureEntry = {
  label: string;
  included: boolean | 'partial';
  tooltip?: string;
};

export type CtaType =
  | 'router'
  | 'external'
  | 'clerk-checkout'
  | 'contact';

export type TierDef = {
  tierName: string;
  tagline: string;
  price: string;
  priceSubLabel?: string;
  priceBadge?: string;
  badge?: 'founding' | 'most-popular' | 'best-value';
  highlighted?: boolean;
  features: FeatureEntry[];
  ctaLabel: string;
  ctaVariant: 'filled' | 'outline' | 'light';
  ctaType: CtaType;
  ctaHref?: string;
  planId?: string;
};

export const TIERS: TierDef[] = [
  {
    tierName: 'Free',
    price: '$0',
    tagline: 'Get started with secure drops.',
    features: [
      {
        label: `${count(free.dailyDrops)} drops/day`,
        included: true,
      },
      { label: 'Local vaults', included: true },
      { label: 'CLI access', included: true },
      { label: 'Cloud-synced vault', included: false },
      { label: 'VSCode extension', included: false },
      { label: 'CI/CD API keys', included: false },
    ],
    ctaLabel: 'Start for Free',
    ctaVariant: 'outline',
    ctaType: 'router',
    ctaHref: '/drop',
  },
  {
    tierName: 'Supporter',
    price: '$15',
    priceBadge: 'one-time',
    tagline: 'Solo dev. Cloud vault + pipelines.',
    features: [
      {
        label: `${count(supporter.cloudVaults)} cloud vault (${count(
          supporter.envsPerVault,
        )} environments)`,
        included: true,
      },
      { label: 'VSCode extension', included: true },
      {
        label: `CI/CD API keys (up to ${count(
          supporter.apiKeys,
        )})`,
        included: true,
      },
      { label: 'No captcha on drops', included: true },
      { label: 'Read-only sharing for humans', included: true },
      {
        label: `${count(supporter.dailyDrops)} drops/day`,
        included: true,
      },
      { label: 'Share write access with humans', included: false },
    ],
    ctaLabel: 'Become a Supporter',
    ctaVariant: 'filled',
    ctaType: 'external',
    // resolved at runtime from NEXT_PUBLIC_STRIPE_SUPPORTER_LINK
  },
  {
    tierName: 'Pro',
    price: '$7/mo',
    priceSubLabel: 'or $60/yr — save $2/mo',
    tagline: 'Delegate access to collaborators.',
    features: [
      {
        label: `${count(pro.dailyDrops)} drops/day`,
        included: true,
      },
      {
        label: `${count(pro.cloudVaults)} cloud vaults (${count(
          pro.envsPerVault,
        ).toLowerCase()} environments)`,
        included: true,
      },
      {
        label: `${count(pro.apiKeys)} CI/CD API keys`,
        included: true,
      },
      { label: 'Read-only sharing for humans', included: true },
      { label: 'Write delegation (up to 5 humans)', included: true },
      { label: '30-day audit log', included: true },
    ],
    ctaLabel: 'Go Pro',
    ctaVariant: 'filled',
    ctaType: 'clerk-checkout',
    planId: 'pro',
  },
  {
    tierName: 'Org',
    price: '$6/seat/mo',
    priceSubLabel: '3-seat minimum',
    tagline: 'Teams with SSO, RBAC, and audit.',
    features: [
      { label: 'Unlimited everything', included: true },
      { label: 'SSO (SAML / OIDC)', included: true },
      { label: 'Role-based env access', included: true },
      { label: 'Service accounts as members', included: true },
      { label: 'Full audit log + export', included: true },
      { label: 'Priority support', included: true },
    ],
    ctaLabel: 'Contact Us',
    ctaVariant: 'light',
    ctaType: 'contact',
  },
];
