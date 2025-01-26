import { CONFIG_FILE_NAME } from '@shared/lib/constants';
import { DeadropConfig } from '@shared/types/config';
import { cosmiconfig, CosmiconfigResult } from 'cosmiconfig';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { stringify } from 'yaml';
import { displayWelcomeMessage, logError, logInfo } from './log';
import { initConfig as baseInitConfig } from '@shared/lib/vault';
import { randomBytes } from 'crypto';

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

export const initConfig = async (defaultVaultPath: string) =>
  baseInitConfig(
    defaultVaultPath,
    randomBytes(32).toString('base64'),
  );

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
