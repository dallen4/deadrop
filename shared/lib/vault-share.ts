import { parse, stringify } from 'yaml';
import { z } from 'zod';
import type {
  SharedVault,
  VaultDBConfig,
  VaultEnvironments,
} from '../types/config';

// The payload arrives from an untrusted peer, so it is validated rather
// than cast — YAML alone says nothing about shape.
const SharedVaultSchema = z.object({
  environments: z.record(z.string(), z.string()).default({}),
  cloud: z.object({
    name: z.string().min(1),
    authToken: z.string().optional(),
  }),
}) satisfies z.ZodType<SharedVault, z.ZodTypeDef, unknown>;

const VaultSharePayloadSchema = z.object({
  vaults: z.record(z.string(), SharedVaultSchema),
});

export const composeVaultShare = (
  name: string,
  vault: SharedVault,
): string => stringify({ vaults: { [name]: vault } });

export const pickEnvironments = (
  vault: VaultDBConfig,
  names: string[],
): VaultEnvironments =>
  Object.fromEntries(
    names
      .filter((env) => vault.environments[env])
      .map((env) => [env, vault.environments[env]]),
  );

// A vault share identifies itself: the schema rejects anything else, so
// grabbers detect one by parsing rather than by a wire discriminator.
export const tryParseVaultShare = (
  payload: string,
): { name: string; vault: SharedVault } | null => {
  try {
    return parseVaultShare(payload);
  } catch {
    return null;
  }
};

export const parseVaultShare = (
  payload: string,
): { name: string; vault: SharedVault } => {
  let raw: unknown;
  try {
    raw = parse(payload);
  } catch {
    throw new Error('Vault share is not valid YAML.');
  }

  const result = VaultSharePayloadSchema.safeParse(raw);

  if (!result.success)
    throw new Error('Not a vault share payload.');

  const entries = Object.entries(result.data.vaults);

  if (entries.length !== 1)
    throw new Error('A vault share must carry exactly one vault.');

  const [name, vault] = entries[0];

  return { name, vault };
};
