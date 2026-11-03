import { describe, expect, it } from 'vitest';
import { scrubDropId, scrubSentryEvent } from 'lib/telemetry';

describe('scrubDropId', () => {
  it('redacts the drop id from grab URLs', () => {
    expect(
      scrubDropId('https://deadrop.io/grab?drop=abc123&x=1'),
    ).toBe('https://deadrop.io/grab?drop=[redacted]&x=1');
  });

  it('scrubs Sentry request URLs and breadcrumbs', () => {
    const event = scrubSentryEvent({
      request: {
        url: 'https://deadrop.io/grab?drop=abc123',
        query_string: 'drop=abc123',
      },
      breadcrumbs: [
        { data: { url: 'https://api.test/drop?id=abc123' } },
        { data: { from: '/', to: '/grab?drop=abc123' } },
      ],
    });

    expect(JSON.stringify(event)).not.toContain('abc123');
  });
});
