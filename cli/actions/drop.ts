import { input as prompt } from '@inquirer/prompts';
import { initDropContext } from '@shared/lib/machines/drop';
import { displayWelcomeMessage, logInfo } from 'lib/log';
import { dropSecret } from 'logic/drop';

type DropOptions = {
  input?: string;
  file?: boolean;
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

  await dropSecret(ctx);
};
