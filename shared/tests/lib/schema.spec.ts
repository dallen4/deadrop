import { createClient } from '@libsql/client';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { ensureSecretsSchema } from '../../db/init';

const tempDb = () =>
  `file:${join(mkdtempSync(join(tmpdir(), 'deadrop-schema-')), 'vault.db')}`;

describe('ensureSecretsSchema', () => {
  it('creates the table when it is missing', async () => {
    const client = createClient({ url: tempDb() });

    await ensureSecretsSchema(client);

    const { rows } = await client.execute(
      "SELECT 1 FROM sqlite_master WHERE name = 'secrets'",
    );
    expect(rows).toHaveLength(1);
    client.close();
  });

  // A read-only token refuses DDL, even a no-op one.
  it('issues no DDL when the table exists', async () => {
    const client = createClient({ url: tempDb() });
    await ensureSecretsSchema(client);
    const execute = vi.spyOn(client, 'execute');

    await ensureSecretsSchema(client);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(String(execute.mock.calls[0][0])).toMatch(/^SELECT/);
    client.close();
  });
});
