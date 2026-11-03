import { config } from 'dotenv';

// A cwd .env can come from a cloned repo or a grabbed file. It may supply
// DEADROP_API_KEY, but the variables that switch inject off the user's
// config onto another vault are held back until `inject --ci` asks for them.
const CONTROL_VARS = new Set([
  'DEADROP_VAULT_KEY',
  'DEADROP_VAULT',
  'DEADROP_ENVIRONMENT',
]);

const withheld: Record<string, string> = {};

export const loadDotenv = (path?: string) => {
  const parsed: Record<string, string> = {};

  config({ path, processEnv: parsed, quiet: true });

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] !== undefined) continue;

    if (CONTROL_VARS.has(key)) withheld[key] = value;
    else process.env[key] = value;
  }
};

// Exported values still win over the file, same as the rest of dotenv.
export const applyWithheldDotenv = () => {
  for (const [key, value] of Object.entries(withheld))
    if (process.env[key] === undefined) process.env[key] = value;
};
