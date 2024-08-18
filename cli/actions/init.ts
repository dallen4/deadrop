import { confirm } from '@inquirer/prompts';
import { initDB } from 'db/init';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { existsSync } from 'fs';
import { appendFile, mkdir } from 'fs/promises';
import { initConfig, loadConfig, saveConfig } from 'lib/config';
import { CONFIG_FILE_NAME, VAULT_DIR_NAME } from 'lib/constants';
import { logInfo } from 'lib/log';
import { resolve } from 'path';
import { cwd } from 'process';

export default async function () {
  const defaultConfigPath = resolve(cwd(), CONFIG_FILE_NAME);
  const defaultVaultPath = resolve(VAULT_DIR_NAME, 'default.db');

  const defaultConfig = initConfig(defaultVaultPath);

  await saveConfig(cwd(), defaultConfig);

  // validate it can be loaded
  const { config } = await loadConfig();

  if (!existsSync(VAULT_DIR_NAME)) await mkdir(VAULT_DIR_NAME);

  const { location, key } = config.vaults.default;

  const db = initDB(location, key);

  await migrate(db, { migrationsFolder: './db/migrations' });

  logInfo(`Default vault initalized & config created at '${defaultConfigPath}'!
We recommend adding the following to your .gitignore:
${CONFIG_FILE_NAME}
${VAULT_DIR_NAME}/`);

  const updateGitignore = await confirm({
    message: 'Would you like to add these?',
  });

  if (updateGitignore) {
    await appendFile(
      './.gitignore',
      `\n# deadrop config & vaults
${CONFIG_FILE_NAME}
${VAULT_DIR_NAME}/\n`,
    );

    logInfo('.gitignore updated!');
  }

  logInfo('Deadrop setup complete!');

  process.exit(0);
}
