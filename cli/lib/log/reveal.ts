import { input } from '@inquirer/prompts';
import chalk from 'chalk';

// Alternate screen buffer, the same one less/vim use. Anything drawn here
// is discarded on exit rather than joining scrollback — clearing lines
// after the fact would not, since scrolled output is already committed.
const ALT_SCREEN_ON = '\x1b[?1049h';
const ALT_SCREEN_OFF = '\x1b[?1049l';

type RevealOptions = {
  title: string;
  value: string;
  hint?: string;
};

export const canReveal = () => Boolean(process.stdout.isTTY);

export async function revealSecret({
  title,
  value,
  hint,
}: RevealOptions) {
  process.stdout.write(ALT_SCREEN_ON);

  try {
    console.log(chalk.cyan(title) + '\n');
    console.log(value + '\n');

    if (hint) console.log(chalk.yellow(hint) + '\n');

    await input({
      message: 'Press Enter once you have copied it',
    });
  } finally {
    // Restore even on Ctrl-C or a render failure; a terminal stuck in the
    // alternate buffer looks broken.
    process.stdout.write(ALT_SCREEN_OFF);
  }
}
