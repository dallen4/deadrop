// Clerk's sessionClaims shape is whatever the JWT carries; early_access and
// internal are custom claims, mirroring the same check the worker makes
// before allowing maxGrabbers > 1 (see worker/src/lib/billing.ts).
export const isExperimental = (claims: unknown): boolean => {
    const c = claims as { early_access?: unknown; internal?: unknown } | null | undefined;

    return !!(c?.early_access || c?.internal);
};
