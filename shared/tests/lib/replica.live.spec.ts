import { createClient } from '@libsql/client';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { ensureSecretsSchema, syncWithRetry } from '../../db/init';
import { isReplica, prepareReplica } from '../../db/replica';

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
});
