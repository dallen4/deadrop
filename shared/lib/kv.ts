import Cloudflare from 'cloudflare';

let client: Cloudflare;

export const getCloudflare = (apiToken?: string) =>
  client ||
  (client = new Cloudflare({
    apiToken: apiToken ?? process.env.CLOUDFLARE_API_TOKEN!,
  }));

export const getKv = () => getCloudflare().kv;

export const getKeyValue = async (key: string) => {
  const response = await getKv().namespaces.values.get(key, {
    account_id: process.env.CLOUDFLARE_ACCOUNT_ID!,
    namespace_id: process.env.CLOUDFLARE_KV_NAMESPACE_ID!,
  });

  return response.text();
};

export const setKeyValue = async (key: string, value: string) =>
  getKv().namespaces.values.update(key, {
    value,
    account_id: process.env.CLOUDFLARE_ACCOUNT_ID!,
    namespace_id: process.env.CLOUDFLARE_KV_NAMESPACE_ID!,
  });

export const deleteKeyValue = async (key: string) =>
  getKv().namespaces.values.delete(key, {
    account_id: process.env.CLOUDFLARE_ACCOUNT_ID!,
    namespace_id: process.env.CLOUDFLARE_KV_NAMESPACE_ID!,
  });
