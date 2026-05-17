export type FeatureEntry = {
  label: string
  included: boolean | 'partial'
  tooltip?: string
}

export type CtaType = 'router' | 'external' | 'clerk-checkout' | 'contact'

export type TierDef = {
  tierName: string
  tagline: string
  price: string
  priceSubLabel?: string
  badge?: 'founding' | 'most-popular' | 'best-value'
  highlighted?: boolean
  features: FeatureEntry[]
  ctaLabel: string
  ctaVariant: 'filled' | 'outline' | 'light'
  ctaType: CtaType
  ctaHref?: string
  planId?: string
}

export const TIERS: TierDef[] = [
  {
    tierName: 'Free',
    price: '$0',
    tagline: 'Get started with secure drops.',
    features: [
      { label: '5 drops/day', included: true },
      { label: 'Local vaults', included: true },
      { label: 'CLI access', included: true },
      { label: 'Cloud-synced vault', included: false },
      { label: 'VSCode extension', included: false },
      { label: 'CI/CD pipeline injection', included: false },
    ],
    ctaLabel: 'Start for Free',
    ctaVariant: 'outline',
    ctaType: 'router',
    ctaHref: '/drop',
  },
  {
    tierName: 'Supporter',
    price: '$15',
    priceSubLabel: 'one-time',
    tagline: 'Solo dev. Cloud vault + pipelines.',
    badge: 'founding',
    features: [
      { label: '15 drops/day', included: true },
      { label: '1 cloud vault (3 environments)', included: true },
      { label: 'VSCode extension', included: true },
      { label: 'CI/CD service tokens (up to 10)', included: true },
      { label: 'No captcha on drops', included: true },
      { label: 'Share write access with humans', included: false },
    ],
    ctaLabel: 'Become a Supporter',
    ctaVariant: 'filled',
    ctaType: 'external',
    // resolved at runtime from NEXT_PUBLIC_STRIPE_SUPPORTER_LINK
  },
  {
    tierName: 'Pro',
    price: '$8/mo',
    priceSubLabel: 'or $69/yr — save 28%',
    tagline: 'Delegate access to collaborators.',
    badge: 'most-popular',
    highlighted: true,
    features: [
      { label: 'Unlimited drops', included: true },
      { label: '3 cloud vaults (unlimited environments)', included: true },
      { label: 'Unlimited CI/CD service tokens', included: true },
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
]
