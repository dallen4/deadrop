import { GrabberStatus } from '@shared/types/drop';
import type { GrabberRecord } from '@shared/types/drop';
import { describe, expect, it } from 'vitest';
import { renderGrabberList, renderGrabberRows } from 'lib/log';

const makeGrabber = (
  overrides: Partial<GrabberRecord> = {},
): GrabberRecord => ({
  peerId: 'abcdef1234567890',
  connection: {} as GrabberRecord['connection'],
  dropKey: null,
  status: GrabberStatus.Connected,
  connectedAt: Date.now() - 1000,
  confirmedAt: null,
  ...overrides,
});

describe('renderGrabberRows', () => {
  it('renders a placeholder when there are no grabbers', () => {
    const rows = renderGrabberRows([]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatch(/no grabbers/i);
  });

  it('renders one row per grabber with a shortened peer id', () => {
    const rows = renderGrabberRows([
      makeGrabber({ peerId: 'abcdef1234567890' }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toContain('abcdef12');
    expect(rows[0]).not.toContain('1234567890');
  });

  it('accepts a Map keyed by peerId', () => {
    const grabbers = new Map([
      ['peer-1', makeGrabber({ peerId: 'peer-1' })],
      ['peer-2', makeGrabber({ peerId: 'peer-2' })],
    ]);

    expect(renderGrabberRows(grabbers)).toHaveLength(2);
  });
});

describe('renderGrabberList', () => {
  it('reports unbounded when maxGrabbers is null', () => {
    const text = renderGrabberList([], null);

    expect(text).toContain('unbounded');
  });

  it('counts only confirmed grabbers toward the cap', () => {
    const grabbers = [
      makeGrabber({ peerId: 'peer-1', status: GrabberStatus.Confirmed }),
      makeGrabber({
        peerId: 'peer-2',
        status: GrabberStatus.Transferring,
      }),
    ];

    const text = renderGrabberList(grabbers, 3);

    expect(text).toContain('1/3 confirmed');
  });
});
