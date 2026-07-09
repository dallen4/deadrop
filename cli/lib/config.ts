import { CONFIG_FILE_NAME } from '@shared/lib/constants';
import { DeadropConfig } from '@shared/types/config';
import { cosmiconfig, CosmiconfigResult } from 'cosmiconfig';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { extname } from 'path';
import { parse, stringify } from 'yaml';
import { displayWelcomeMessage, logError, logInfo } from './log';
import { initConfig as baseInitConfig } from '@shared/lib/vault';

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

export const loadConfigFromPath = async (
  path: string,
): Promise<{ config: DeadropConfig }> => {
  const raw = await readFile(path, 'utf-8');
  const config: DeadropConfig =
    extname(path) === '.json' ? JSON.parse(raw) : parse(raw);

  if (!config?.active_vault || !config?.vaults) {
    logError(`Config at '${path}' is missing 'active_vault' or 'vaults'.`);
    process.exit(1);
  }

  return { config };
};

export const initConfig = async (defaultVaultPath: string) =>
  baseInitConfig(defaultVaultPath);

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
