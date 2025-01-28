import { confirm } from '@inquirer/prompts';
import { initDBClient } from 'db/init';
import { existsSync } from 'fs';
import { appendFile, mkdir } from 'fs/promises';
import { initConfig, loadConfig, saveConfig } from 'lib/config';
import { CONFIG_FILE_NAME } from '@shared/lib/constants';
import { logInfo } from 'lib/log';
import { resolve } from 'path';
import { cwd } from 'process';
import {
  DEFAULT_VAULT_NAME,
  STORAGE_DIR_NAME,
} from '@shared/lib/constants';

export default async function () {
  const defaultConfigPath = resolve(cwd(), CONFIG_FILE_NAME);
  const defaultVaultPath = resolve(
    STORAGE_DIR_NAME,
    DEFAULT_VAULT_NAME,
  );

  const defaultConfig = await initConfig(defaultVaultPath);

  await saveConfig(cwd(), defaultConfig);

  // validate it can be loaded
  const { config } = await loadConfig();

  if (!existsSync(STORAGE_DIR_NAME))
    await mkdir(STORAGE_DIR_NAME, { recursive: true });

  const { location, key } = config.vaults.default;

  // TODO consider writing NODE_ENV to vault
  const db = await initDBClient(location, key);

  logInfo(`Default vault initalized & config created at '${defaultConfigPath}'!
We recommend adding the following to your .gitignore:
${CONFIG_FILE_NAME}
${STORAGE_DIR_NAME}/`);

  const updateGitignore = await confirm({
    message: 'Would you like to add these?',
  });

  if (updateGitignore) {
    await appendFile(
      './.gitignore',
      `\n# deadrop config & vaults
${CONFIG_FILE_NAME}
${STORAGE_DIR_NAME}/\n`,
    );

    logInfo('.gitignore updated!');
  }

  logInfo('Deadrop setup complete!');

  process.exit(0);
}
