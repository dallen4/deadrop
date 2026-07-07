import { getSubtle } from '../crypto';
import { createTursoClient } from './client';
import { createLifecycleHandlers } from './lifecycle';
import { createProvisionHandlers } from './provision';

export { createTursoClient } from './client';
export type { TursoClient } from './client';
export { createProvisionHandlers } from './provision';
export { createLifecycleHandlers } from './lifecycle';
export {
  fileUrl,
  syncUrl,
  syncUrlToHttps,
  tursoUploadUrl,
} from './utils';

const sha256hex = async (input: string) => {
  const data = new TextEncoder().encode(input);
  const digest = await getSubtle().digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const vaultNameFromUserId = async (
  userId: string,
  vaultName?: string,
) => {
  const userIdHash = await sha256hex(userId);
  const nameParts = [userIdHash.substring(0, 13)];

  if (vaultName) nameParts.push(vaultName);

  return nameParts.join('-').substring(0, 63);
};

export const createVaultUtils = (
  organization: string,
  apiToken: string,
) => {
  const client = createTursoClient(organization, apiToken);

  return {
    ...createProvisionHandlers(client),
    ...createLifecycleHandlers(client),
  };
};
