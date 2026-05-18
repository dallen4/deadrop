import {
  PLAN_LIMITS,
  PLAN_SLUGS,
  SUPPORTER_FEATURES,
  type PlanKey,
} from '@shared/config/plans'

export { PlanKey }

export function getUserPlan(
  claims: Record<string, unknown>,
): PlanKey {
  const pla = claims.pla as string | undefined

  if (pla?.startsWith('u:')) {
    const slug = pla.slice(2)
    if (slug === PLAN_SLUGS.PRO) return 'pro'
  }

  if (pla?.startsWith('o:')) {
    // All org-level plans map to 'org' limits
    return 'org'
  }

  const metadata = claims.public_metadata as
    | { plan?: string }
    | undefined
  if (metadata?.plan === PLAN_SLUGS.SUPPORTER) return 'supporter'

  return 'free'
}

export function getPlanLimits(claims: Record<string, unknown>) {
  return PLAN_LIMITS[getUserPlan(claims)]
}

export function hasFeature(
  claims: Record<string, unknown>,
  feature: string,
): boolean {
  const plan = getUserPlan(claims)

  // Pro/Org: Clerk embeds active features in the `fea` JWT claim
  const fea = claims.fea as string | undefined
  if (fea?.includes(feature)) return true

  // Supporter: check against hardcoded feature list since it's not a Clerk plan
  if (plan === 'supporter') {
    return (SUPPORTER_FEATURES as readonly string[]).includes(feature)
  }

  return false
}
