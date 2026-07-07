import { describe, expect, it } from 'vitest';
import {
  checkMaxGrabbers,
  getPlanLimits,
  getUserPlan,
  hasFeature,
  isExperimental,
  maxGrabbersPerDrop,
} from '../../src/lib/billing';
import { FEATURE_SLUGS, PLAN_LIMITS } from '@shared/config/plans';

describe('billing', () => {
  describe('getUserPlan', () => {
    it('defaults to free with no claims', () => {
      expect(getUserPlan(null)).toBe('free');
      expect(getUserPlan(undefined)).toBe('free');
      expect(getUserPlan({})).toBe('free');
    });

    it('reads pro from the Clerk Billing pla claim', () => {
      expect(getUserPlan({ pla: 'u:pro' })).toBe('pro');
    });

    it('reads supporter from the flattened plan claim', () => {
      expect(getUserPlan({ plan: 'supporter' })).toBe('supporter');
    });

    it('prefers a pro pla claim over a supporter plan claim', () => {
      expect(
        getUserPlan({ pla: 'u:pro', plan: 'supporter' }),
      ).toBe('pro');
    });

    it('falls through to free for an unrecognized plan claim', () => {
      expect(getUserPlan({ plan: 'made-up-tier' })).toBe('free');
    });

    it('falls through to free for an unrecognized pla slug', () => {
      expect(getUserPlan({ pla: 'u:made-up' })).toBe('free');
    });
  });

  describe('getPlanLimits', () => {
    it('returns free limits with no claims', () => {
      expect(getPlanLimits(null)).toEqual(PLAN_LIMITS.free);
    });

    it('returns the limits for the resolved plan', () => {
      expect(getPlanLimits({ plan: 'supporter' })).toEqual(
        PLAN_LIMITS.supporter,
      );
      expect(getPlanLimits({ pla: 'u:pro' })).toEqual(
        PLAN_LIMITS.pro,
      );
    });
  });

  describe('hasFeature', () => {
    it('returns false for a free user', () => {
      expect(hasFeature({}, FEATURE_SLUGS.CLOUD_VAULT)).toBe(
        false,
      );
    });

    it('grants the hardcoded supporter feature set', () => {
      const claims = { plan: 'supporter' };

      expect(hasFeature(claims, FEATURE_SLUGS.CLOUD_VAULT)).toBe(
        true,
      );
      expect(
        hasFeature(claims, FEATURE_SLUGS.VSCODE_EXTENSION),
      ).toBe(true);
    });

    it('does not grant features outside the supporter allowlist', () => {
      expect(hasFeature({ plan: 'supporter' }, FEATURE_SLUGS.SSO)).toBe(
        false,
      );
    });

    it('grants a feature present in the fea claim for pro users', () => {
      expect(
        hasFeature(
          { pla: 'u:pro', fea: 'cloud_vault,sso' },
          FEATURE_SLUGS.SSO,
        ),
      ).toBe(true);
    });

    it('does not grant a feature missing from the fea claim', () => {
      expect(
        hasFeature(
          { pla: 'u:pro', fea: 'cloud_vault' },
          FEATURE_SLUGS.SSO,
        ),
      ).toBe(false);
    });

    it('does not partial-match a feature that is a substring of a granted one', () => {
      // token-split guards against `fea.includes()` over-granting: a claim of
      // `vault_sharing_write` must not satisfy a `vault_sharing_read` check
      expect(
        hasFeature(
          { pla: 'u:pro', fea: 'vault_sharing_write' },
          FEATURE_SLUGS.VAULT_SHARING_READ,
        ),
      ).toBe(false);
    });
  });

  describe('isExperimental', () => {
    it('is false with no claims', () => {
      expect(isExperimental(null)).toBe(false);
      expect(isExperimental({})).toBe(false);
    });

    it('is true for early_access', () => {
      expect(isExperimental({ early_access: true })).toBe(true);
    });

    it('is true for internal', () => {
      expect(isExperimental({ internal: true })).toBe(true);
    });
  });

  describe('maxGrabbersPerDrop', () => {
    it("caps the free plan at 1 (today's single-grabber behavior)", () => {
      expect(maxGrabbersPerDrop('free')).toBe(1);
    });

    it('raises the cap for paid plans', () => {
      expect(maxGrabbersPerDrop('supporter')).toBeGreaterThan(1);
      expect(maxGrabbersPerDrop('pro')).toBeGreaterThan(
        maxGrabbersPerDrop('supporter'),
      );
    });
  });

  describe('checkMaxGrabbers', () => {
    it('rejects maxGrabbers > 1 for a non-experimental free user', () => {
      const result = checkMaxGrabbers(2, null);

      expect(result.allowed).toBe(false);
      expect(result.cap).toBe(1);
    });

    it('lets a supporter use their raised cap from a real plan claim', () => {
      const result = checkMaxGrabbers(3, { plan: 'supporter' });

      expect(result.allowed).toBe(true);
      expect(result.cap).toBe(maxGrabbersPerDrop('supporter'));
    });

    it('rejects a supporter request above their plan cap', () => {
      const result = checkMaxGrabbers(999, { plan: 'supporter' });

      expect(result.allowed).toBe(false);
      expect(result.cap).toBe(maxGrabbersPerDrop('supporter'));
    });

    it('lets a pro user use their raised cap from the pla claim', () => {
      const result = checkMaxGrabbers(20, { pla: 'u:pro' });

      expect(result.allowed).toBe(true);
      expect(result.cap).toBe(maxGrabbersPerDrop('pro'));
    });

    it('accepts maxGrabbers > 1 for an experimental user regardless of plan', () => {
      expect(checkMaxGrabbers(2, { early_access: true }).allowed).toBe(
        true,
      );
      expect(checkMaxGrabbers(10, { internal: true }).allowed).toBe(
        true,
      );
    });
  });
});
