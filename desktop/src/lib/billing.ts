// Mirrors web/lib/billing.ts + the worker's check: early_access / internal
// custom claims unlock the experimental multidrop controls. (Fast-follow:
// unify this one-liner into shared so all platforms read it from one place.)
export const isExperimental = (claims: unknown): boolean => {
  const c = claims as
    | { early_access?: unknown; internal?: unknown }
    | null
    | undefined;

  return !!(c?.early_access || c?.internal);
};
