import chalk from 'chalk';
import { loadConfig } from 'lib/config';
import { logInfo } from 'lib/log';
import { exit } from 'process';

export async function vaultList() {
  const { config } = await loadConfig();

  const { vaults, active_vault } = config;

  const vaultNames = Object.keys(vaults);

  if (!vaultNames.length) {
    logInfo('No vaults configured yet, run `deadrop vault create` to get started.');
    return exit(0);
  }

  vaultNames.forEach((name) => {
    const { location, cloud } = vaults[name];
    const isActive = name === active_vault.name;
    const marker = isActive ? chalk.green('*') : ' ';
    const label = isActive ? chalk.bold(name) : name;
    const cloudTag = cloud ? chalk.cyan(' [cloud]') : '';

    logInfo(`${marker} ${label}${cloudTag} — ${location}`);
  });

  return exit(0);
}
