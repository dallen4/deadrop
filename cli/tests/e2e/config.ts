import path from 'path';

// The worker API the CLI talks to. The same value is passed to the spawned
// `deadrop` processes as DEADROP_API_URL. Like the web suite, these tests are
// meant to run against a *deployed* worker (so the test token must be seeded
// into the same Upstash instance that worker reads).
export const apiURL = process.env.DEADROP_API_URL!;

// Built CLI entry the actor spawns. Override with CLI_ENTRY to point at the
// bun binary instead of the Node bundle.
export const cliEntry =
  process.env.CLI_ENTRY ||
  path.join(__dirname, '..', '..', 'dist', 'deadrop.js');

// How long to wait for a drop link to appear / a grab to complete. WebRTC
// setup across two processes can be slow on cold starts.
export const dropTimeout = Number(process.env.CLI_DROP_TIMEOUT || 30_000);
export const grabTimeout = Number(process.env.CLI_GRAB_TIMEOUT || 30_000);
