import { Command } from 'commander';
import { description, version } from './package.json';
import init from 'actions/init';
import login from 'actions/login';
import { drop } from 'actions/drop';
import { grab } from 'actions/grab';
import { inject } from 'actions/inject';
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
import update from 'actions/update';
import { displayWelcomeMessage } from 'lib/log';

const deadrop = new Command();

deadrop
  .name('deadrop')
  .description(description)
  .version(version)
  .addHelpText('beforeAll', () => {
    displayWelcomeMessage();
    return '';
  });

deadrop.command('init').action(init);

deadrop.command('login').action(login);

deadrop.command('logout').action(logout);

deadrop
  .command('update')
  .description('update deadrop to the latest version')
  .action(update);

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

deadrop
  .command('inject')
  .description('run a command with vault secrets injected as env vars')
  .argument('<command...>', 'command to run (after --)')
  .option('-v, --vault <name>', 'vault to inject')
  .option('-e, --environment <env>', 'environment to inject')
  .option('-c, --config <path>', 'explicit config file (JSON or YAML)')
  .option('--no-override', 'let existing env vars win over vault values')
  .option('--verbose', 'log injected variable names (never values)')
  .action(inject);

// vault commands

const vaultRoot = deadrop
  .command('vault')
  .description('manage your vaults');

vaultRoot
  .command('create')
  .description(
    `create a new vault, optionally specify its parent folder
add cloud-based replica for ease of sharing`,
  )
  .argument('<name>', 'name of the vault')
  .argument('[location]', 'folder location of the vault')
  .option('--cloud', 'create a cloud-based replica')
  .action(vaultCreate);

vaultRoot
  .command('use')
  .description('change the current active vault deadrop is using')
  .argument('<name>', 'name of the vault to switch to as active')
  .action(vaultUse);

vaultRoot
  .command('sync')
  .description('sync the current active vault with .env file')
  .argument('<name>', 'name of the vault to sync')
  .argument('[destination]', 'path to write the .env file to')
  .action(vaultSync);

vaultRoot
  .command('export')
  .description('export all the secrets of the specified vault')
  .argument('<name>', 'name of the vault to export')
  .argument('<destination>', 'path to write the exported .env file to')
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
