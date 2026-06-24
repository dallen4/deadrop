import { input as prompt, number } from '@inquirer/prompts';
import { initDropContext } from '@shared/lib/machines/drop';
import { createClerkClient } from 'lib/auth/clerk';
import { displayWelcomeMessage, logInfo } from 'lib/log';
import { dropSecret } from 'logic/drop';

type DropOptions = {
  input?: string;
  file?: boolean;
};

// the worker enforces this same flag server-side (early_access/internal
// session claims) when a cap above the user's plan is requested
const isExperimentalUser = async (): Promise<boolean> => {
  const clerkClient = await createClerkClient();
  const token = await clerkClient.session?.getToken();

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
    message:
      'Max grabbers (leave blank for unbounded, default 1):',
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

  if (await isExperimentalUser())
    ctx.maxGrabbers = await promptMaxGrabbers();

  await dropSecret(ctx);
};
