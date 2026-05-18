export const PLAN_SLUGS = {
  SUPPORTER: 'supporter', // Stripe-only; stored in publicMetadata
  PRO: 'pro', // Clerk Billing user plan
  ORG: 'org_team', // Clerk Billing org plan
} as const

export const FEATURE_SLUGS = {
  CLOUD_VAULT: 'cloud_vault',
  VSCODE_EXTENSION: 'vscode_extension',
  NO_CAPTCHA: 'no_captcha',
  CI_TOKENS: 'ci_tokens',
  VAULT_SHARING_READ: 'vault_sharing_read',
  VAULT_SHARING_WRITE: 'vault_sharing_write',
  AUDIT_LOG: 'audit_log',
  SSO: 'sso',
  RBAC: 'rbac',
  PRIORITY_SUPPORT: 'priority_support',
} as const

// Numeric limits — enforced in code since Clerk can't express them as boolean features
export const PLAN_LIMITS = {
  free: {
    dailyDrops: 5,
    cloudVaults: 0,
    envsPerVault: 0,
    ciTokens: 0,
  },
  supporter: {
    dailyDrops: 15,
    cloudVaults: 1,
    envsPerVault: 3,
    ciTokens: 10,
  },
  pro: {
    dailyDrops: Infinity,
    cloudVaults: 3,
    envsPerVault: Infinity,
    ciTokens: Infinity,
  },
  org: {
    dailyDrops: Infinity,
    cloudVaults: Infinity,
    envsPerVault: Infinity,
    ciTokens: Infinity,
  },
} as const

export type PlanKey = keyof typeof PLAN_LIMITS

// Supporter features hardcoded since Supporter isn't a Clerk Billing plan
export const SUPPORTER_FEATURES = [
  FEATURE_SLUGS.CLOUD_VAULT,
  FEATURE_SLUGS.VSCODE_EXTENSION,
  FEATURE_SLUGS.NO_CAPTCHA,
  FEATURE_SLUGS.CI_TOKENS,
] as const
