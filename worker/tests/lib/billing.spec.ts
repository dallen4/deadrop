import { describe, expect, it } from 'vitest';
import {
  checkMaxGrabbers,
  isExperimental,
  maxGrabbersPerDrop,
  planFromClaims,
} from '../../src/lib/billing';

describe('billing', () => {
  describe('planFromClaims', () => {
    it('defaults to free when no plan claim is present', () => {
      expect(planFromClaims(null)).toBe('free');
      expect(planFromClaims(undefined)).toBe('free');
      expect(planFromClaims({})).toBe('free');
    });

    it('falls back to free for an unrecognized plan', () => {
      expect(planFromClaims({ plan: 'made-up-tier' })).toBe('free');
    });

    it('reads a recognized plan from claims', () => {
      expect(planFromClaims({ plan: 'pro' })).toBe('pro');
    });
  });

  describe('isExperimental', () => {
    it('is false with no claims', () => {
      expect(isExperimental(null)).toBe(false);
    });

    it('is true for early_access', () => {
      expect(isExperimental({ early_access: true })).toBe(true);
    });

    it('is true for internal', () => {
      expect(isExperimental({ internal: true })).toBe(true);
    });
  });

  describe('maxGrabbersPerDrop', () => {
    it('caps the free plan at 1 (today\'s single-grabber behavior)', () => {
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

    it('rejects a request above plan cap for a non-experimental paid user', () => {
      const result = checkMaxGrabbers(999, { plan: 'pro' });

      expect(result.allowed).toBe(false);
      expect(result.cap).toBe(maxGrabbersPerDrop('pro'));
    });

    it('accepts maxGrabbers > 1 for an experimental user', () => {
      const result = checkMaxGrabbers(2, { early_access: true });

      expect(result.allowed).toBe(true);
    });

    it('accepts maxGrabbers > 1 for an internal user', () => {
      const result = checkMaxGrabbers(10, { internal: true });

      expect(result.allowed).toBe(true);
    });

    it('accepts a request within plan cap without needing experimental access', () => {
      const result = checkMaxGrabbers(3, { plan: 'supporter' });

      expect(result.allowed).toBe(true);
      expect(result.cap).toBe(maxGrabbersPerDrop('supporter'));
    });
  });
});
