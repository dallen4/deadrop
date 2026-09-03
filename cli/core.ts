import { Command } from 'commander';
import { description, version } from './package.json';
import { createApiKey } from 'actions/apiKeys';
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
  vaultDrop,
  vaultEnvAdd,
  vaultEnvList,
  vaultExport,
  vaultImport,
  vaultList,
  vaultSync,
  vaultUse,
} from 'actions/vault';
import logout from 'actions/logout';
import whoami from 'actions/whoami';
import update from 'actions/update';
import { desktopInstall } from 'actions/desktop/install';
import { desktopUninstall } from 'actions/desktop/uninstall';
import { displayWelcomeMessage } from 'lib/log';

const deadrop = new Command();

deadrop
  .name('deadrop')
  .description(description)
  .version(version)
  .option('--debug', 'log verbose diagnostic output')
  // logDebug reads the env var, so set it before any action runs
  .hook('preAction', (thisCommand) => {
    if (thisCommand.opts().debug) process.env.DEBUG_MODE = '1';
  })
  .addHelpText('beforeAll', () => {
    displayWelcomeMessage();
    return '';
  });

deadrop
  .command('init')
  .description(
    'set up a default vault and config in the current directory',
  )
  .option(
    '-y, --yes',
    'skip prompts and accept defaults (also implied by a non-TTY shell or CI)',
  )
  .option(
    '--global',
    'initialize globally instead of in the current directory',
  )
  .action(init);

deadrop.command('login').action(login);

deadrop.command('logout').action(logout);

deadrop
  .command('whoami')
  .description('check whether you are signed in')
  .action(whoami);

deadrop
  .command('update')
  .description('update deadrop to the latest version')
  .option(
    '--skip-desktop',
    "don't check for/offer a desktop app update",
  )
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
  .description(
    'run a command with vault secrets injected as env vars',
  )
  .argument('<command...>', 'command to run (after --)')
  .option(
    '-v, --vault <name>',
    'vault to inject (optional: defaults to your active vault)',
  )
  .option('-e, --environment <env>', 'environment to inject')
  .option(
    '-c, --config <path>',
    'explicit config file (JSON or YAML)',
  )
  .option(
    '--no-override',
    'let existing env vars win over vault values',
  )
  .option(
    '--refresh-token',
    'mint a fresh read-only Turso token via /vault/tokens',
  )
  .option(
    '--ci',
    'mint a fresh read-only Turso token for CI/CD via /vault/tokens/ci',
  )
  .option(
    '--only <names>',
    'inject only these secrets, comma-separated',
  )
  .option(
    '--prefix <prefix>',
    'prepend this to every injected variable name',
  )
  .option('--verbose', 'log injected variable names (never values)')
  .action(inject);

// desktop commands

const desktopRoot = deadrop
  .command('desktop')
  .description('manage the deadrop desktop app');

desktopRoot
  .command('install')
  .description(
    'install (or update, if already installed) the deadrop desktop app',
  )
  .option(
    '--force',
    'reinstall even if already on the latest version',
  )
  .action(desktopInstall);

desktopRoot
  .command('uninstall')
  .description(
    'remove the deadrop desktop app and its desktop-environment entry',
  )
  .action(desktopUninstall);

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
  .command('list')
  .description('list all vaults available in the config')
  .action(vaultList);

vaultRoot
  .command('use')
  .description('change the current active vault deadrop is using')
  .argument(
    '[name]',
    'name of the vault to switch to as active (prompts to select when omitted)',
  )
  .option('-e, --environment <env>', 'environment to switch to')
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
  .argument(
    '<destination>',
    'path to write the exported .env file to',
  )
  .action(vaultExport);

vaultRoot
  .command('import')
  .description(
    'import all the secrets of a given .env file to active vault',
  )
  .argument('<path>', 'path to the .env file')
  .action(vaultImport);

vaultRoot
  .command('drop')
  .description(
    'share a cloud vault with someone via a drop (they run `deadrop grab`)',
  )
  .argument('[name]', 'vault to share (defaults to the active vault)')
  .option(
    '-e, --env <env...>',
    'environments to include (defaults to the active environment)',
  )
  .option('--expires <duration>', 'token lifetime', '30d')
  .option('-g, --grabbers <n>', 'number of recipients')
  .action(vaultDrop);

vaultRoot
  .command('delete')
  .description(
    `delete the specified vault's database and remove it from config`,
  )
  .argument('<name>', 'name of the vault to delete')
  .action(vaultDelete);

const vaultEnvRoot = vaultRoot
  .command('env')
  .description('manage environments in the active vault');

vaultEnvRoot
  .command('list')
  .description('list environments in the active vault')
  .action(vaultEnvList);

vaultEnvRoot
  .command('add')
  .description('add a new environment to the active vault')
  .argument('<name>', 'name of the environment to add')
  .action(vaultEnvAdd);

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

// api key commands

const apiKeysRoot = deadrop
  .command('apiKeys')
  .description('manage API keys for CI/CD secret injection');

apiKeysRoot
  .command('create')
  .description(
    `issue an API key scoped to one cloud vault and environment
use it as DEADROP_API_KEY with 'deadrop inject --ci'`,
  )
  .option(
    '-v, --vault <name>',
    'cloud vault to scope the key to (prompts to select when omitted)',
  )
  .option(
    '-e, --environment <env>',
    'environment to scope the key to (prompts to select when omitted)',
  )
  .option(
    '-y, --yes',
    'skip the confirmation prompt (also implied by a non-TTY shell or CI)',
  )
  .option(
    '--print',
    'write the key to stdout instead of showing it on a scrollback-free screen',
  )
  .option(
    '--copy',
    'copy the key to your clipboard without showing it',
  )
  .action(createApiKey);

export { deadrop };
