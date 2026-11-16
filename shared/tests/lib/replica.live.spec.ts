import { createClient } from '@libsql/client';
import { existsSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { attachCloudVault } from '../../db/attach';
import { ensureSecretsSchema, syncWithRetry } from '../../db/init';
import { isReplica, prepareReplica } from '../../db/replica';
import { TURSO_ORGANIZATION } from '../../lib/constants';

// Runs against a real Turso db:
// DEADROP_LIVE_URL=libsql://... DEADROP_LIVE_TOKEN=... pnpm vitest run shared/tests/lib/replica.live.spec.ts --project 'shared (node)'
const syncUrl = process.env.DEADROP_LIVE_URL;
const authToken = process.env.DEADROP_LIVE_TOKEN;

const tempDb = () =>
  join(mkdtempSync(join(tmpdir(), 'deadrop-live-')), 'vault.db');

const open = async (path: string) => {
  const client = createClient({ url: `file:${path}`, syncUrl, authToken });
  await syncWithRetry(client);
  await ensureSecretsSchema(client);
  return client;
};

describe.skipIf(!syncUrl || !authToken)('replica against turso', () => {
  it('re-pulls a dead v1 cache over v2 and writes', async () => {
    const path = tempDb();
    writeFileSync(path, '');
    writeFileSync(`${path}-client_wal_index`, '');

    prepareReplica(path);
    const client = await open(path);

    expect(isReplica(path)).toBe(true);

    await client.execute(
      "INSERT OR REPLACE INTO secrets VALUES ('live', 'x', 'live')",
    );
    await syncWithRetry(client);
    const { rows } = await client.execute(
      "SELECT count(*) AS n FROM secrets WHERE environment = 'live'",
    );
    expect(Number(rows[0].n)).toBe(1);

    await client.execute("DELETE FROM secrets WHERE environment = 'live'");
    await syncWithRetry(client);
    client.close();
  }, 60_000);

  it('attaches a local vault, detaches, and reattaches', async () => {
    // attach derives the sync URL from the db name, so recover it.
    const name = new URL(syncUrl!).hostname.replace(
      `-${TURSO_ORGANIZATION}.turso.io`,
      '',
    );
    const local = tempDb();

    const seed = createClient({ url: `file:${local}` });
    await ensureSecretsSchema(seed);
    await seed.execute(
      "INSERT INTO secrets VALUES ('first', 'x', 'live-attach')",
    );
    seed.close();

    const vault = {
      location: local,
      environments: {},
      cloud: { name, authToken: authToken! },
    };

    vault.location = await attachCloudVault(vault);
    expect(vault.location).not.toBe(local);
    expect(isReplica(vault.location)).toBe(true);

    // Detached: written as a plain local file, sync metadata now stale.
    const detached = createClient({ url: `file:${vault.location}` });
    await detached.execute(
      "INSERT INTO secrets VALUES ('second', 'x', 'live-attach')",
    );
    detached.close();

    expect(await attachCloudVault(vault)).toBe(vault.location);
    expect(
      existsSync(vault.location.replace(/\.db$/, '-detached.db')),
    ).toBe(true);

    const client = createClient({
      url: `file:${vault.location}`,
      syncUrl,
      authToken,
    });
    await syncWithRetry(client);
    const { rows } = await client.execute(
      "SELECT name FROM secrets WHERE environment = 'live-attach' ORDER BY name",
    );
    expect(rows.map((r) => r.name)).toEqual(['first', 'second']);

    await client.execute(
      "DELETE FROM secrets WHERE environment = 'live-attach'",
    );
    await syncWithRetry(client);
    client.close();
  }, 120_000);
});
