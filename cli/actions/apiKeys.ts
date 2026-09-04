import { confirm, select } from '@inquirer/prompts';
import { VaultStore } from '@shared/types/config';
import chalk from 'chalk';
import { copyToClipboard } from 'lib/clipboard';
import { createDeadropClient } from 'lib/api';
import { loadConfig } from 'lib/config';
import {
  canReveal,
  logDebug,
  logError,
  logInfo,
  logWarning,
  revealSecret,
} from 'lib/log';
import { exit } from 'process';

type CreateApiKeyOptions = {
  vault?: string;
  environment?: string;
  yes?: boolean;
  print?: boolean;
  copy?: boolean;
};

// A key mints Turso tokens for a remote database, so a local-only vault
// has nothing for it to authorize.
const cloudVaultNames = (vaults: VaultStore) =>
  Object.keys(vaults).filter((name) => vaults[name].cloud);

async function pickVault(
  vaults: VaultStore,
  requested?: string,
): Promise<string> {
  const names = cloudVaultNames(vaults);

  if (!names.length) {
    logError(
      'No cloud vaults in this config. Run `deadrop vault create ' +
        '<name> --cloud` first.',
    );
    return exit(1);
  }

  if (requested) {
    if (!names.includes(requested)) {
      logError(
        `Vault '${requested}' is not a cloud vault in this config.`,
      );
      return exit(1);
    }

    return requested;
  }

  if (names.length === 1) return names[0];

  return select({
    message: 'Select a vault for this key',
    choices: names.map((name) => ({ name, value: name })),
  });
}

async function pickEnvironment(
  vaults: VaultStore,
  vaultName: string,
  requested?: string,
): Promise<string> {
  const names = Object.keys(vaults[vaultName].environments);

  if (!names.length) {
    logError(
      `Vault '${vaultName}' has no environments. Run ` +
        '`deadrop vault env add <name>` first.',
    );
    return exit(1);
  }

  if (requested) {
    if (!names.includes(requested)) {
      logError(
        `Environment '${requested}' not found in '${vaultName}'.`,
      );
      return exit(1);
    }

    return requested;
  }

  return select({
    message: `Select an environment in '${vaultName}'`,
    choices: names.map((name) => ({ name, value: name })),
  });
}

// The key is shown once and is never retrievable again, so the default is
// the alternate screen — it leaves nothing behind in scrollback. Raw stdout
// is opt-in, since that is the path a pipe or a capturing agent reads.
async function handOffKey(
  name: string,
  key: string,
  vaultKey: string,
  options: CreateApiKeyOptions,
) {
  // Both are needed together and neither is useful alone, so hand over the
  // pair rather than making the caller dig the vault key out of .deadroprc.
  const pair = `DEADROP_API_KEY=${key}\nDEADROP_VAULT_KEY=${vaultKey}`;

  if (options.copy) {
    if (await copyToClipboard(pair)) {
      logInfo(
        `Created '${chalk.bold(name)}', copied both values to your ` +
          'clipboard.',
      );
      return;
    }

    logWarning(
      'Could not reach a clipboard, showing the values instead.',
    );
  }

  if (options.print) {
    process.stdout.write(`${pair}\n`);
    return;
  }

  if (!canReveal()) {
    logError(
      'Refusing to print an API key to a non-interactive stream. Run ' +
        'this in a terminal, or pass --print to pipe it deliberately.',
    );
    return exit(1);
  }

  await revealSecret({
    title: `Created '${name}' — this is the only time the API key is shown.`,
    value: pair,
    hint: 'Add both to your CI secrets.',
  });

  logInfo(`Created '${chalk.bold(name)}'`);
}

export async function createApiKey(
  options: CreateApiKeyOptions = {},
) {
  const deadropClient = await createDeadropClient(true);

  const { config } = await loadConfig();

  const vaultName = await pickVault(config.vaults, options.vault);
  const environment = await pickEnvironment(
    config.vaults,
    vaultName,
    options.environment,
  );

  // Same guard init uses: no TTY means Inquirer has nothing to read from.
  const canPrompt =
    !options.yes && Boolean(process.stdout.isTTY) && !process.env.CI;

  if (canPrompt) {
    const proceed = await confirm({
      message:
        `You're about to create an API key for vault ` +
        `'${chalk.bold(vaultName)}' and environment ` +
        `'${chalk.bold(environment)}'. Continue?`,
    });

    if (!proceed) {
      logInfo('No key created.');
      return exit(0);
    }
  }

  try {
    const response = await deadropClient.auth.key.$post({
      json: { vaultName, environment },
    });

    const data = await response.json();

    if (response.status !== 201) {
      logDebug(data);
      logError(
        `Could not create an API key for '${vaultName}' (${environment}).`,
      );
      return exit(1);
    }

    const { name, key } = data as {
      id: string;
      name: string;
      key: string;
    };

    await handOffKey(
      name,
      key,
      config.vaults[vaultName].environments[environment],
      options,
    );

    return exit(0);
  } catch (err) {
    logDebug(err);
    logError('Could not reach the deadrop API to create a key.');
    return exit(1);
  }
}
