import { existsSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  isReplica,
  isV1Cache,
  prepareReplica,
  removeDbFiles,
} from '../../db/replica';

const tempDb = () =>
  join(mkdtempSync(join(tmpdir(), 'deadrop-replica-')), 'vault.db');

const touch = (...paths: string[]) =>
  paths.forEach((p) => writeFileSync(p, ''));

describe('replica files', () => {
  it('treats -info as a v2 replica', () => {
    const db = tempDb();
    touch(db, `${db}-info`, `${db}-client_wal_index`);

    expect(isReplica(db)).toBe(true);
    expect(isV1Cache(db)).toBe(false);
  });

  it('clears a v1 cache so v2 can re-pull', () => {
    const db = tempDb();
    touch(db, `${db}-wal`, `${db}-client_wal_index`);

    expect(prepareReplica(db)).toBe(true);
    expect(existsSync(db)).toBe(false);
    expect(existsSync(`${db}-wal`)).toBe(false);
    expect(existsSync(`${db}-client_wal_index`)).toBe(false);
  });

  it('leaves a v2 replica alone', () => {
    const db = tempDb();
    touch(db, `${db}-info`);

    expect(prepareReplica(db)).toBe(false);
    expect(existsSync(db)).toBe(true);
  });

  it('leaves a plain local vault alone', () => {
    const db = tempDb();
    touch(db);

    expect(prepareReplica(db)).toBe(false);
    expect(existsSync(db)).toBe(true);
  });

  it('removes a stale -info a failed attempt left behind', () => {
    const db = tempDb();
    touch(`${db}-info`);

    removeDbFiles(db);

    expect(existsSync(`${db}-info`)).toBe(false);
  });
});
