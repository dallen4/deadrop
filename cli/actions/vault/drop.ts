import { createClient } from '@shared/client';
import { initDropContext } from '@shared/lib/machines/drop';
import { VaultTokenAccess } from '@shared/lib/constants';
import { userOwnsVault } from '@shared/lib/turso/utils';
import {
  composeVaultShare,
  pickEnvironments,
} from '@shared/lib/vault-share';
import { createClerkClient } from 'lib/auth/clerk';
import { loadConfig } from 'lib/config';
import { logError, logInfo } from 'lib/log';
import { dropSecret } from 'logic/drop';

type VaultDropOptions = {
  env?: string[];
  expires?: string;
  grabbers?: string;
};

export async function vaultDrop(
  nameInput: string | undefined,
  options: VaultDropOptions = {},
) {
  const { config } = await loadConfig();

  const vaultName = nameInput ?? config.active_vault.name;
  const vault = config.vaults[vaultName];

  if (!vault) {
    logError(`Vault '${vaultName}' not found in config.`);
    return process.exit(1);
  }

  if (!vault.cloud) {
    logError(
      `Vault '${vaultName}' is local only — only cloud vaults can be shared.`,
    );
    return process.exit(1);
  }

  const clerkClient = await createClerkClient();

  if (!clerkClient.session) {
    logError('You must be signed in to share a vault!');
    return process.exit(1);
  }

  // Minting is owner-only: /vault/tokens derives the vault name from the
  // caller's own userId, so a token for someone else's vault is unreachable.
  const owned = await userOwnsVault(
    clerkClient.session.user.id,
    vault.cloud.name,
  );

  if (!owned) {
    logError(
      `You don't own '${vaultName}', so you can't issue tokens for it.`,
    );
    return process.exit(1);
  }

  const envNames = options.env?.length
    ? options.env
    : [config.active_vault.environment];

  const environments = pickEnvironments(vault, envNames);

  if (!Object.keys(environments).length) {
    logError(
      `None of those environments exist in '${vaultName}': ${envNames.join(', ')}`,
    );
    return process.exit(1);
  }

  const sessionToken = await clerkClient.session.getToken();
  const deadropClient = createClient(process.env.DEADROP_API_URL!, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });

  const response = await deadropClient.vault.tokens.$post({
    json: {
      name: vaultName,
      access: VaultTokenAccess.ReadOnly,
      expiration: options.expires ?? '30d',
    },
  });

  if (response.status !== 201) {
    logError(`Could not mint a read-only token: ${await response.text()}`);
    return process.exit(1);
  }

  const { token, name: remoteName } = (await response.json()) as {
    token: string;
    name: string;
  };

  const shared = Object.keys(environments).join(', ');

  logInfo(
    `Sharing '${vaultName}' (${shared}) with a read-only token ` +
      `expiring in ${options.expires ?? '30d'}.`,
  );

  const ctx = initDropContext();

  ctx.mode = 'raw';
  ctx.message = composeVaultShare(vaultName, {
    environments,
    cloud: { name: remoteName, authToken: token },
  });
  ctx.maxGrabbers = options.grabbers ? Number(options.grabbers) : null;

  await dropSecret(ctx, sessionToken);
}
