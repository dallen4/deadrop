import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { attachCloudVault, cloudReplicaPath } from '../../db/attach';

const tempDb = () =>
  join(mkdtempSync(join(tmpdir(), 'deadrop-attach-')), 'vault.db');

const cloud = { name: 'unused', authToken: 'unused' };

describe('attachCloudVault', () => {
  it('moves a local vault to a sibling replica', () => {
    expect(cloudReplicaPath('/v/.deadrop/app.db')).toBe(
      '/v/.deadrop/app-cloud.db',
    );
  });

  it('keeps a replica where it is', () => {
    const db = tempDb();
    writeFileSync(`${db}-info`, '');

    expect(cloudReplicaPath(db)).toBe(db);
  });

  it('leaves a missing file for the next open to pull', async () => {
    const db = tempDb();

    await expect(
      attachCloudVault({ location: db, environments: {}, cloud }),
    ).resolves.toBe(db);
  });

  it('refuses a vault without cloud config', async () => {
    await expect(
      attachCloudVault({ location: tempDb(), environments: {} }),
    ).rejects.toThrow('Cloud config is required');
  });
});
