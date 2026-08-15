import { input, select } from '@inquirer/prompts';
import { dirname, join } from 'path';
import type { DeadropConfig, SharedVault } from '@shared/types/config';
import { findConfig, saveConfig } from 'lib/config';
import { globalConfigDir, globalConfigPath } from 'lib/global-config';
import { logInfo } from 'lib/log';

type Scope = 'local' | 'global';

type Target = { dir: string; config: DeadropConfig | null };

// Mirrors desktop's vaultPathForName so both surfaces resolve the same
// replica file for a globally-scoped vault.
const replicaPath = (dir: string, name: string) =>
  join(dir, 'vaults', `${name}.db`);

const resolveTarget = async (): Promise<Target> => {
  const found = await findConfig();

  if (found)
    return { dir: dirname(found.filepath), config: found.config };

  const chosen = await select<Scope>({
    message: 'No deadrop config found. Where should this vault go?',
    choices: [
      { name: `this directory (./.deadroprc)`, value: 'local' },
      { name: `global (${globalConfigPath()})`, value: 'global' },
    ],
  });

  return {
    dir: chosen === 'global' ? globalConfigDir() : process.cwd(),
    config: null,
  };
};

// The local config key is just a label — cloud.name identifies the remote
// database — so renaming on import costs nothing and never clobbers an
// existing vault's environment keys.
const resolveName = async (
  name: string,
  vault: SharedVault,
  existing: DeadropConfig | null,
): Promise<string> => {
  if (!existing?.vaults?.[name]) return name;

  const answer = await input({
    message:
      `A vault named '${name}' already exists. ` +
      `New name (blank uses '${vault.cloud.name}'):`,
  });

  return answer.trim() || vault.cloud.name;
};

export async function saveGrabbedVault(
  name: string,
  vault: SharedVault,
): Promise<void> {
  const { dir, config } = await resolveTarget();

  const finalName = await resolveName(name, vault, config);
  const [firstEnv] = Object.keys(vault.environments);

  const next: DeadropConfig = {
    // Someone who just grabbed a vault almost certainly wants to use it,
    // and on a fresh config an unresolvable active_vault breaks everything.
    active_vault: {
      name: finalName,
      environment: firstEnv ?? 'development',
    },
    vaults: {
      ...config?.vaults,
      [finalName]: {
        ...vault,
        location: replicaPath(dir, finalName),
      },
    },
  };

  await saveConfig(dir, next, true);

  logInfo(
    `Vault '${finalName}' added to ${join(dir, '.deadroprc')} ` +
      `and set as active.`,
  );
}
