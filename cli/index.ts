#!/usr/bin/env node
import { drop } from 'actions/drop';
import { grab } from 'actions/grab';
import init from 'actions/init';
import { vaultCreate } from 'actions/vault/create';
import { vaultDelete } from 'actions/vault/delete';
import { vaultExport } from 'actions/vault/export';
import { vaultUse } from 'actions/vault/use';
import { Command } from 'commander';
import 'dotenv/config';
import { checkNodeVersion } from 'lib/util';
import { description, version } from './package.json';
import { secretAdd } from 'actions/secret/add';

checkNodeVersion();

const program = new Command();

program.name('deadrop').description(description).version(version);

program.command('init').action(init);

program
  .command('drop')
  .description('drop a secret from a vault or in raw format')
  .argument('[input]', 'secret to drop')
  .option('-i, --input [input]', 'secret to drop')
  .option('-f, --file', 'secret to drop is a file')
  .action(drop);

program
  .command('grab')
  .description('grab a secret with a drop ID')
  .argument('<id>', 'drop session ID')
  .action(grab);

// vault commands

const vaultRoot = program
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
  .command('export')
  .description('export all the secrets of the specified vault')
  .argument('<name>', 'name of the vault to export')
  .action(vaultExport);

vaultRoot
  .command('delete')
  .description(
    `delete the specified vault's database and remove it from config`,
  )
  .argument('<name>', 'name of the vault to delete')
  .action(vaultDelete);

// secrets commands

const secretRoot = program
  .command('secret')
  .description('manage your secrets (in current vault');

secretRoot
  .command('add')
  .argument('[name]', 'name of the secret')
  .argument('[value]', 'value of the secret')
  .action(secretAdd);

secretRoot
  .command('drop')
  .argument('[name]', 'name of the secret to drop')
  .action(vaultCreate);

secretRoot
  .command('remove')
  .argument('[name]', 'name of the secret to remove')
  .action(vaultCreate);

program.parse();

const exitSignals: NodeJS.Signals[] = [
  'SIGINT',
  'SIGTERM',
  'SIGQUIT',
];

for (const signal in exitSignals)
  process.on(signal, async (code) => {
    console.log('PROGRAM EXITING');
    process.exit(1);
  });
