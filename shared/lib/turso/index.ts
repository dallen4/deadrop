import { TURSO_ORGANIZATION } from '../constants';
import { createTursoClient } from './client';
import { createLifecycleHandlers } from './lifecycle';
import { createProvisionHandlers } from './provision';

export { createTursoClient, TursoApiError } from './client';
export type { TursoClient } from './client';
export { createLifecycleHandlers } from './lifecycle';
export { createProvisionHandlers } from './provision';
export {
  fileUrl,
  syncUrl,
  syncUrlToHttps,
  tursoUploadUrl,
  userOwnsVault,
  vaultNameFromUserId,
  vaultSyncUrl,
} from './utils';

export const createVaultUtils = (
  apiToken: string,
  organization: string = TURSO_ORGANIZATION,
) => {
  const client = createTursoClient(organization, apiToken);

  return {
    ...createProvisionHandlers(client),
    ...createLifecycleHandlers(client),
  };
};
