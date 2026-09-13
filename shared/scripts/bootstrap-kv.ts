import 'dotenv/config';
import { randomBytes } from 'crypto';
import { createClerkClient } from '@clerk/backend';
import { testTokenKey } from '../tests/http';
import {
  getKeyValue,
  listKeys,
  setKeyValues,
  formatUserPrefix,
  formatVaultKey,
  formatVaultOwnerKey,
} from '../lib/kv';
import type {
  KvEntry,
  UserRecord,
  VaultRecord,
  VaultOwnerRecord,
} from '../types/kv';
import { createVaultUtils } from '../lib/turso';
import {
  vaultPrefixFromUserId,
  DEFAULT_VAULT_NAME,
  TURSO_DB_GROUP,
} from '../lib/turso/utils';

const args = new Set(process.argv.slice(2));
const commit = args.has('--commit');
const rotateToken = args.has('--rotate-token');

const REQUIRED = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_KV_NAMESPACE_ID',
  'CLERK_SECRET_KEY',
  'TURSO_PLATFORM_API_TOKEN',
];

const log = (...parts: unknown[]) => console.log(...parts);

const requireEnv = () => {
  const missing = REQUIRED.filter((name) => !process.env[name]);

  if (missing.length)
    throw new Error(`Missing env: ${missing.join(', ')}`);
};

// Clerk pages at 500; walk until a short page comes back.
const listAllUsers = async () => {
  const clerk = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY!,
  });

  const limit = 500;
  const users: { id: string }[] = [];

  for (let offset = 0; ; offset += limit) {
    const { data } = await clerk.users.getUserList({ limit, offset });

    users.push(...data.map(({ id }) => ({ id })));

    if (data.length < limit) break;
  }

  return users;
};

const syncTestToken = async (): Promise<KvEntry[]> => {
  const existing = rotateToken
    ? null
    : await getKeyValue(testTokenKey).catch(() => null);

  if (existing) {
    log(
      `test token: present, leaving as-is (--rotate-token to replace)`,
    );

    return [];
  }

  log(`test token: ${rotateToken ? 'rotating' : 'absent, seeding'}`);

  return [
    { key: testTokenKey, value: randomBytes(32).toString('base64') },
  ];
};

const syncUsersAndVaults = async (): Promise<KvEntry[]> => {
  const [users, allDatabases] = await Promise.all([
    listAllUsers(),
    createVaultUtils(
      process.env.TURSO_PLATFORM_API_TOKEN!,
    ).listVaults(''),
  ]);

  // One shared group, not per-user; schema parents are infrastructure.
  const databases = allDatabases.filter(
    (db) => db.group === TURSO_DB_GROUP && !db.is_schema,
  );

  const instance = process.env.CLERK_SECRET_KEY!.startsWith('sk_live')
    ? 'live'
    : 'test';

  // Wrong instance silently reports every vault as an orphan.
  log(`clerk instance: ${instance} (${users.length} users)`);
  log(
    `turso databases: ${databases.length} in group "${TURSO_DB_GROUP}" ` +
      `(${allDatabases.length - databases.length} skipped as non-vault)`,
  );

  const syncedAt = new Date().toISOString();
  const entries: KvEntry[] = [];
  const claimed = new Set<string>();

  for (const { id: userId } of users) {
    const prefix = await vaultPrefixFromUserId(userId);
    const owned = databases.filter((db) =>
      db.Name.startsWith(prefix),
    );

    for (const db of owned) {
      claimed.add(db.Name);

      const name = db.Name.slice(prefix.length) || DEFAULT_VAULT_NAME;

      const vault: VaultRecord = {
        userId,
        name,
        databaseName: db.Name,
        syncedAt,
      };

      const owner: VaultOwnerRecord = { userId, name };

      entries.push(
        {
          key: formatVaultKey(userId, name),
          value: JSON.stringify(vault),
        },
        {
          key: formatVaultOwnerKey(db.Name),
          value: JSON.stringify(owner),
        },
      );
    }

    const user: UserRecord = {
      userId,
      vaultPrefix: prefix,
      vaultCount: owned.length,
      syncedAt,
    };

    entries.push({
      key: formatUserPrefix(userId),
      value: JSON.stringify(user),
    });
  }

  // Report unowned databases rather than inventing an owner for them.
  const unowned = databases.filter((db) => !claimed.has(db.Name));
  const vaultShaped = /^[0-9a-f]{13}-.+$/;

  const orphans = unowned
    .filter((db) => vaultShaped.test(db.Name))
    .map((db) => db.Name);

  const unrecognized = unowned
    .filter((db) => !vaultShaped.test(db.Name))
    .map((db) => db.Name);

  if (orphans.length)
    log(
      `\norphaned vaults (no matching ${instance} user): ${orphans.join(', ')}`,
    );

  if (unrecognized.length)
    log(`not vault-shaped, ignored: ${unrecognized.join(', ')}`);

  return entries;
};

const main = async () => {
  requireEnv();

  log(
    commit
      ? '== bootstrap-kv (COMMIT) =='
      : '== bootstrap-kv (dry run) ==',
  );

  const entries = [
    ...(await syncTestToken()),
    ...(await syncUsersAndVaults()),
  ];

  const existingKeys = new Set(await listKeys());
  const created = entries.filter(
    (e) => !existingKeys.has(e.key),
  ).length;

  log(
    `\nentries to write: ${entries.length} (${created} new, ${entries.length - created} overwritten)`,
  );

  if (!commit) {
    for (const { key } of entries.slice(0, 20)) log(`  ${key}`);

    if (entries.length > 20) log(`  … ${entries.length - 20} more`);

    log(
      '\nDry run — nothing written. Re-run with --commit to apply.',
    );

    return;
  }

  if (entries.length) await setKeyValues(entries);

  log('Done.');
};

main().catch((err) => {
  // KV REST is a separate permission from the Workers deploy token.
  if (err?.status === 401 || err?.status === 403)
    console.error(
      `Cloudflare rejected the request (${err.status}). CLOUDFLARE_API_TOKEN ` +
        'needs Workers KV Storage:Edit on this account, which is not the same ' +
        'permission as the Workers deploy token.',
    );
  else console.error(err);

  process.exit(1);
});
