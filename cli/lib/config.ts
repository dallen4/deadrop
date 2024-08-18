import { cosmiconfig, CosmiconfigResult } from 'cosmiconfig';
import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';
import { DeadropConfig, VaultDBConfig } from 'types/config';
import { stringify } from 'yaml';
import { CONFIG_FILE_NAME } from './constants';
import { displayWelcomeMessage, logError, logInfo } from './log';

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

export const vault = (path: string): VaultDBConfig => ({
  location: path,
  key: randomBytes(32).toString('base64'),
});

export const initConfig = (
  defaultVaultPath: string,
): DeadropConfig => ({
  active_vault: 'default',
  vaults: {
    default: vault(defaultVaultPath),
  },
});

export const saveConfig = async (
  path: string,
  config: DeadropConfig,
  overwrite: boolean = false,
) => {
  const configPath = resolve(path, CONFIG_FILE_NAME);
  const configExists = existsSync(configPath);

  if (configExists && !overwrite)
    logInfo(`deadrop is already configured, using config at ${path}`);
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
