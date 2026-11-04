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

// Messages carry peer-controlled text (secrets, file and vault names, peer
// ids), so control characters are shown escaped rather than letting a peer
// drive the terminal. Newlines and tabs stay.
export const printable = (msg: string) =>
  msg.replace(
    /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g,
    (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`,
  );

export const logInfo = (msg: string) => {
  console.log(chalk.cyan(printable(msg)) + '\n');
};

export const logWarning = (msg: string) => {
  console.log(chalk.bgYellow(printable(msg)));
};

export const logError = (msg: string) => {
  console.log(chalk.bgRedBright(printable(msg)));
};

// Variadic so callers can hand it raw errors and response bodies, not just text
export const logDebug = (...args: unknown[]) => {
  if (process.env.DEBUG_MODE) console.log(...args);
};
