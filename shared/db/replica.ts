import { existsSync, rmSync } from 'fs';

// Turso only serves libsql's v2 sync protocol now. v2 marks a replica with
// `<db>-info`; v1 left `<db>-client_wal_index`. v1 delegated every write to
// the primary, so a v1 file is a dead cache that v2 refuses to open.
const V2_METADATA = '-info';
const V1_INDEX = '-client_wal_index';
const DB_FILES = ['', '-wal', '-shm', V2_METADATA, V1_INDEX];

export const isReplica = (path: string) =>
  existsSync(path + V2_METADATA);

export const isV1Cache = (path: string) =>
  !isReplica(path) && existsSync(path + V1_INDEX);

export const removeDbFiles = (path: string) => {
  for (const suffix of DB_FILES) rmSync(path + suffix, { force: true });
};

// Clears a dead v1 cache so the next open re-pulls over v2. Returns
// whether it did.
export const prepareReplica = (path: string) => {
  if (!isV1Cache(path)) return false;

  removeDbFiles(path);
  return true;
};
