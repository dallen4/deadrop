import {
  PLAN_LIMITS,
  PLAN_SLUGS,
  SUPPORTER_FEATURES,
  type PlanKey,
} from '@shared/config/plans';

export { PlanKey };

// Clerk's sessionClaims shape is whatever the JWT template carries; pla/fea are
// Clerk Billing system claims, plan/early_access/internal are custom claims we
// project from public_metadata via the session-token template.
type SessionClaims = Record<string, unknown> | null | undefined;

export function getUserPlan(claims: SessionClaims): PlanKey {
  if (!claims) return 'free';

  // Pro (and future org) come from Clerk Billing's `pla` claim (e.g. `u:pro`)
  if (claims.pla === `u:${PLAN_SLUGS.PRO}`) return 'pro';

  // Supporter is a one-time Stripe license, not a Clerk Billing plan; grantPlan
  // writes it to public_metadata.plan, flattened into a `plan` claim by the template
  if (claims.plan === PLAN_SLUGS.SUPPORTER) return 'supporter';

  return 'free';
}

export function getPlanLimits(claims: SessionClaims) {
  return PLAN_LIMITS[getUserPlan(claims)];
}

export function hasFeature(
  claims: SessionClaims,
  feature: string,
): boolean {
  const plan = getUserPlan(claims);

  // Pro/Org: Clerk embeds active features as a comma-joined `fea` JWT claim
  const fea = (claims?.fea as string | undefined) ?? '';
  if (fea.split(',').includes(feature)) return true;

  // Supporter: check the hardcoded list since it's not a Clerk Billing plan
  if (plan === 'supporter') {
    return (SUPPORTER_FEATURES as readonly string[]).includes(
      feature,
    );
  }

  return false;
}

// experimental users (early access / internal) may unlock caps above
// their plan's default
export const isExperimental = (claims: SessionClaims): boolean =>
  !!(claims?.early_access || claims?.internal);

export const maxGrabbersPerDrop = (plan: PlanKey): number =>
  PLAN_LIMITS[plan].maxGrabbers;

export type MaxGrabbersCheck = {
  allowed: boolean;
  cap: number;
};

export const checkMaxGrabbers = (
  requested: number,
  claims: SessionClaims,
): MaxGrabbersCheck => {
  const plan = getUserPlan(claims);
  const planCap = maxGrabbersPerDrop(plan);

  if (requested <= planCap) return { allowed: true, cap: planCap };

  if (isExperimental(claims))
    return { allowed: true, cap: requested };

  return { allowed: false, cap: planCap };
};
