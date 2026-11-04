import { describe, expect, it } from 'vitest';
import { parseLoopbackRedirect } from 'lib/loopback';

describe('parseLoopbackRedirect', () => {
  it.each([
    'http://localhost:1337',
    'http://127.0.0.1:1337',
    'http://127.0.0.1:1338/',
  ])('accepts the CLI/VS Code listener %s', (url) => {
    expect(parseLoopbackRedirect(url)).not.toBeNull();
  });

  it.each([
    'https://attacker.example/collect',
    'http://localhost.attacker.example:1337',
    'https://localhost:1337',
    'http://localhost:8080',
    'http://localhost',
    'javascript:alert(1)',
    'not a url',
    undefined,
    ['http://localhost:1337'],
  ])('rejects %j', (url) => {
    expect(parseLoopbackRedirect(url)).toBeNull();
  });
});
