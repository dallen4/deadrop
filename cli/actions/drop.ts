import { input as prompt, number } from '@inquirer/prompts';
import { initDropContext } from '@shared/lib/machines/drop';
import { getSessionToken } from 'lib/auth/clerk';
import { displayWelcomeMessage, logInfo } from 'lib/log';
import { dropSecret } from 'logic/drop';

type DropOptions = {
  input?: string;
  file?: boolean;
};

// UX gate only. The worker re-verifies the token
const isExperimentalUser = (token: string | null): boolean => {
  if (!token) return false;

  try {
    const [, payload] = token.split('.');
    const claims = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    );

    return !!(claims.early_access || claims.internal);
  } catch {
    return false;
  }
};

const promptMaxGrabbers = async (): Promise<number | null> => {
  const cap = await number({
    message: 'Max grabbers (leave blank for unbounded, default 1):',
    required: false,
    min: 1,
  });

  return cap ?? null;
};

export const drop = async (
  input: string | undefined,
  options: DropOptions,
) => {
  displayWelcomeMessage();

  const ctx = initDropContext();

  ctx.message = input || options.input || null;
  ctx.mode = options.file ? 'file' : 'raw';

  if (!ctx.message) {
    logInfo('No input provided...');

    ctx.message = await prompt({ message: 'Input here: ' });
  }

  const token = await getSessionToken();

  if (isExperimentalUser(token))
    ctx.maxGrabbers = await promptMaxGrabbers();

  await dropSecret(ctx, token);
};
