import { createTursoClient } from './client';
import { createLifecycleHandlers } from './lifecycle';
import { createProvisionHandlers } from './provision';

export { createTursoClient, TursoApiError } from './client';
export type { TursoClient } from './client';
export { createProvisionHandlers } from './provision';
export { createLifecycleHandlers } from './lifecycle';
export {
  fileUrl,
  syncUrl,
  vaultSyncUrl,
  syncUrlToHttps,
  tursoUploadUrl,
  vaultNameFromUserId,
  userOwnsVault,
} from './utils';

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
