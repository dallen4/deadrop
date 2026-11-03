// The sign-in ticket is a bearer credential, so it only ever goes to the
// loopback listener the CLI (1337) or VS Code extension (1338) started.
const LOOPBACK_HOSTS = ['localhost', '127.0.0.1'];
const LOOPBACK_PORTS = ['1337', '1338'];

export const parseLoopbackRedirect = (value: unknown) => {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);

    return url.protocol === 'http:' &&
      LOOPBACK_HOSTS.includes(url.hostname) &&
      LOOPBACK_PORTS.includes(url.port)
      ? url
      : null;
  } catch {
    return null;
  }
};
