import { cosmiconfig, CosmiconfigResult } from 'cosmiconfig';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { DeadropConfig, VaultDBConfig } from 'types/config';
import { stringify } from 'yaml';
import { initEnvKey } from './env';
import { displayWelcomeMessage, logError, logInfo } from './log';
import { CONFIG_FILE_NAME } from './constants';

type CustomConfigResult = Omit<
  NonNullable<CosmiconfigResult>,
  'config'
> & {
  config: DeadropConfig;
};

export const loadConfig = async (): Promise<CustomConfigResult> => {
  const { search } = cosmiconfig('deadrop');

  const configFile = await search();

  if (!configFile) {
    logError(
      'No config found, please run `deadrop init` to get started.',
    );
    process.exit(1);
  }

  return configFile;
};

export const vault = async (
  path: string,
): Promise<VaultDBConfig> => ({
  location: path,
  key: randomBytes(32).toString('base64'),
  environments: {
    development: await initEnvKey(),
  },
});

export const initConfig = async (
  defaultVaultPath: string,
): Promise<DeadropConfig> => ({
  active_vault: {
    name: 'default',
    environment: 'development',
  },
  vaults: {
    default: await vault(defaultVaultPath),
  },
});

export const saveConfig = async (
  path: string,
  config: DeadropConfig,
  overwrite: boolean = false,
) => {
  const configPath = `${path}/${CONFIG_FILE_NAME}`;
  const configExists = existsSync(configPath);

  if (configExists && !overwrite)
    logInfo(
      `deadrop is already configured, using config at '${configPath}'`,
    );
  else {
    if (configExists) logInfo('Updating deadrop config...');
    else {
      displayWelcomeMessage();
      logInfo('Initializing deadrop config...');
    }

    const configString = stringify(config);

    await writeFile(configPath, configString);

    logInfo('deadrop config updated!');
  }
};
