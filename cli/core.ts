import { Command } from 'commander';
import { description, version } from '../package.json';
import init from 'actions/init';
import login from 'actions/login';
import { drop } from 'actions/drop';
import { grab } from 'actions/grab';
import { secretAdd } from 'actions/secret/add';
import { secretRemove } from 'actions/secret/remove';
import {
  vaultCreate,
  vaultDelete,
  vaultExport,
  vaultImport,
  vaultSync,
  vaultUse,
} from 'actions/vault';
import logout from 'actions/logout';

const deadrop = new Command();

deadrop.name('deadrop').description(description).version(version);

deadrop.command('init').action(init);

deadrop.command('login').action(login);

deadrop.command('logout').action(logout);

deadrop
  .command('drop')
  .description('drop a secret from a vault or in raw format')
  .argument('[input]', 'secret to drop')
  .option('-i, --input [input]', 'secret to drop')
  .option('-f, --file', 'secret to drop is a file')
  .action(drop);

deadrop
  .command('grab')
  .description('grab a secret with a drop ID')
  .argument('<id>', 'drop session ID')
  .action(grab);

// vault commands

const vaultRoot = deadrop
  .command('vault')
  .description('manage your vaults');

vaultRoot
  .command('create')
  .description(
    'create a new vault, optionally specify its parent folder',
  )
  .argument('<name>', 'name of the vault')
  .argument('[location]', 'folder location of the vault')
  .action(vaultCreate);

vaultRoot
  .command('use')
  .description('change the current active vault deadrop is using')
  .argument('<name>', 'name of the vault to switch to as active')
  .action(vaultUse);

vaultRoot
  .command('sync')
  .description('sync the current active vault with .env file')
  .action(vaultSync);

vaultRoot
  .command('export')
  .description('export all the secrets of the specified vault')
  .argument('<name>', 'name of the vault to export')
  .action(vaultExport);

vaultRoot
  .command('import')
  .description(
    'import all the secrets of a given .env file to active vault',
  )
  .argument('<path>', 'path to the .env file')
  .action(vaultImport);

vaultRoot
  .command('delete')
  .description(
    `delete the specified vault's database and remove it from config`,
  )
  .argument('<name>', 'name of the vault to delete')
  .action(vaultDelete);

// secrets commands

const secretRoot = deadrop
  .command('secret')
  .description('manage your secrets in active vault');

secretRoot
  .command('add')
  .argument('[name]', 'name of the secret')
  .argument('[value]', 'value of the secret')
  .action(secretAdd);

secretRoot
  .command('remove')
  .argument('[name]', 'name of the secret to remove')
  .action(secretRemove);

export { deadrop };
