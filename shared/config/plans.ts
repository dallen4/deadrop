export const PLAN_SLUGS = {
  FREE: 'free',
  SUPPORTER: 'supporter', // Stripe-only; stored in publicMetadata
  PRO: 'pro', // Clerk Billing user plan
  ORG: 'org_team', // Clerk Billing org plan - not currently supported
} as const;

export const FEATURE_SLUGS = {
  CLOUD_VAULT: 'cloud_vault',
  VSCODE_EXTENSION: 'vscode_extension',
  NO_CAPTCHA: 'no_captcha',
  API_KEYS: 'api_keys',
  VAULT_SHARING_READ: 'vault_sharing_read',
  VAULT_SHARING_WRITE: 'vault_sharing_write',
} as const;

export type PlanLimitSet = {
  // Drops started per UTC day. Anonymous callers resolve to the free set.
  dailyDrops: number;
  // Turso databases the user may own. Counted from Turso, never mirrored.
  cloudVaults: number;
  // Named environments within one vault.
  envsPerVault: number;
  // Clerk API keys held at once, not runs per day — one key serves
  // unlimited deploys. Counted via Clerk's apiKeys.list, never mirrored.
  apiKeys: number;
  // Concurrent grabbers per drop. early_access/internal lifts this cap.
  maxGrabbers: number;
};

// Numeric limits for plans for features
export const PLAN_LIMITS = {
  [PLAN_SLUGS.FREE]: {
    dailyDrops: 3,
    cloudVaults: 0,
    envsPerVault: 0,
    apiKeys: 0,
    maxGrabbers: 1,
  },
  [PLAN_SLUGS.SUPPORTER]: {
    dailyDrops: 5,
    cloudVaults: 1,
    envsPerVault: 3,
    apiKeys: 10,
    maxGrabbers: 5,
  },
  [PLAN_SLUGS.PRO]: {
    dailyDrops: Infinity,
    cloudVaults: 3,
    envsPerVault: Infinity,
    apiKeys: Infinity,
    maxGrabbers: 25,
  },
  [PLAN_SLUGS.ORG]: {
    dailyDrops: Infinity,
    cloudVaults: Infinity,
    envsPerVault: Infinity,
    apiKeys: Infinity,
    maxGrabbers: 100,
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export type FeatureSlug =
  (typeof FEATURE_SLUGS)[keyof typeof FEATURE_SLUGS];

// Delegable capabilities stamped onto a Clerk API key. Distinct from
// FEATURE_SLUGS: a feature is what a plan grants a user, a scope is what
// one credential may do on their behalf.
export enum AuthScopes {
  VaultInject = 'vault:inject',
}

// Every scope is a delegation of an entitlement the user must already
// hold, so issuing a key checks the mapped feature.
export const SCOPE_FEATURES: Record<AuthScopes, FeatureSlug> = {
  [AuthScopes.VaultInject]: FEATURE_SLUGS.API_KEYS,
};

// Supporter features hardcoded since Supporter isn't a Clerk Billing plan
export const SUPPORTER_FEATURES = [
  FEATURE_SLUGS.CLOUD_VAULT,
  FEATURE_SLUGS.VSCODE_EXTENSION,
  FEATURE_SLUGS.NO_CAPTCHA,
  FEATURE_SLUGS.API_KEYS,
  FEATURE_SLUGS.VAULT_SHARING_READ,
] as const;
