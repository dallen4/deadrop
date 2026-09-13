import Cloudflare from 'cloudflare';
import { ZodSchema } from 'zod';
import type { KvEntry } from '../types/kv';
import { DEFAULT_VAULT_NAME } from './turso/utils';

const KEY_DELIMITER = ':';

enum KeyPrefixes {
  Drop = 'drop',
  User = 'user',
  Vault = 'vault',
}

const buildKey = (...parts: string[]) => parts.join(KEY_DELIMITER);

export const formatDropKey = (id: string) =>
  buildKey(KeyPrefixes.Drop, id);

export const formatUserPrefix = (id: string) =>
  buildKey(KeyPrefixes.User, id);

/** One vault, nested under its owner so a user's subtree lists in one scan. */
export const formatVaultKey = (
  userId: string,
  vaultName: string = DEFAULT_VAULT_NAME,
) => buildKey(formatUserPrefix(userId), KeyPrefixes.Vault, vaultName);

// Turso database names carry a hash of the owner's id, not the id itself, so
// resolving a database back to its owner needs an explicit reverse entry.
export const formatVaultOwnerKey = (databaseName: string) =>
  buildKey(KeyPrefixes.Vault, databaseName);

let client: Cloudflare;

export const getCloudflare = (apiToken?: string) =>
  client ||
  (client = new Cloudflare({
    apiToken: apiToken ?? process.env.CLOUDFLARE_API_TOKEN!,
  }));

export const getKv = () => getCloudflare().kv;

const accountId = () => process.env.CLOUDFLARE_ACCOUNT_ID!;

const namespaceId = () => process.env.CLOUDFLARE_KV_NAMESPACE_ID!;

const kvConfig = () => ({
  account_id: accountId(),
  namespace_id: namespaceId(),
});

export const getKeyValue = async (
  key: string,
  schema?: ZodSchema,
) => {
  const response = await getKv().namespaces.values.get(
    key,
    kvConfig(),
  );

  const resolvedValue = schema
    ? await response.json().then(schema.parse)
    : await response.text();

  return resolvedValue;
};

export const setKeyValue = async (key: string, value: string) =>
  getKv().namespaces.values.update(key, { value, ...kvConfig() });

export const deleteKeyValue = async (key: string) =>
  getKv().namespaces.values.delete(key, kvConfig());

export const listKeys = async (prefix?: string) => {
  const names: string[] = [];

  for await (const key of getKv().namespaces.keys.list(
    namespaceId(),
    {
      account_id: accountId(),
      prefix,
    },
  ))
    names.push(key.name);

  return names;
};

// The bulk endpoint caps a request at 10k pairs; chunk rather than make
// the caller think about it.
export const setKeyValues = async (entries: KvEntry[]) => {
  const CHUNK = 10_000;

  for (let i = 0; i < entries.length; i += CHUNK)
    await getKv().namespaces.bulkUpdate(namespaceId(), {
      account_id: accountId(),
      body: entries.slice(i, i + CHUNK),
    });

  return entries.length;
};
