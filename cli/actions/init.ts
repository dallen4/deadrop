import { confirm } from '@inquirer/prompts';
import { initDBClient } from 'db/init';
import { existsSync } from 'fs';
import { appendFile, mkdir } from 'fs/promises';
import {
  initConfig,
  loadConfigFromPath,
  saveConfig,
} from 'lib/config';
import { CONFIG_FILE_NAME } from '@shared/lib/constants';
import { globalConfigDir } from 'lib/global-config';
import { logInfo } from 'lib/log';
import { resolve } from 'path';
import { cwd } from 'process';
import {
  DEFAULT_VAULT_NAME,
  STORAGE_DIR_NAME,
} from '@shared/lib/constants';

export default async function (
  options: { yes?: boolean; global?: boolean } = {},
) {
  // The global dir is what loadConfig falls back to, and the same one the
  // desktop app writes — an init there is shared between both.
  const targetDir = options.global ? globalConfigDir() : cwd();

  const defaultConfigPath = resolve(targetDir, CONFIG_FILE_NAME);
  const storageDir = resolve(targetDir, STORAGE_DIR_NAME);
  const defaultVaultPath = resolve(storageDir, DEFAULT_VAULT_NAME);

  if (!existsSync(targetDir))
    await mkdir(targetDir, { recursive: true });

  const defaultConfig = await initConfig(defaultVaultPath);

  await saveConfig(targetDir, defaultConfig);

  // Validate the file just written, not whatever loadConfig would discover
  // — a project-scoped .deadroprc in cwd would shadow a global init.
  const { config } = await loadConfigFromPath(defaultConfigPath);

  if (!existsSync(storageDir))
    await mkdir(storageDir, { recursive: true });

  const { location } = config.vaults.default;

  // TODO consider writing NODE_ENV to vault
  const db = await initDBClient(location);

  logInfo(
    `Default vault initalized & config created at '${defaultConfigPath}'!`,
  );

  // Nothing to ignore outside a project directory.
  if (options.global) {
    logInfo('Deadrop setup complete!');
    process.exit(0);
  }

  logInfo(`We recommend adding the following to your .gitignore:
${CONFIG_FILE_NAME}
${STORAGE_DIR_NAME}/`);

  // `init` has to complete unattended — Dockerfiles, CI, provisioning
  // scripts and devcontainers all run it with no TTY, where Inquirer has
  // nothing to read from and the prompt would hang or throw. Same guard
  // install.sh:74 already applies to its own prompt.
  const canPrompt =
    !options.yes && Boolean(process.stdout.isTTY) && !process.env.CI;

  const updateGitignore = canPrompt
    ? await confirm({ message: 'Would you like to add these?' })
    : Boolean(options.yes);

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
