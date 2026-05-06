import chalk from 'chalk';
import figlet from 'figlet';

// FIGLET_STANDARD_FONT is defined at compile time by bun-build.ts.
// Under esbuild (JS build), it's undefined — figlet loads from disk.
declare const FIGLET_STANDARD_FONT: string | undefined;

try {
  if (typeof FIGLET_STANDARD_FONT !== 'undefined') {
    figlet.parseFont('Standard', FIGLET_STANDARD_FONT);
  }
} catch {
  // Font preload failed — textSync will try disk resolution
}

export const displayWelcomeMessage = () => {
  try {
    console.log(
      chalk.cyan(
        figlet.textSync('deadrop', {
          font: 'Standard',
          horizontalLayout: 'default',
          verticalLayout: 'default',
        }),
      ),
    );
  } catch {
    // Font file unavailable — plain fallback
    console.log(chalk.cyan('deadrop\n'));
  }
};

export const logInfo = (msg: string) => {
  console.log(chalk.cyan(msg) + '\n');
};

export const logWarning = (msg: string) => {
  console.log(chalk.bgYellow(msg));
};

export const logError = (msg: string) => {
  console.log(chalk.bgRedBright(msg));
};

export const logDebug = (msg: string) => {
  if (process.env.DEBUG_MODE) console.log(msg);
};
